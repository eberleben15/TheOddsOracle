/**
 * Backtest Data
 *
 * Loads validated predictions from the database and converts them to
 * SimulatedBet[] format for use with the strategy simulator.
 * Supports filtering by date range, sport, confidence, and "value bets only" mode.
 */

import { kellyStakeUsd } from "./abe/bankroll-engine";
import { prisma } from "./prisma";
import type { SimulatedBet } from "@/types/abe";

/** Implied probability for standard -110 juice (spread bet). */
const SPREAD_IMPLIED_PROB = 100 / 210; // ~0.524

export interface BacktestDataOptions {
  /** Start of date range (inclusive). */
  dateRangeStart?: Date;
  /** End of date range (inclusive). */
  dateRangeEnd?: Date;
  /** Sport filter (e.g. "nba", "cbb", "nhl"). */
  sport?: string;
  /** Minimum confidence (0-100) to include. */
  minConfidence?: number;
  /** Only include predictions that have favorable bets. */
  valueBetsOnly?: boolean;
}

export interface BacktestBet extends SimulatedBet {
  /** Prediction id for linking to BacktestPosition. */
  predictionId: string;
  /** Game id. */
  gameId: string;
  /** Game date. */
  date: Date;
  /** Actual outcome: did we win? */
  won?: boolean;
}

/**
 * Load validated predictions and convert to SimulatedBet[] format.
 * Uses raw Prisma (not views) so it works even before views are created.
 */
export async function loadBacktestBets(
  options: BacktestDataOptions = {}
): Promise<BacktestBet[]> {
  const {
    dateRangeStart,
    dateRangeEnd,
    sport,
    minConfidence = 0,
    valueBetsOnly = false,
  } = options;

  const where: Record<string, unknown> = {
    validated: true,
    actualHomeScore: { not: null },
    actualAwayScore: { not: null },
  };

  if (sport) {
    where.sport = sport;
  }

  if (dateRangeStart || dateRangeEnd) {
    where.date = {};
    if (dateRangeStart) {
      (where.date as Record<string, unknown>).gte = dateRangeStart;
    }
    if (dateRangeEnd) {
      const endOfDay = new Date(dateRangeEnd);
      endOfDay.setHours(23, 59, 59, 999);
      (where.date as Record<string, unknown>).lte = endOfDay;
    }
  }

  if (valueBetsOnly) {
    where.NOT = { favorableBets: null };
  }

  const predictions = await prisma.prediction.findMany({
    where,
    orderBy: { date: "asc" },
    select: {
      id: true,
      gameId: true,
      date: true,
      predictedSpread: true,
      winProbability: true,
      confidence: true,
      favorableBets: true,
      actualHomeScore: true,
      actualAwayScore: true,
    },
  });

  const bets: BacktestBet[] = [];

  for (const p of predictions) {
    const confidence = p.confidence > 1 ? p.confidence : p.confidence * 100;
    if (confidence < minConfidence) continue;

    const wp = p.winProbability as { home?: number; away?: number } | null;
    const homeProb =
      wp?.home != null
        ? wp.home > 1
          ? wp.home / 100
          : wp.home
        : 0.5;
    const awayProb =
      wp?.away != null
        ? wp.away > 1
          ? wp.away / 100
          : wp.away
        : 0.5;

    const betOnHome = (p.predictedSpread ?? 0) > 0;
    const winProb = betOnHome ? homeProb : awayProb;

    // Use standard -110 implied prob for spread bets
    const price = SPREAD_IMPLIED_PROB;

    const actualHome = p.actualHomeScore ?? 0;
    const actualAway = p.actualAwayScore ?? 0;
    const actualWinner = actualHome > actualAway ? "home" : actualAway > actualHome ? "away" : null;
    const predictedWinner = betOnHome ? "home" : "away";
    const won = actualWinner !== null && actualWinner === predictedWinner;

    bets.push({
      predictionId: p.id,
      gameId: p.gameId,
      date: p.date,
      winProb,
      price,
      won,
    });
  }

  return bets;
}

/**
 * Convert BacktestBet[] to SimulatedBet[] (strip metadata).
 */
export function toSimulatedBets(bets: BacktestBet[]): SimulatedBet[] {
  return bets.map(({ winProb, price }) => ({ winProb, price }));
}

/** Strategy type for deterministic backtest. */
export type BacktestStrategy =
  | { type: "flat"; stakeUsd: number }
  | { type: "flat_fraction"; fractionOfInitial: number }
  | { type: "kelly"; kellyFraction: number };

/** Single position outcome from deterministic backtest. */
export interface BacktestPositionResult {
  predictionId: string;
  positionIndex: number;
  winProb: number;
  price: number;
  stakeUsd: number;
  won: boolean;
  pnlUsd: number;
  bankrollAfter: number;
}

