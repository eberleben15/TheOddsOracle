/**
 * Variance Estimation
 *
 * Analyzes prediction errors to estimate score variance by team quality,
 * matchup type, and score range. Supports two sources:
 * - Validated predictions (DB): no historical API needed
 * - Historical data set: for backtest-style estimation
 */

import { HistoricalDataSet } from "./historical-data-collector";
import { calculateTeamAnalytics, predictMatchup } from "./advanced-analytics";
import { validateGamePrediction, PredictionValidation } from "./score-prediction-validator";
import type { TrackedPrediction } from "./prediction-tracker";

export interface VarianceModel {
  // Base variance (average prediction error)
  baseVariance: number;
  
  // Variance by team quality (net rating)
  varianceByQuality: {
    elite: number; // Top 25% teams
    good: number; // 25-50%
    average: number; // 50-75%
    poor: number; // Bottom 25%
  };
  
  // Variance by matchup type
  varianceByMatchup: {
    blowout: number; // >15 point spread
    competitive: number; // 5-15 point spread
    close: number; // <5 point spread
  };
  
  // Variance by score range
  varianceByScore: {
    low: number; // <65 points
    medium: number; // 65-80 points
    high: number; // >80 points
  };
  
  // Additional factors
  homeTeamVariance: number; // Variance adjustment for home teams
  varianceModelVersion: string;
  estimatedAt: number;
}

/** Minimum validated predictions to estimate variance (otherwise use default) */
const MIN_VALIDATIONS_FOR_ESTIMATE = 20;

/** Default variance model when insufficient data (CBB-oriented) */
export const DEFAULT_VARIANCE_MODEL: VarianceModel = {
  baseVariance: 64,
  varianceByQuality: { elite: 49, good: 64, average: 81, poor: 100 },
  varianceByMatchup: { blowout: 64, competitive: 81, close: 100 },
  varianceByScore: { low: 81, medium: 64, high: 49 },
  homeTeamVariance: 1.0,
  varianceModelVersion: "default",
  estimatedAt: 0,
};

/**
 * Calculate variance statistics from validation results
 */
function calculateVarianceStats(validations: PredictionValidation[]): {
  baseVariance: number;
  standardDeviation: number;
  varianceByQuality: Record<string, number[]>;
  varianceByMatchup: Record<string, number[]>;
  varianceByScore: Record<string, number[]>;
} {
  if (validations.length === 0) {
    return {
      baseVariance: 0,
      standardDeviation: 0,
      varianceByQuality: {},
      varianceByMatchup: {},
      varianceByScore: {},
    };
  }
  
  // Calculate base variance (MSE of score predictions)
  const errors: number[] = [];
  for (const v of validations) {
    errors.push(v.errors.homeScoreError);
    errors.push(v.errors.awayScoreError);
  }
  
  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const variance = errors.reduce((sum, err) => sum + Math.pow(err - meanError, 2), 0) / errors.length;
  const stdDev = Math.sqrt(variance);
  
  // Categorize by quality (using predicted spread as proxy)
  const varianceByQuality: Record<string, number[]> = {
    elite: [],
    good: [],
    average: [],
    poor: [],
  };
  
  // Categorize by matchup type (predicted spread)
  const varianceByMatchup: Record<string, number[]> = {
    blowout: [], // >15
    competitive: [], // 5-15
    close: [], // <5
  };
  
  // Categorize by score range
  const varianceByScore: Record<string, number[]> = {
    low: [], // <65
    medium: [], // 65-80
    high: [], // >80
  };
  
  for (const v of validations) {
    const totalError = v.errors.totalError;
    const predictedSpread = Math.abs(v.predictedSpread);
    const avgPredictedScore = (v.predictedScore.home + v.predictedScore.away) / 2;
    
    // Quality categorization (based on spread - larger spreads = better teams)
    if (predictedSpread > 10) {
      varianceByQuality.elite.push(totalError);
    } else if (predictedSpread > 5) {
      varianceByQuality.good.push(totalError);
    } else if (predictedSpread > 2) {
      varianceByQuality.average.push(totalError);
    } else {
      varianceByQuality.poor.push(totalError);
    }
    
    // Matchup type
    if (predictedSpread > 15) {
      varianceByMatchup.blowout.push(totalError);
    } else if (predictedSpread > 5) {
      varianceByMatchup.competitive.push(totalError);
    } else {
      varianceByMatchup.close.push(totalError);
    }
    
    // Score range
    if (avgPredictedScore < 65) {
      varianceByScore.low.push(totalError);
    } else if (avgPredictedScore <= 80) {
      varianceByScore.medium.push(totalError);
    } else {
      varianceByScore.high.push(totalError);
    }
  }
  
  return {
    baseVariance: variance,
    standardDeviation: stdDev,
    varianceByQuality,
    varianceByMatchup,
    varianceByScore,
  };
}

