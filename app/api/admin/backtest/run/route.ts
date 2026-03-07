/**
 * Admin API: Run Backtest and Persist
 * POST /api/admin/backtest/run
 * Body: { days, sport?, minConfidence?, valueOnly?, bankroll, strategy }
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import {
  loadBacktestBets,
  runDeterministicBacktest,
  persistBacktestRun,
  type BacktestStrategy,
} from "@/lib/backtest-data";

const STRATEGIES: Record<string, BacktestStrategy> = {
  flat_2: { type: "flat_fraction", fractionOfInitial: 0.02 },
  kelly_25: { type: "kelly", kellyFraction: 0.25 },
  kelly_50: { type: "kelly", kellyFraction: 0.5 },
};

function strategyName(s: BacktestStrategy): string {
  if (s.type === "flat")
    return `Flat $${s.stakeUsd}`;
  if (s.type === "flat_fraction")
    return `Flat ${(s.fractionOfInitial * 100).toFixed(0)}%`;
  return `${(s.kellyFraction * 100).toFixed(0)}% Kelly`;
}

export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      days?: number;
      sport?: string;
      minConfidence?: number;
      valueOnly?: boolean;
      bankroll?: number;
      strategy?: string;
    };

    const days = body.days ?? 90;
    const sport = body.sport ?? undefined;
    const minConfidence = body.minConfidence ?? 0;
    const valueOnly = body.valueOnly ?? false;
    const bankroll = body.bankroll ?? 1000;
    const strategyKey = body.strategy ?? "flat_2";

    const strategy = STRATEGIES[strategyKey];
    if (!strategy) {
      return NextResponse.json(
        { error: `Unknown strategy: ${strategyKey}. Use: flat_2, kelly_25, kelly_50` },
        { status: 400 }
      );
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const bets = await loadBacktestBets({
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      sport,
      minConfidence,
      valueBetsOnly: valueOnly,
    });

    if (bets.length === 0) {
      return NextResponse.json(
        { error: "No validated predictions found for the given filters" },
        { status: 400 }
      );
    }

    const result = runDeterministicBacktest(bets, bankroll, strategy);

    const runId = await persistBacktestRun({
      name: `${strategyName(strategy).replace(/\s/g, "-")}-${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}`,
      strategyType: strategy.type,
      strategyParams:
        strategy.type === "flat"
          ? { stakeUsd: strategy.stakeUsd }
          : strategy.type === "flat_fraction"
            ? { fractionOfInitial: strategy.fractionOfInitial }
            : { kellyFraction: strategy.kellyFraction },
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      sport,
      deterministicResult: result,
    });

    const winRate =
      result.totalBets > 0 ? (result.wins / result.totalBets) * 100 : 0;
    const roi =
      bankroll > 0
        ? ((result.terminalBankrollUsd - bankroll) / bankroll) * 100
        : 0;

    return NextResponse.json({
      runId,
      totalBets: result.totalBets,
      wins: result.wins,
      losses: result.losses,
      winRate,
      roi,
      maxDrawdown: (result.maxDrawdown * 100).toFixed(1) + "%",
      netUnits: result.netUnits,
      terminalBankroll: result.terminalBankrollUsd,
    });
  } catch (error) {
    console.error("[backtest/run] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run backtest" },
      { status: 500 }
    );
  }
}
