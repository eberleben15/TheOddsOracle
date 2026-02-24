/**
 * Prediction Feature Schema
 *
 * Defines the feature vector extracted from predictions for historical calibration
 * and future ML training. All features are numeric for easy export to sklearn, etc.
 */

import type { TrackedPrediction } from "./prediction-tracker";
import type { PredictionTrace } from "./advanced-analytics";

/** Sport codes for one-hot or embedding (use numeric for simpler export) */
const SPORT_CODES: Record<string, number> = {
  basketball_ncaab: 0,
  basketball_nba: 1,
  icehockey_nhl: 2,
  baseball_mlb: 3,
};

/** Single training example: inputs + predictions + actual outcome */
export interface TrainingExample {
  /** Unique identifier */
  id: string;
  /** Game date ISO string */
  date: string;
  /** Sport key */
  sport: string;

  // --- Input features (for ML / calibration) ---
  /** Home win probability (0-1, post-recalibration if applied) */
  homeWinProb: number;
  /** Raw home win prob before Platt scaling (from trace, or same as homeWinProb if no trace) */
  homeWinProbRaw: number;
  /** Model total score (input to logistic) - trace.totalScore or derived */
  totalScore: number;
  /** Four Factors score (when available) */
  fourFactorsScore: number | null;
  /** Schedule-adjusted efficiency score (when available) */
  efficiencyScore: number | null;
  /** Tempo adjustment (when available) */
  tempoAdjustment: number | null;
  /** Home court advantage applied */
  homeAdvantage: number;
  /** Momentum score (when available) */
  momentumScore: number | null;
  /** 1 if Four Factors and efficiency were blended (disagreement), 0 otherwise */
  blended: number;
  /** 1 = fourFactors path, 0 = fallback path */
  modelPathFourFactors: number;
  /** Prediction confidence 0-100 */
  confidence: number;
  /** Predicted spread (positive = home favored) */
  predictedSpread: number;
  /** Predicted total points */
  predictedTotal: number;
  /** Sport code 0-3 for CBB/NBA/NHL/MLB, -1 unknown */
  sportCode: number;

  // --- Market context (for ATS/O-U analysis) ---
  /** Closing spread (when available) */
  marketSpread: number | null;
  /** Closing total (when available) */
  marketTotal: number | null;

  // --- Actual outcome (labels) ---
  /** 1 = home win, 0 = away win */
  actualHomeWin: number;
  /** Actual spread (home - away) */
  actualSpread: number;
  /** Actual total points */
  actualTotal: number;
  /** Actual home score */
  actualHomeScore: number;
  /** Actual away score */
  actualAwayScore: number;

  // --- Errors (for quick analysis) ---
  spreadError: number;
  totalError: number;
}

/**
 * Extract a training example from a validated prediction.
 * Returns null if the prediction has no actual outcome.
 */
export function extractFeatures(tracked: TrackedPrediction): TrainingExample | null {
  if (!tracked.actualOutcome) return null;

  const pred = tracked.prediction;
  const trace = (pred as { trace?: PredictionTrace }).trace;

  const predictedTotal =
    tracked.predictedTotal ??
    (pred.predictedScore.home + pred.predictedScore.away);

  const homeWinProb =
    pred.winProbability?.home != null
      ? pred.winProbability.home > 1
        ? pred.winProbability.home / 100
        : pred.winProbability.home
      : 0.5;

  const homeWinProbRaw = trace?.homeWinProbRaw != null
    ? (trace.homeWinProbRaw > 1 ? trace.homeWinProbRaw / 100 : trace.homeWinProbRaw)
    : homeWinProb;

  const totalScore = trace?.totalScore ?? 0;
  const fourFactorsScore = trace?.fourFactorsScore ?? null;
  const efficiencyScore = trace?.efficiencyScore ?? null;
  const tempoAdjustment = trace?.tempoAdjustment ?? null;
  const homeAdvantage = trace?.homeAdvantage ?? 0;
  const momentumScore = trace?.momentumScore ?? null;
  const blended = trace?.blended === true ? 1 : 0;
  const modelPathFourFactors = trace?.modelPath === "fourFactors" ? 1 : 0;

  const actualSpread =
    tracked.actualOutcome.homeScore - tracked.actualOutcome.awayScore;
  const actualTotal =
    tracked.actualOutcome.homeScore + tracked.actualOutcome.awayScore;
  const actualHomeWin = tracked.actualOutcome.winner === "home" ? 1 : 0;

  const spreadError = Math.abs(pred.predictedSpread - actualSpread);
  const totalError = Math.abs(predictedTotal - actualTotal);

  return {
    id: tracked.id,
    date: tracked.date,
    sport: tracked.sport ?? "unknown",

    homeWinProb,
    homeWinProbRaw,
    totalScore,
    fourFactorsScore,
    efficiencyScore,
    tempoAdjustment,
    homeAdvantage,
    momentumScore,
    blended,
    modelPathFourFactors,
    confidence: pred.confidence ?? 50,
    predictedSpread: pred.predictedSpread,
    predictedTotal,

    marketSpread: tracked.closingSpread ?? null,
    marketTotal: tracked.closingTotal ?? null,

    actualHomeWin,
    actualSpread,
    actualTotal,
    actualHomeScore: tracked.actualOutcome.homeScore,
    actualAwayScore: tracked.actualOutcome.awayScore,

    spreadError,
    totalError,

    sportCode: SPORT_CODES[tracked.sport ?? ""] ?? -1,
  };
}

/**
 * Get feature names for export/ML (ordered to match numeric vector)
 */
export function getFeatureNames(): string[] {
  return [
    "homeWinProb",
    "homeWinProbRaw",
    "totalScore",
    "fourFactorsScore",
    "efficiencyScore",
    "tempoAdjustment",
    "homeAdvantage",
    "momentumScore",
    "blended",
    "modelPathFourFactors",
    "confidence",
    "predictedSpread",
    "predictedTotal",
    "sportCode",
  ];
}

/**
 * Convert training example to flat numeric vector (for ML).
 * Uses 0 for null numeric features.
 */
export function exampleToVector(ex: TrainingExample): number[] {
  return [
    ex.homeWinProb,
    ex.homeWinProbRaw,
    ex.totalScore,
    ex.fourFactorsScore ?? 0,
    ex.efficiencyScore ?? 0,
    ex.tempoAdjustment ?? 0,
    ex.homeAdvantage,
    ex.momentumScore ?? 0,
    ex.blended,
    ex.modelPathFourFactors,
    ex.confidence / 100,
    ex.predictedSpread,
    ex.predictedTotal,
    ex.sportCode >= 0 ? ex.sportCode / 4 : 0,
  ];
}
