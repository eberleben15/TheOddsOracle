/**
 * Phase 3: Strategy-level Monte Carlo simulator.
 * Simulates sequences of bets, compares strategies (flat vs fractional Kelly),
 * outputs median/percentiles and max drawdown distribution.
 */

import { kellyStakeUsd } from "./bankroll-engine";
import type {
  SimulatedBet,
  StrategySimulatorStrategy,
  StrategyRunResult,
  StrategyStats,
  StrategyComparisonResult,
} from "@/types/abe";

/** Compute stake in USD for current bankroll and strategy. */
function getStakeUsd(
  bankrollUsd: number,
  initialBankrollUsd: number,
  bet: SimulatedBet,
  strategy: StrategySimulatorStrategy
): number {
  if (bankrollUsd <= 0) return 0;
  let stake = 0;
  switch (strategy.type) {
    case "flat":
      stake = strategy.stakeUsd;
      break;
    case "flat_fraction":
      stake = initialBankrollUsd * strategy.fractionOfInitial;
      break;
    case "kelly":
      stake = kellyStakeUsd(
        bankrollUsd,
        strategy.kellyFraction,
        bet.winProb,
        bet.price
      );
      break;
  }
  return Math.max(0, Math.min(stake, bankrollUsd));
}

/**
 * Binary contract PnL: stake S at price p. Win: receive S/p, profit = S*(1/p - 1). Lose: -S.
 */
function binaryPnlUsd(stakeUsd: number, price: number, won: boolean): number {
  if (price <= 0 || price >= 1) return 0;
  return won ? stakeUsd * (1 / price - 1) : -stakeUsd;
}

/**
 * Run a single path: apply bets in order, return terminal bankroll and max drawdown.
 */
function runSinglePath(
  initialBankrollUsd: number,
  bets: SimulatedBet[],
  strategy: StrategySimulatorStrategy
): StrategyRunResult {
  let bankroll = initialBankrollUsd;
  let peak = bankroll;
  let maxDrawdown = 0;
  for (const bet of bets) {
    const stake = getStakeUsd(bankroll, initialBankrollUsd, bet, strategy);
    if (stake <= 0) break;
    const won = Math.random() < bet.winProb;
    const pnl = binaryPnlUsd(stake, bet.price, won);
    bankroll += pnl;
    if (bankroll > peak) peak = bankroll;
    if (peak > 0) {
      const dd = (peak - bankroll) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }
  return {
    terminalBankrollUsd: Math.max(0, bankroll),
    maxDrawdown,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    Math.floor(p * sorted.length),
    sorted.length - 1
  );
  return sorted[idx];
}

/**
 * Run Monte Carlo for one strategy: many runs over the same bet sequence (resampling outcomes).
 */
function runStrategy(
  initialBankrollUsd: number,
  bets: SimulatedBet[],
  strategy: StrategySimulatorStrategy,
  numRuns: number
): StrategyStats {
  const terminals: number[] = [];
  const drawdowns: number[] = [];
  for (let i = 0; i < numRuns; i++) {
    const result = runSinglePath(initialBankrollUsd, bets, strategy);
    terminals.push(result.terminalBankrollUsd);
    drawdowns.push(result.maxDrawdown);
  }
  terminals.sort((a, b) => a - b);
  drawdowns.sort((a, b) => a - b);
  return {
    strategy,
    numRuns,
    numBetsPerRun: bets.length,
    medianTerminalBankrollUsd: percentile(terminals, 0.5),
    terminalBankrollPercentiles: {
      p5: percentile(terminals, 0.05),
      p25: percentile(terminals, 0.25),
      p75: percentile(terminals, 0.75),
      p95: percentile(terminals, 0.95),
    },
    medianMaxDrawdown: percentile(drawdowns, 0.5),
    maxDrawdownPercentiles: {
      p5: percentile(drawdowns, 0.05),
      p25: percentile(drawdowns, 0.25),
      p75: percentile(drawdowns, 0.75),
      p95: percentile(drawdowns, 0.95),
    },
  };
}

/**
 * Compare multiple strategies on the same bet sequence.
 * Default: flat 2% of initial, quarter Kelly, half Kelly.
 */
export function runStrategyComparison(
  initialBankrollUsd: number,
  bets: SimulatedBet[],
  strategies?: StrategySimulatorStrategy[],
  numRuns: number = 10_000
): StrategyComparisonResult {
  const defaultStrategies: StrategySimulatorStrategy[] = [
    { type: "flat_fraction", fractionOfInitial: 0.02 },
    { type: "kelly", kellyFraction: 0.25 },
    { type: "kelly", kellyFraction: 0.5 },
  ];
  const toRun = strategies ?? defaultStrategies;
  const stats: StrategyStats[] = toRun.map((s) =>
    runStrategy(initialBankrollUsd, bets, s, numRuns)
  );
  return {
    initialBankrollUsd,
    strategies: stats,
  };
}

/**
 * Generate a simple random sequence of N bets for demo (slight positive edge on average).
 */
export function generateRandomBets(
  numBets: number,
  options?: {
    /** Mean edge (winProb - price). Default 0.02. */
    meanEdge?: number;
    /** Price range [min, max]. Default [0.3, 0.7]. */
    priceRange?: [number, number];
  }
): SimulatedBet[] {
  const meanEdge = options?.meanEdge ?? 0.02;
  const [minP, maxP] = options?.priceRange ?? [0.3, 0.7];
  const bets: SimulatedBet[] = [];
  for (let i = 0; i < numBets; i++) {
    const price = minP + Math.random() * (maxP - minP);
    const edge = meanEdge + (Math.random() - 0.5) * 0.04;
    const winProb = Math.max(0.05, Math.min(0.95, price + edge));
    bets.push({ winProb, price });
  }
  return bets;
}