/**
 * Estimate variance model from historical data
 */
export async function estimateVarianceModel(
  dataset: HistoricalDataSet,
  sampleSize: number = 500
): Promise<VarianceModel> {
  console.log(`\n📊 Estimating variance model from ${sampleSize} historical games\n`);
  
  // Sample games for variance estimation
  const sampleGames = dataset.games
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, sampleSize);
  
  if (sampleGames.length === 0) {
    return { ...DEFAULT_VARIANCE_MODEL, estimatedAt: Date.now() };
  }
  
  // Generate predictions for sample games
  const validations: PredictionValidation[] = [];
  
  // Create team stats map
  const teamStatsMap = new Map<string, any>();
  for (const ts of dataset.teamStats) {
    teamStatsMap.set(`${ts.teamId}-${ts.season}`, ts.stats);
  }
  
  for (const game of sampleGames) {
    try {
      const homeStatsKey = `${game.homeTeamId}-${game.season}`;
      const awayStatsKey = `${game.awayTeamId}-${game.season}`;
      
      const homeStats = teamStatsMap.get(homeStatsKey);
      const awayStats = teamStatsMap.get(awayStatsKey);
      
      if (!homeStats || !awayStats) continue;
      
      const homeAnalytics = calculateTeamAnalytics(homeStats, [], true);
      const awayAnalytics = calculateTeamAnalytics(awayStats, [], false);
      const prediction = predictMatchup(awayAnalytics, homeAnalytics, awayStats, homeStats);
      
      const validation = validateGamePrediction(prediction, {
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameId: game.gameId,
        date: game.date,
      });
      
      validations.push(validation);
    } catch (error) {
      console.warn(`Error processing game ${game.gameId} for variance estimation:`, error);
      continue;
    }
  }
  
  if (validations.length === 0) {
    throw new Error("No valid predictions generated for variance estimation");
  }
  
  // Calculate variance statistics
  const stats = calculateVarianceStats(validations);
  
  // Calculate variance for each category
  function calculateCategoryVariance(errors: number[]): number {
    if (errors.length === 0) return stats.baseVariance;
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    return errors.reduce((sum, err) => sum + Math.pow(err - mean, 2), 0) / errors.length;
  }
  
  const varianceByQuality = {
    elite: calculateCategoryVariance(stats.varianceByQuality.elite),
    good: calculateCategoryVariance(stats.varianceByQuality.good),
    average: calculateCategoryVariance(stats.varianceByQuality.average),
    poor: calculateCategoryVariance(stats.varianceByQuality.poor),
  };
  
  const varianceByMatchup = {
    blowout: calculateCategoryVariance(stats.varianceByMatchup.blowout),
    competitive: calculateCategoryVariance(stats.varianceByMatchup.competitive),
    close: calculateCategoryVariance(stats.varianceByMatchup.close),
  };
  
  const varianceByScore = {
    low: calculateCategoryVariance(stats.varianceByScore.low),
    medium: calculateCategoryVariance(stats.varianceByScore.medium),
    high: calculateCategoryVariance(stats.varianceByScore.high),
  };
  
  const model: VarianceModel = {
    baseVariance: stats.baseVariance,
    varianceByQuality,
    varianceByMatchup,
    varianceByScore,
    homeTeamVariance: 1.0, // Can be refined based on analysis
    varianceModelVersion: "1.0",
    estimatedAt: Date.now(),
  };
  
  console.log(`✅ Variance model estimated from ${validations.length} games`);
  console.log(`Base variance: ${stats.baseVariance.toFixed(2)} (std dev: ${stats.standardDeviation.toFixed(2)})`);
  
  return model;
}

