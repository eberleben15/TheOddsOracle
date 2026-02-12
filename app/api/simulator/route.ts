import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  runStrategyComparison,
  generateRandomBets,
} from "@/lib/abe/strategy-simulator";
import type { SimulatedBet, StrategySimulatorStrategy } from "@/types/abe";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * POST /api/simulator
 * Body: {
 *   initialBankrollUsd: number,
 *   numBets?: number,       // default 100 (used when bets not provided)
 *   numRuns?: number,      // default 5000
 *   bets?: SimulatedBet[], // optional; if not set, generated from numBets
 *   strategies?: StrategySimulatorStrategy[]
 * }
 * Returns StrategyComparisonResult.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    initialBankrollUsd?: number;
    numBets?: number;
    numRuns?: number;
    bets?: SimulatedBet[];
    strategies?: StrategySimulatorStrategy[];
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const initialBankrollUsd = Number(body.initialBankrollUsd ?? 1000);
  if (!Number.isFinite(initialBankrollUsd) || initialBankrollUsd <= 0) {
    return Response.json(
      { error: "initialBankrollUsd must be a positive number" },
      { status: 400 }
    );
  }

  const numBets = Math.min(
    500,
    Math.max(10, Number(body.numBets ?? 100) || 100)
  );
  const numRuns = Math.min(
    20_000,
    Math.max(100, Number(body.numRuns ?? 5000) || 5000)
  );

  let bets: SimulatedBet[];
  if (Array.isArray(body.bets) && body.bets.length > 0) {
    bets = body.bets.slice(0, 500).map((b) => ({
      winProb: Math.max(0, Math.min(1, Number(b.winProb) || 0.5)),
      price: Math.max(0.01, Math.min(0.99, Number(b.price) || 0.5)),
    }));
  } else {
    bets = generateRandomBets(numBets, { meanEdge: 0.02 });
  }

  const strategies = body.strategies ?? undefined;
  const result = runStrategyComparison(
    initialBankrollUsd,
    bets,
    strategies,
    numRuns
  );
  return Response.json(result);
}
