import { NextRequest } from "next/server";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { abeContractIdToKalshiTicker, kalshiMarketToABEContracts } from "@/lib/abe";
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
 * If contracts omitted, we derive Kalshi tickers from position contractIds and fetch markets.
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

    let contracts = body.contracts;

    if (!contracts?.length) {
      const tickers = new Set<string>();
      for (const p of positions) {
        const t = abeContractIdToKalshiTicker(p.contractId);
        if (t) tickers.add(t);
      }
      if (tickers.size === 0) {
        return Response.json(
          { error: "No Kalshi contract IDs found in positions; cannot fetch contract data." },
          { status: 400 }
        );
      }

      const client = getKalshiClient();
      const { markets } = await client.getMarkets({
        tickers: Array.from(tickers).join(","),
        status: "open",
        limit: 500,
      });

      const contractList: ABEContract[] = [];
      for (const m of markets) {
        contractList.push(...kalshiMarketToABEContracts(m));
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
