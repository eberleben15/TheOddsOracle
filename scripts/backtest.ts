#!/usr/bin/env tsx
/**
 * Backtest CLI
 *
 * Runs strategy comparison on validated predictions from the database.
 * Usage: npx tsx scripts/backtest.ts [options]
 *
 * Options:
 *   --days N          Number of days to include (default: 90)
 *   --sport S         Sport filter (nba, cbb, nhl, etc.)
 *   --minConfidence N Minimum confidence 0-100 (default: 0)
 *   --valueOnly       Only include predictions with favorable bets
 *   --bankroll N      Initial bankroll USD (default: 1000)
 *   --runs N          Monte Carlo runs per strategy (default: 5000)
 */

import "./load-env";
import {
  loadBacktestBets,
  toSimulatedBets,
  runDeterministicBacktest,
  persistBacktestRun,
  type BacktestStrategy,
} from "../lib/backtest-data";
import { runStrategyComparison } from "../lib/abe/strategy-simulator";
import type { StrategySimulatorStrategy } from "../types/abe";
import { prisma } from "../lib/prisma";

const DEFAULT_STRATEGIES: StrategySimulatorStrategy[] = [
  { type: "flat_fraction", fractionOfInitial: 0.02 },
  { type: "kelly", kellyFraction: 0.25 },
  { type: "kelly", kellyFraction: 0.5 },
];

function toBacktestStrategy(s: StrategySimulatorStrategy): BacktestStrategy {
  if (s.type === "flat") return { type: "flat", stakeUsd: s.stakeUsd };
  if (s.type === "flat_fraction")
    return { type: "flat_fraction", fractionOfInitial: s.fractionOfInitial };
  return { type: "kelly", kellyFraction: s.kellyFraction };
}

function parseArgs(): {
  days: number;
  sport: string | undefined;
  minConfidence: number;
  valueOnly: boolean;
  bankroll: number;
  runs: number;
} {
  const args = process.argv.slice(2);
  let days = 90;
  let sport: string | undefined;
  let minConfidence = 0;
  let valueOnly = false;
  let bankroll = 1000;
  let runs = 5000;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--days":
        days = parseInt(args[++i], 10) || 90;
        break;
      case "--sport":
        sport = args[++i];
        break;
      case "--minConfidence":
        minConfidence = parseInt(args[++i], 10) || 0;
        break;
      case "--valueOnly":
        valueOnly = true;
        break;
      case "--bankroll":
        bankroll = parseFloat(args[++i]) || 1000;
        break;
      case "--runs":
        runs = parseInt(args[++i], 10) || 5000;
        break;
      case "--help":
      case "-h":
        console.log(`
Backtest CLI - Strategy comparison on validated predictions

Usage: npx tsx scripts/backtest.ts [options]

Options:
  --days N          Number of days to include (default: 90)
  --sport S         Sport filter (nba, cbb, nhl, etc.)
  --minConfidence N Minimum confidence 0-100 (default: 0)
  --valueOnly       Only include predictions with favorable bets
  --bankroll N      Initial bankroll USD (default: 1000)
  --runs N          Monte Carlo runs per strategy (default: 5000)
  --help, -h        Show this help
`);
        process.exit(0);
    }
  }

  return { days, sport, minConfidence, valueOnly, bankroll, runs };
}

function strategyLabel(s: StrategySimulatorStrategy): string {
  if (s.type === "flat") return `Flat $${s.stakeUsd}`;
  if (s.type === "flat_fraction")
    return `Flat ${(s.fractionOfInitial * 100).toFixed(0)}%`;
  return `${(s.kellyFraction * 100).toFixed(0)}% Kelly`;
}

async function main() {
  const opts = parseArgs();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - opts.days);

  console.log("\n--- Backtest ---");
  console.log(`Date range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`);
  console.log(`Sport: ${opts.sport ?? "all"}`);
  console.log(`Min confidence: ${opts.minConfidence}`);
  console.log(`Value bets only: ${opts.valueOnly}`);
  console.log(`Initial bankroll: $${opts.bankroll}`);
  console.log(`Monte Carlo runs: ${opts.runs}\n`);

  const bets = await loadBacktestBets({
    dateRangeStart: startDate,
    dateRangeEnd: endDate,
    sport: opts.sport,
    minConfidence: opts.minConfidence,
    valueBetsOnly: opts.valueOnly,
  });

  if (bets.length === 0) {
    console.log("No validated predictions found for the given filters.");
    process.exit(1);
  }

  const wins = bets.filter((b) => b.won).length;
  const losses = bets.length - wins;
  const winRate = ((wins / bets.length) * 100).toFixed(1);
  console.log(`Loaded ${bets.length} predictions (${wins}W-${losses}L, ${winRate}% win rate)\n`);

  const simulatedBets = toSimulatedBets(bets);
  const result = runStrategyComparison(
    opts.bankroll,
    simulatedBets,
    DEFAULT_STRATEGIES,
    opts.runs
  );

  console.log("Strategy comparison (Monte Carlo):");
  for (const s of result.strategies) {
    const label = strategyLabel(s.strategy);
    console.log(`  ${label}:`);
    console.log(`    Median terminal: $${s.medianTerminalBankrollUsd.toFixed(0)}`);
    console.log(`    Terminal range: $${s.terminalBankrollPercentiles.p5.toFixed(0)} - $${s.terminalBankrollPercentiles.p95.toFixed(0)}`);
    console.log(`    Median max drawdown: ${(s.medianMaxDrawdown * 100).toFixed(1)}%`);
  }

  // Persist deterministic backtest runs for each strategy
  console.log("\nPersisting backtest runs...");
  const dateStr = `${startDate.toISOString().split("T")[0]}_${endDate.toISOString().split("T")[0]}`;
  for (let i = 0; i < DEFAULT_STRATEGIES.length; i++) {
    const strat = DEFAULT_STRATEGIES[i];
    const detResult = runDeterministicBacktest(bets, opts.bankroll, toBacktestStrategy(strat));
    const runId = await persistBacktestRun({
      name: `${strategyLabel(strat).replace(/\s/g, "-")}-${dateStr}`,
      strategyType: strat.type,
      strategyParams:
        strat.type === "flat"
          ? { stakeUsd: strat.stakeUsd }
          : strat.type === "flat_fraction"
            ? { fractionOfInitial: strat.fractionOfInitial }
            : { kellyFraction: strat.kellyFraction },
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
      sport: opts.sport,
      deterministicResult: detResult,
    });
    console.log(`  Saved run: ${runId}`);
  }

  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