/**
 * Estimate variance model from validated predictions (no historical API required).
 * Uses real prediction-vs-outcome errors from the DB. Falls back to default when
 * fewer than MIN_VALIDATIONS_FOR_ESTIMATE predictions.
 */
export function estimateVarianceModelFromValidatedPredictions(
  predictions: TrackedPrediction[]
): VarianceModel {
  const validations: PredictionValidation[] = [];
  for (const p of predictions) {
    if (!p.actualOutcome) continue;
    const pred = p.prediction;
    const predTotal = p.predictedTotal ?? (pred.predictedScore.home + pred.predictedScore.away);
    validations.push(
      validateGamePrediction(
        { ...pred, predictedTotal: predTotal },
        {
          homeScore: p.actualOutcome.homeScore,
          awayScore: p.actualOutcome.awayScore,
          homeTeam: p.homeTeam,
          awayTeam: p.awayTeam,
          gameId: parseInt(p.gameId, 10) || 0,
          date: p.date,
        }
      )
    );
  }

  if (validations.length < MIN_VALIDATIONS_FOR_ESTIMATE) {
    return { ...DEFAULT_VARIANCE_MODEL, estimatedAt: Date.now() };
  }

  const stats = calculateVarianceStats(validations);

  function catVar(errors: number[]): number {
    if (errors.length === 0) return stats.baseVariance;
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    return errors.reduce((sum, err) => sum + Math.pow(err - mean, 2), 0) / errors.length;
  }

  return {
    baseVariance: stats.baseVariance,
    varianceByQuality: {
      elite: catVar(stats.varianceByQuality.elite),
      good: catVar(stats.varianceByQuality.good),
      average: catVar(stats.varianceByQuality.average),
      poor: catVar(stats.varianceByQuality.poor),
    },
    varianceByMatchup: {
      blowout: catVar(stats.varianceByMatchup.blowout),
      competitive: catVar(stats.varianceByMatchup.competitive),
      close: catVar(stats.varianceByMatchup.close),
    },
    varianceByScore: {
      low: catVar(stats.varianceByScore.low),
      medium: catVar(stats.varianceByScore.medium),
      high: catVar(stats.varianceByScore.high),
    },
    homeTeamVariance: 1.0,
    varianceModelVersion: "validated",
    estimatedAt: Date.now(),
  };
}

/**
 * Get variance estimate for a specific prediction
 */
export function getVarianceForPrediction(
  model: VarianceModel,
  predictedScore: { home: number; away: number },
  predictedSpread: number
): number {
  const avgScore = (predictedScore.home + predictedScore.away) / 2;
  const absSpread = Math.abs(predictedSpread);
  
  // Determine quality tier (based on spread)
  let qualityVariance: number;
  if (absSpread > 10) {
    qualityVariance = model.varianceByQuality.elite;
  } else if (absSpread > 5) {
    qualityVariance = model.varianceByQuality.good;
  } else if (absSpread > 2) {
    qualityVariance = model.varianceByQuality.average;
  } else {
    qualityVariance = model.varianceByQuality.poor;
  }
  
  // Determine matchup type
  let matchupVariance: number;
  if (absSpread > 15) {
    matchupVariance = model.varianceByMatchup.blowout;
  } else if (absSpread > 5) {
    matchupVariance = model.varianceByMatchup.competitive;
  } else {
    matchupVariance = model.varianceByMatchup.close;
  }
  
  // Determine score range variance
  let scoreVariance: number;
  if (avgScore < 65) {
    scoreVariance = model.varianceByScore.low;
  } else if (avgScore <= 80) {
    scoreVariance = model.varianceByScore.medium;
  } else {
    scoreVariance = model.varianceByScore.high;
  }
  
  // Combine variances (weighted average)
  // Quality: 40%, Matchup: 30%, Score: 30%
  const combinedVariance = 
    qualityVariance * 0.4 +
    matchupVariance * 0.3 +
    scoreVariance * 0.3;
  
  return combinedVariance;
}

/**
 * Get standard deviation for a prediction (sqrt of variance)
 */
export function getStandardDeviationForPrediction(
  model: VarianceModel,
  predictedScore: { home: number; away: number },
  predictedSpread: number
): number {
  const variance = getVarianceForPrediction(model, predictedScore, predictedSpread);
  return Math.sqrt(variance);
}

