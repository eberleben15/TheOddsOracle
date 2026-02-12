import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { decryptKalshiPrivateKey } from "@/lib/kalshi-credentials";
import { getPolymarketPositions } from "@/lib/api-clients/polymarket-data-api";
import {
  kalshiMarketPositionsToABEPositions,
  polymarketDataPositionsToABEPositions,
  kalshiMarketToABEContracts,
  abeContractIdToKalshiTicker,
} from "@/lib/abe";
import { runPortfolioRiskAnalysis } from "@/lib/abe/portfolio-risk-engine";
import { runRules } from "@/lib/abe/rule-engine";
import type { ABEPosition, ABERule, ABEContract } from "@/types/abe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function dbRuleToABE(r: { id: string; name: string; triggerType: string; triggerConfig: unknown; actions: unknown; enabled: boolean }): ABERule {
  return {
    id: r.id,
    name: r.name,
    triggerType: r.triggerType as ABERule["triggerType"],
    triggerConfig: (r.triggerConfig ?? {}) as ABERule["triggerConfig"],
    actions: (Array.isArray(r.actions) ? r.actions : []) as ABERule["actions"],
    enabled: r.enabled,
  };
}

/**
 * POST /api/rules/run
 * Event pipeline: fetch current portfolio, evaluate rules, create notifications.
 * Call from cron or on-demand.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let positions: ABEPosition[] = [];
  const [kalshiConn, polymarketConn] = await Promise.all([
    prisma.kalshiConnection.findUnique({ where: { userId: session.user.id } }),
    prisma.polymarketConnection.findUnique({ where: { userId: session.user.id } }),
  ]);
  if (kalshiConn) {
    try {
      const privateKeyPem = decryptKalshiPrivateKey(kalshiConn.privateKeyEncrypted);
      const client = getKalshiClient();
      const res = await client.getPositions({
        apiKeyId: kalshiConn.apiKeyId,
        privateKeyPem,
      });
      positions.push(...kalshiMarketPositionsToABEPositions(res.market_positions ?? []));
    } catch (e) {
      console.error("[rules/run] Kalshi fetch failed", e);
    }
  }
  if (polymarketConn) {
    try {
      const dataPositions = await getPolymarketPositions(polymarketConn.walletAddress, { limit: 500 });
      positions.push(...polymarketDataPositionsToABEPositions(dataPositions));
    } catch (e) {
      console.error("[rules/run] Polymarket fetch failed", e);
    }
  }

  let portfolioReport: Awaited<ReturnType<typeof runPortfolioRiskAnalysis>> | undefined;
  let contractPrices: Record<string, number> = {};
  if (positions.length > 0) {
    const tickers = new Set<string>();
    for (const p of positions) {
      const t = abeContractIdToKalshiTicker(p.contractId);
      if (t) tickers.add(t);
    }
    if (tickers.size > 0) {
      try {
        const client = getKalshiClient();
        const { markets } = await client.getMarkets({
          tickers: Array.from(tickers).join(","),
          status: "open",
          limit: 500,
        });
        const contracts: ABEContract[] = [];
        for (const m of markets) {
          const abeContracts = kalshiMarketToABEContracts(m);
          for (const c of abeContracts) {
            contracts.push(c);
            contractPrices[c.id] = c.price;
          }
        }
        portfolioReport = runPortfolioRiskAnalysis({ positions, contracts });
      } catch (e) {
        console.error("[rules/run] Portfolio analysis failed", e);
      }
    } else {
      portfolioReport = runPortfolioRiskAnalysis({ positions });
    }
  }

  const settings = await prisma.userBankrollSettings.findUnique({
    where: { userId: session.user.id },
  });
  const bankrollSet = !!settings && settings.bankrollUsd > 0;

  const ruleRows = await prisma.aBERule.findMany({
    where: { userId: session.user.id, enabled: true },
  });
  const rules = ruleRows.map(dbRuleToABE);
  const ctx = {
    contractPrices: Object.keys(contractPrices).length > 0 ? contractPrices : undefined,
    portfolioReport,
    bankrollSet,
  };
  const { firedRuleIds, notifications } = runRules(rules, ctx);
  for (const n of notifications) {
    await prisma.aBENotification.create({
      data: {
        userId: session.user.id,
        ruleId: n.ruleId,
        title: n.title,
        body: n.body,
        read: false,
      },
    });
  }
  return Response.json({
    fired: firedRuleIds.length,
    notificationsCreated: notifications.length,
  });
}
