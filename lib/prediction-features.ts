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

  // --- Upstream analytics (populated from stored teamAnalytics) ---
  // Net ratings
  awayNetRating?: number | null;
  homeNetRating?: number | null;
  netRatingDiff?: number | null; // home - away (positive = home stronger)
  
  // Offensive efficiency
  awayOffEff?: number | null;
  homeOffEff?: number | null;
  awayAdjOffEff?: number | null;
  homeAdjOffEff?: number | null;
  
  // Defensive efficiency
  awayDefEff?: number | null;
  homeDefEff?: number | null;
  awayAdjDefEff?: number | null;
  homeAdjDefEff?: number | null;
  
  // Momentum and form
  awayMomentum?: number | null;
  homeMomentum?: number | null;
  momentumDiff?: number | null; // home - away
  awayWinStreak?: number | null;
  homeWinStreak?: number | null;
  awayLast5Wins?: number | null;
  homeLast5Wins?: number | null;
  
  // Strength of schedule
  awayStrengthOfSchedule?: number | null;
  homeStrengthOfSchedule?: number | null;
  sosDiff?: number | null; // home - away
  
  // Shooting and efficiency metrics
  awayShootingEff?: number | null;
  homeShootingEff?: number | null;
  awayThreePointThreat?: number | null;
  homeThreePointThreat?: number | null;
  awayFreeThrowReliability?: number | null;
  homeFreeThrowReliability?: number | null;
  
  // Rebounding and playmaking
  awayReboundingAdv?: number | null;
  homeReboundingAdv?: number | null;
  awayAstToTov?: number | null;
  homeAstToTov?: number | null;
  
  // Consistency
  awayConsistency?: number | null;
  homeConsistency?: number | null;
  
  // --- Derived / game context features ---
  /** 1 = home favorite, 0 = home underdog */
  homeFavorite?: number;
  /** Absolute spread magnitude */
  spreadMagnitude?: number;
  /** Market vs predicted spread diff (edge signal) */
  spreadDiff?: number | null;
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

  // Extract teamAnalytics if stored
  const ta = tracked.teamAnalytics;
  const awayA = ta?.away;
  const homeA = ta?.home;
  
  // Derived features
  const homeFavorite = pred.predictedSpread > 0 ? 1 : 0;
  const spreadMagnitude = Math.abs(pred.predictedSpread);
  const spreadDiff = tracked.closingSpread != null
    ? pred.predictedSpread - (-tracked.closingSpread)
    : null;

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

    // Upstream analytics
    awayNetRating: awayA?.netRating ?? null,
    homeNetRating: homeA?.netRating ?? null,
    netRatingDiff: awayA && homeA ? homeA.netRating - awayA.netRating : null,
    
    awayOffEff: awayA?.offensiveEfficiency ?? null,
    homeOffEff: homeA?.offensiveEfficiency ?? null,
    awayAdjOffEff: awayA?.adjustedOffensiveEfficiency ?? null,
    homeAdjOffEff: homeA?.adjustedOffensiveEfficiency ?? null,
    
    awayDefEff: awayA?.defensiveEfficiency ?? null,
    homeDefEff: homeA?.defensiveEfficiency ?? null,
    awayAdjDefEff: awayA?.adjustedDefensiveEfficiency ?? null,
    homeAdjDefEff: homeA?.adjustedDefensiveEfficiency ?? null,
    
    awayMomentum: awayA?.momentum ?? null,
    homeMomentum: homeA?.momentum ?? null,
    momentumDiff: awayA && homeA ? homeA.momentum - awayA.momentum : null,
    awayWinStreak: awayA?.winStreak ?? null,
    homeWinStreak: homeA?.winStreak ?? null,
    awayLast5Wins: awayA?.last5Wins ?? null,
    homeLast5Wins: homeA?.last5Wins ?? null,
    
    awayStrengthOfSchedule: awayA?.strengthOfSchedule ?? null,
    homeStrengthOfSchedule: homeA?.strengthOfSchedule ?? null,
    sosDiff: awayA?.strengthOfSchedule != null && homeA?.strengthOfSchedule != null
      ? homeA.strengthOfSchedule - awayA.strengthOfSchedule
      : null,
    
    awayShootingEff: awayA?.shootingEfficiency ?? null,
    homeShootingEff: homeA?.shootingEfficiency ?? null,
    awayThreePointThreat: awayA?.threePointThreat ?? null,
    homeThreePointThreat: homeA?.threePointThreat ?? null,
    awayFreeThrowReliability: awayA?.freeThrowReliability ?? null,
    homeFreeThrowReliability: homeA?.freeThrowReliability ?? null,
    
    awayReboundingAdv: awayA?.reboundingAdvantage ?? null,
    homeReboundingAdv: homeA?.reboundingAdvantage ?? null,
    awayAstToTov: awayA?.assistToTurnoverRatio ?? null,
    homeAstToTov: homeA?.assistToTurnoverRatio ?? null,
    
    awayConsistency: awayA?.consistency ?? null,
    homeConsistency: homeA?.consistency ?? null,
    
    // Derived
    homeFavorite,
    spreadMagnitude,
    spreadDiff,
  };
}

/**
 * Enrich a training example with upstream TeamAnalytics.
 * Call when analytics are available (e.g. from prediction-time storage or historical recompute).
 */
export function enrichWithAnalytics(
  ex: TrainingExample,
  analytics: {
    away: { netRating: number; adjustedOffensiveEfficiency?: number; adjustedDefensiveEfficiency?: number; momentum?: number; strengthOfSchedule?: number };
    home: { netRating: number; adjustedOffensiveEfficiency?: number; adjustedDefensiveEfficiency?: number; momentum?: number; strengthOfSchedule?: number };
  }
): TrainingExample {
  return {
    ...ex,
    awayNetRating: analytics.away.netRating,
    homeNetRating: analytics.home.netRating,
    awayAdjOffEff: analytics.away.adjustedOffensiveEfficiency ?? null,
    homeAdjOffEff: analytics.home.adjustedOffensiveEfficiency ?? null,
    awayAdjDefEff: analytics.away.adjustedDefensiveEfficiency ?? null,
    homeAdjDefEff: analytics.home.adjustedDefensiveEfficiency ?? null,
    awayMomentum: analytics.away.momentum ?? null,
    homeMomentum: analytics.home.momentum ?? null,
    awayStrengthOfSchedule: analytics.away.strengthOfSchedule ?? null,
    homeStrengthOfSchedule: analytics.home.strengthOfSchedule ?? null,
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
