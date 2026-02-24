/**
 * GET /api/abe/price-moves
 *
 * Returns positions with significant price movement (cost basis vs current price).
 * Used for "alerts when odds move" — foundation for execution/monitoring.
 *
 * Query: ?threshold=0.1 (default 10% move in probability space)
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { decryptKalshiPrivateKey } from "@/lib/kalshi-credentials";
import { getPolymarketPositions } from "@/lib/api-clients/polymarket-data-api";
import { getPolymarketClient } from "@/lib/api-clients/polymarket-client";
import {
  kalshiMarketPositionsToABEPositions,
  polymarketDataPositionsToABEPositions,
  kalshiMarketToABEContracts,
  polymarketMarketToABEContracts,
  abeContractIdToKalshiTicker,
  abeContractIdToPolymarketConditionId,
} from "@/lib/abe";
import type { ABEPosition } from "@/types/abe";

export const dynamic = "force-dynamic";

export type PriceMove = {
  contractId: string;
  label?: string;
  costPerShare: number;
  currentPrice: number;
  /** (currentPrice - costPerShare) in probability space */
  moveProb: number;
  /** Move as fraction of cost, e.g. 0.15 = 15% */
  movePct: number;
  direction: "up" | "down";
};

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threshold = Math.min(0.5, Math.max(0.01, parseFloat(request.nextUrl.searchParams.get("threshold") ?? "0.1") || 0.1));

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
      console.error("[abe/price-moves] Kalshi fetch failed", e);
    }
  }
  if (polymarketConn) {
    try {
      const dataPositions = await getPolymarketPositions(polymarketConn.walletAddress, { limit: 500 });
      positions.push(...polymarketDataPositionsToABEPositions(dataPositions));
    } catch (e) {
      console.error("[abe/price-moves] Polymarket fetch failed", e);
    }
  }
  if (!kalshiConn && !polymarketConn) {
    return Response.json({ moves: [], message: "No Kalshi or Polymarket connection." });
  }

  const contractPrices: Record<string, number> = {};
  const contractLabels: Record<string, string> = {};
  const tickers = new Set<string>();
  const pmConditionIds = new Set<string>();
  for (const p of positions) {
    const t = abeContractIdToKalshiTicker(p.contractId);
    if (t) tickers.add(t);
    const cid = abeContractIdToPolymarketConditionId(p.contractId);
    if (cid) pmConditionIds.add(cid);
  }

  if (tickers.size > 0) {
    try {
      const client = getKalshiClient();
      const { markets } = await client.getMarkets({
        tickers: Array.from(tickers).join(","),
        status: "open",
        limit: 500,
      });
      for (const m of markets) {
        const abeContracts = kalshiMarketToABEContracts(m);
        for (const c of abeContracts) {
          contractPrices[c.id] = c.price;
          contractLabels[c.id] = [c.title, c.subtitle].filter(Boolean).join(" — ") || c.id;
        }
      }
    } catch (e) {
      console.error("[abe/price-moves] Kalshi markets fetch failed", e);
    }
  }

  if (pmConditionIds.size > 0) {
    try {
      const pmClient = getPolymarketClient();
      const marketMap = await pmClient.getMarketsForConditionIds(Array.from(pmConditionIds));
      for (const [, { market, event }] of marketMap) {
        const abeContracts = polymarketMarketToABEContracts(market, event);
        for (const c of abeContracts) {
          contractPrices[c.id] = c.price;
          contractLabels[c.id] = [c.title, c.subtitle].filter(Boolean).join(" — ") || c.id;
        }
      }
    } catch (e) {
      console.error("[abe/price-moves] Polymarket markets fetch failed", e);
    }
  }

  const moves: PriceMove[] = [];
  for (const p of positions) {
    const currentPrice = contractPrices[p.contractId];
    if (typeof currentPrice !== "number" || currentPrice <= 0) continue;
    const cost = p.costPerShare;
    const moveProb = currentPrice - cost;
    const movePct = cost > 0 ? moveProb / cost : 0;
    if (Math.abs(movePct) < threshold) continue;

    moves.push({
      contractId: p.contractId,
      label: contractLabels[p.contractId],
      costPerShare: cost,
      currentPrice,
      moveProb,
      movePct,
      direction: moveProb >= 0 ? "up" : "down",
    });
  }

  moves.sort((a, b) => Math.abs(b.movePct) - Math.abs(a.movePct));

  return Response.json({
    moves,
    threshold,
    positionsChecked: positions.length,
  });
}