/** Result of deterministic backtest (actual outcomes). */
export interface DeterministicBacktestResult {
  initialBankrollUsd: number;
  terminalBankrollUsd: number;
  totalBets: number;
  wins: number;
  losses: number;
  netUnits: number;
  maxDrawdown: number;
  positions: BacktestPositionResult[];
}

/** Binary contract PnL: stake S at price p. Win: S*(1/p - 1). Lose: -S. */
function binaryPnlUsd(stakeUsd: number, price: number, won: boolean): number {
  if (price <= 0 || price >= 1) return 0;
  return won ? stakeUsd * (1 / price - 1) : -stakeUsd;
}

/** Compute stake for strategy. */
function getStakeUsd(
  bankrollUsd: number,
  initialBankrollUsd: number,
  bet: BacktestBet,
  strategy: BacktestStrategy
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
 * Run deterministic backtest using actual outcomes.
 * Returns positions and metrics for persistence to BacktestRun/BacktestPosition.
 */
export function runDeterministicBacktest(
  bets: BacktestBet[],
  initialBankrollUsd: number,
  strategy: BacktestStrategy
): DeterministicBacktestResult {
  let bankroll = initialBankrollUsd;
  let peak = bankroll;
  let maxDrawdown = 0;
  let wins = 0;
  let losses = 0;
  let netUnits = 0;
  const positions: BacktestPositionResult[] = [];

  for (let i = 0; i < bets.length; i++) {
    const bet = bets[i];
    const stake = getStakeUsd(bankroll, initialBankrollUsd, bet, strategy);
    if (stake <= 0) break;

    const won = bet.won ?? false;
    const pnl = binaryPnlUsd(stake, bet.price, won);
    bankroll += pnl;

    if (won) wins++;
    else losses++;
    netUnits += won ? 0.91 : -1.0;

    if (bankroll > peak) peak = bankroll;
    if (peak > 0) {
      const dd = (peak - bankroll) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    positions.push({
      predictionId: bet.predictionId,
      positionIndex: i,
      winProb: bet.winProb,
      price: bet.price,
      stakeUsd: stake,
      won,
      pnlUsd: pnl,
      bankrollAfter: bankroll,
    });
  }

  return {
    initialBankrollUsd,
    terminalBankrollUsd: Math.max(0, bankroll),
    totalBets: positions.length,
    wins,
    losses,
    netUnits,
    maxDrawdown,
    positions,
  };
}

export interface PersistBacktestRunOptions {
  name: string;
  strategyType: string;
  strategyParams: Record<string, unknown>;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  sport?: string;
  deterministicResult: DeterministicBacktestResult;
}

/**
 * Persist backtest run and positions to database.
 */
export async function persistBacktestRun(
  opts: PersistBacktestRunOptions
): Promise<string> {
  if (!prisma.backtestRun?.create) {
    throw new Error(
      "Prisma client missing backtestRun model. Run `npx prisma generate` and restart the dev server."
    );
  }
  const run = await prisma.backtestRun.create({
    data: {
      name: opts.name,
      strategyType: opts.strategyType,
      strategyParams: opts.strategyParams as object,
      dateRangeStart: opts.dateRangeStart,
      dateRangeEnd: opts.dateRangeEnd,
      sport: opts.sport ?? null,
      metrics: {
        totalBets: opts.deterministicResult.totalBets,
        wins: opts.deterministicResult.wins,
        losses: opts.deterministicResult.losses,
        winRate: opts.deterministicResult.totalBets > 0
          ? (opts.deterministicResult.wins / opts.deterministicResult.totalBets) * 100
          : 0,
        roi:
          opts.deterministicResult.initialBankrollUsd > 0
            ? ((opts.deterministicResult.terminalBankrollUsd -
                opts.deterministicResult.initialBankrollUsd) /
                opts.deterministicResult.initialBankrollUsd) *
              100
            : 0,
        maxDrawdown: opts.deterministicResult.maxDrawdown * 100,
        netUnits: opts.deterministicResult.netUnits,
      },
    },
  });

  if (opts.deterministicResult.positions.length > 0) {
    await prisma.backtestPosition.createMany({
      data: opts.deterministicResult.positions.map((p) => ({
        backtestRunId: run.id,
        predictionId: p.predictionId,
        positionIndex: p.positionIndex,
        winProb: p.winProb,
        price: p.price,
        stakeUsd: p.stakeUsd,
        won: p.won,
        pnlUsd: p.pnlUsd,
        bankrollAfter: p.bankrollAfter,
      })),
    });
  }

  return run.id;
}
