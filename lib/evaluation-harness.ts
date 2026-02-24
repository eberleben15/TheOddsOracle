/**
 * Evaluation Harness
 *
 * Computes metrics on test sets for model comparison and calibration tuning.
 * Supports win-probability metrics (Brier, Log Loss), spread/total MAE, and ATS.
 */

import type { TrainingExample } from "./prediction-features";

export interface EvaluationReport {
  gameCount: number;
  /** Brier score (0-1, lower is better) */
  brierScore: number;
  /** Log loss (lower is better) */
  logLoss: number;
  /** Mean absolute error of spread */
  spreadMAE: number;
  /** Mean absolute error of total */
  totalMAE: number;
  /** Winner accuracy % */
  winnerAccuracy: number;
  /** ATS record (when market spread available) */
  ats?: { wins: number; losses: number; pushes: number; winRate: number };
  /** Over/Under record (when market total available) */
  overUnder?: { overWins: number; underWins: number; totalAccuracy: number };
}

const EPS = 1e-7;
const clamp = (p: number) => Math.max(EPS, Math.min(1 - EPS, p));

/**
 * Compute Brier score: mean((p - y)^2)
 */
export function brierScore(
  examples: TrainingExample[]
): number {
  if (examples.length === 0) return 0;
  let sum = 0;
  for (const ex of examples) {
    const p = clamp(ex.homeWinProb);
    const y = ex.actualHomeWin;
    sum += (p - y) ** 2;
  }
  return sum / examples.length;
}

/**
 * Compute Log Loss: -mean(y*log(p) + (1-y)*log(1-p))
 */
export function logLoss(examples: TrainingExample[]): number {
  if (examples.length === 0) return 0;
  let sum = 0;
  for (const ex of examples) {
    const p = clamp(ex.homeWinProb);
    const y = ex.actualHomeWin;
    sum -= y * Math.log(p) + (1 - y) * Math.log(1 - p);
  }
  return sum / examples.length;
}

/**
 * Winner accuracy: % of correct winner predictions
 */
export function winnerAccuracy(examples: TrainingExample[]): number {
  if (examples.length === 0) return 0;
  let correct = 0;
  for (const ex of examples) {
    const predictedHome = ex.homeWinProb >= 0.5 ? 1 : 0;
    if (predictedHome === ex.actualHomeWin) correct++;
  }
  return (correct / examples.length) * 100;
}

/**
 * Mean absolute error of spread
 */
export function spreadMAE(examples: TrainingExample[]): number {
  if (examples.length === 0) return 0;
  const sum = examples.reduce((s, ex) => s + ex.spreadError, 0);
  return sum / examples.length;
}

/**
 * Mean absolute error of total
 */
export function totalMAE(examples: TrainingExample[]): number {
  if (examples.length === 0) return 0;
  const sum = examples.reduce((s, ex) => s + ex.totalError, 0);
  return sum / examples.length;
}

/**
 * ATS performance (when market spread available)
 * Matches score-prediction-validator logic: we pick home when predictedSpread > 0.
 * Market spread is Odds API format (negative = home favored); convert to our format.
 */
export function atsPerformance(examples: TrainingExample[]): EvaluationReport["ats"] | undefined {
  const withMarket = examples.filter((ex) => ex.marketSpread != null);
  if (withMarket.length === 0) return undefined;

  let wins = 0;
  let losses = 0;
  let pushes = 0;

  for (const ex of withMarket) {
    const marketSpread = ex.marketSpread!;
    const lineInOurFormat = -marketSpread; // Odds API: neg = home favored
    const actualMargin = ex.actualSpread;
    const betOnHome = ex.predictedSpread > 0;

    let cover: number;
    if (betOnHome) {
      cover = actualMargin - lineInOurFormat; // >0 = home covered
    } else {
      cover = lineInOurFormat - actualMargin; // >0 = away covered
    }

    if (Math.abs(cover) < 0.5) pushes++;
    else if (cover > 0) wins++;
    else losses++;
  }

  const decided = wins + losses;
  return {
    wins,
    losses,
    pushes,
    winRate: decided > 0 ? (wins / decided) * 100 : 0,
  };
}

/**
 * Over/Under performance (when market total available)
 */
export function overUnderPerformance(
  examples: TrainingExample[]
): EvaluationReport["overUnder"] | undefined {
  const withMarket = examples.filter((ex) => ex.marketTotal != null);
  if (withMarket.length === 0) return undefined;

  let overWins = 0;
  let underWins = 0;
  let overCorrect = 0;
  let underCorrect = 0;

  for (const ex of withMarket) {
    const market = ex.marketTotal!;
    const actual = ex.actualTotal;
    const wePickOver = ex.predictedTotal > market;

    if (wePickOver) {
      overWins++;
      if (actual > market) overCorrect++;
    } else {
      underWins++;
      if (actual < market) underCorrect++;
    }
  }

  const totalCorrect = overCorrect + underCorrect;
  const total = withMarket.length;
  return {
    overWins,
    underWins,
    totalAccuracy: total > 0 ? (totalCorrect / total) * 100 : 0,
  };
}

/**
 * Run full evaluation on a test set.
 */
export function runEvaluation(examples: TrainingExample[]): EvaluationReport {
  return {
    gameCount: examples.length,
    brierScore: brierScore(examples),
    logLoss: logLoss(examples),
    spreadMAE: spreadMAE(examples),
    totalMAE: totalMAE(examples),
    winnerAccuracy: winnerAccuracy(examples),
    ats: atsPerformance(examples),
    overUnder: overUnderPerformance(examples),
  };
}

/**
 * Compare two evaluation reports (e.g., baseline vs calibrated).
 */
export function compareReports(
  baseline: EvaluationReport,
  improved: EvaluationReport
): { brierDiff: number; logLossDiff: number; spreadMAEDiff: number; winnerAccDiff: number } {
  return {
    brierDiff: improved.brierScore - baseline.brierScore,
    logLossDiff: improved.logLoss - baseline.logLoss,
    spreadMAEDiff: improved.spreadMAE - baseline.spreadMAE,
    winnerAccDiff: improved.winnerAccuracy - baseline.winnerAccuracy,
  };
}
