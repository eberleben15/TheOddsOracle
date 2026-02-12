import { NextRequest } from "next/server";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { getPolymarketClient } from "@/lib/api-clients/polymarket-client";
import {
  abeContractIdToKalshiTicker,
  abeContractIdToPolymarketConditionId,
  kalshiMarketToABEContracts,
  polymarketMarketToABEContracts,
} from "@/lib/abe";
import { runPortfolioRiskAnalysis } from "@/lib/abe/portfolio-risk-engine";
import type { ABEPosition, ABEContract } from "@/types/abe";

export const dynamic = "force-dynamic";

type Body = {
  positions: ABEPosition[];
  /** If provided, use these contracts instead of fetching by position contractIds. */
  contracts?: ABEContract[];
};

/**
 * POST /api/abe/portfolio-analysis
 * Body: { positions: ABEPosition[], contracts?: ABEContract[] }
 * If contracts omitted, we fetch Kalshi and/or Polymarket markets by position contractIds.
 * Unauthenticated: analysis is stateless from request body only. Add auth() if you need to restrict to logged-in users.
 */
export async function POST(request: NextRequest) {
  try {
    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return Response.json(
        { error: "Invalid JSON body. Expected { positions: ABEPosition[] }" },
        { status: 400 }
      );
    }

    const positions = body.positions;
    if (!Array.isArray(positions) || positions.length === 0) {
      return Response.json(
        { error: "positions must be a non-empty array" },
        { status: 400 }
      );
    }
    if (positions.length > 500) {
      return Response.json(
        { error: "positions array exceeds maximum of 500 for analysis" },
        { status: 400 }
      );
    }

    let contracts = body.contracts;

    if (!contracts?.length) {
      const kalshiTickers = new Set<string>();
      const polymarketConditionIds = new Set<string>();
      for (const p of positions) {
        const k = abeContractIdToKalshiTicker(p.contractId);
        if (k) kalshiTickers.add(k);
        const pm = abeContractIdToPolymarketConditionId(p.contractId);
        if (pm) polymarketConditionIds.add(pm);
      }

      const contractList: ABEContract[] = [];

      if (kalshiTickers.size > 0) {
        const kalshiClient = getKalshiClient();
        const { markets } = await kalshiClient.getMarkets({
          tickers: Array.from(kalshiTickers).join(","),
          status: "open",
          limit: 500,
        });
        for (const m of markets) {
          contractList.push(...kalshiMarketToABEContracts(m));
        }
      }

      if (polymarketConditionIds.size > 0) {
        const polymarketClient = getPolymarketClient();
        const marketMap = await polymarketClient.getMarketsForConditionIds(
          Array.from(polymarketConditionIds)
        );
        for (const [, { market, event }] of marketMap) {
          contractList.push(...polymarketMarketToABEContracts(market, event));
        }
      }

      if (contractList.length === 0 && positions.length > 0) {
        return Response.json(
          { error: "Could not resolve any contract data for the given positions (Kalshi or Polymarket)." },
          { status: 400 }
        );
      }
      contracts = contractList;
    }

    const portfolio = { positions, contracts };
    const report = runPortfolioRiskAnalysis(portfolio);

    return Response.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portfolio analysis failed";
    console.error("[abe/portfolio-analysis]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
