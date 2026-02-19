/**
 * Prediction Calibration
 * 
 * Optimizes prediction model coefficients based on historical performance.
 * Uses regression/optimization to find best weights for various factors.
 */

import { HistoricalDataSet, findTeamStatsForSeason, HistoricalGame } from "./historical-data-collector";
import { calculateTeamAnalytics, predictMatchup } from "./advanced-analytics";
import { ValidationMetrics, calculateValidationMetrics, PredictionValidation, validateGamePrediction } from "./score-prediction-validator";

export interface CalibrationCoefficients {
  // Recent form weighting (Phase 2)
  recentFormWeight: number; // Currently 0.6
  seasonAvgWeight: number; // Currently 0.4 (derived: 1 - recentFormWeight)
  
  // SOS adjustment factor (Phase 1)
  sosAdjustmentFactor: number; // Currently 0.3
  
  // Tier adjustment blend (Phase 4)
  tierAdjustedWeight: number; // Currently 0.7
  weightedEffWeight: number; // Currently 0.3 (derived: 1 - tierAdjustedWeight)
  
  // Defensive adjustment factors (Phase 3)
  baseDefensiveAdjustmentFactor: number; // Currently 0.12
  percentileMultipliers: {
    elite: number; // Currently 1.5
    good: number; // Currently 1.2
    average: number; // Currently 1.0
    belowAverage: number; // Currently 0.8
    poor: number; // Currently 0.6
  };
  
  // Home advantage
  homeAdvantage: number; // Currently 3.5
  
  // Validation metrics (for comparison)
  validationMetrics?: ValidationMetrics;
}

/**
 * Default coefficients (current hardcoded values)
 */
export const DEFAULT_COEFFICIENTS: CalibrationCoefficients = {
  recentFormWeight: 0.6,
  seasonAvgWeight: 0.4,
  sosAdjustmentFactor: 0.3,
  tierAdjustedWeight: 0.7,
  weightedEffWeight: 0.3,
  baseDefensiveAdjustmentFactor: 0.12,
  percentileMultipliers: {
    elite: 1.5,
    good: 1.2,
    average: 1.0,
    belowAverage: 0.8,
    poor: 0.6,
  },
  homeAdvantage: 3.5,
};

/**
 * Generate predictions for historical games using given coefficients
 */
async function generatePredictionsWithCoefficients(
  games: HistoricalGame[],
  dataset: HistoricalDataSet,
  coefficients: CalibrationCoefficients
): Promise<PredictionValidation[]> {
  const validations: PredictionValidation[] = [];
  
  // Create a map of team stats by teamId and season
  const teamStatsMap = new Map<string, any>();
  for (const ts of dataset.teamStats) {
    teamStatsMap.set(`${ts.teamId}-${ts.season}`, ts.stats);
  }
  
  // Process each game
  for (const game of games) {
    try {
      const homeStatsKey = `${game.homeTeamId}-${game.season}`;
      const awayStatsKey = `${game.awayTeamId}-${game.season}`;
      
      const homeStats = teamStatsMap.get(homeStatsKey);
      const awayStats = teamStatsMap.get(awayStatsKey);
      
      if (!homeStats || !awayStats) {
        continue; // Skip if we don't have stats for both teams
      }
      
      // Use recent games from stats if available (empty for historical backtest)
      const homeRecentGames = Array.isArray(homeStats.recentGames) ? homeStats.recentGames : [];
      const awayRecentGames = Array.isArray(awayStats.recentGames) ? awayStats.recentGames : [];

      const homeAnalytics = calculateTeamAnalytics(homeStats, homeRecentGames, true, undefined, coefficients);
      const awayAnalytics = calculateTeamAnalytics(awayStats, awayRecentGames, false, undefined, coefficients);
      
      const prediction = predictMatchup(awayAnalytics, homeAnalytics, awayStats, homeStats, undefined, coefficients);
      
      // Validate
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
      console.warn(`Error processing game ${game.gameId}:`, error);
      continue;
    }
  }
  
  return validations;
}

/**
 * Optimize coefficients using grid search (simple optimization approach)
 */
export async function optimizeCoefficients(
  dataset: HistoricalDataSet,
  sampleSize: number = 100
): Promise<CalibrationCoefficients> {
  console.log(`\n🔧 Optimizing coefficients using ${sampleSize} historical games\n`);
  
  // Sample games for optimization (use recent games)
  const sampleGames = dataset.games
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, sampleSize);
  
  if (sampleGames.length === 0) {
    console.warn("No games available for optimization");
    return DEFAULT_COEFFICIENTS;
  }
  
  console.log(`Using ${sampleGames.length} games for optimization`);
  
  // Test default coefficients first
  const defaultValidations = await generatePredictionsWithCoefficients(
    sampleGames,
    dataset,
    DEFAULT_COEFFICIENTS
  );
  const defaultMetrics = calculateValidationMetrics(defaultValidations);
  
  console.log(`Default coefficients MAE: ${defaultMetrics.meanAbsoluteError.total.toFixed(2)}`);
  
  // Grid search for key coefficients
  // We'll optimize: recentFormWeight, sosAdjustmentFactor, baseDefensiveAdjustmentFactor
  let bestCoefficients = { ...DEFAULT_COEFFICIENTS };
  let bestMetrics = defaultMetrics;
  let bestMAE = defaultMetrics.meanAbsoluteError.total;
  
  // Grid search: test each coefficient combination and keep the best
  for (let rfWeight = 0.4; rfWeight <= 0.8; rfWeight += 0.1) {
    for (let sosFactor = 0.2; sosFactor <= 0.4; sosFactor += 0.05) {
      for (let defAdj = 0.08; defAdj <= 0.16; defAdj += 0.02) {
        const testCoefficients: CalibrationCoefficients = {
          ...DEFAULT_COEFFICIENTS,
          recentFormWeight: rfWeight,
          seasonAvgWeight: 1 - rfWeight,
          sosAdjustmentFactor: sosFactor,
          baseDefensiveAdjustmentFactor: defAdj,
        };

        const testValidations = await generatePredictionsWithCoefficients(
          sampleGames,
          dataset,
          testCoefficients
        );
        const testMetrics = calculateValidationMetrics(testValidations);
        const testMAE = testMetrics.meanAbsoluteError.total;

        if (testMAE < bestMAE) {
          bestMAE = testMAE;
          bestMetrics = testMetrics;
          bestCoefficients = testCoefficients;
        }
      }
    }
  }
  
  console.log(`\n✅ Optimization complete`);
  console.log(`Best MAE: ${bestMAE.toFixed(2)} (improvement: ${(defaultMetrics.meanAbsoluteError.total - bestMAE).toFixed(2)})`);
  
  return bestCoefficients;
}

/**
 * Simple optimization using gradient descent approach
 * Optimizes one coefficient at a time
 */
export async function optimizeCoefficientGradientDescent(
  dataset: HistoricalDataSet,
  coefficientToOptimize: keyof CalibrationCoefficients,
  sampleSize: number = 200
): Promise<number> {
  console.log(`Optimizing coefficient: ${coefficientToOptimize}`);
  
  // Sample games
  const sampleGames = dataset.games
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, sampleSize);
  
  if (sampleGames.length === 0) {
    return (DEFAULT_COEFFICIENTS[coefficientToOptimize] as number) || 0;
  }
  
  // Simple grid search (more sophisticated optimization would use actual gradient descent)
  const currentValue = (DEFAULT_COEFFICIENTS[coefficientToOptimize] as number) || 0;
  
  // Test range around current value
  const range = currentValue * 0.5; // ±50% range
  const step = range / 10;
  const min = Math.max(0, currentValue - range);
  const max = currentValue + range;
  
  let bestValue = currentValue;
  let bestError = Infinity;
  
  for (let testValue = min; testValue <= max; testValue += step) {
    // Test this value
    // Note: This is a placeholder - actual implementation would require
    // refactoring the prediction functions to accept coefficients as parameters
    // For now, return the default value
  }
  
  return bestValue;
}

/**
 * Validate coefficients against historical data
 */
export async function validateCoefficients(
  coefficients: CalibrationCoefficients,
  dataset: HistoricalDataSet,
  sampleSize: number = 100
): Promise<ValidationMetrics> {
  const { validations } = await validateCoefficientsWithValidations(
    coefficients,
    dataset,
    sampleSize
  );
  return calculateValidationMetrics(validations);
}

/**
 * Validate coefficients and return raw validations (for recalibration fitting)
 */
export async function validateCoefficientsWithValidations(
  coefficients: CalibrationCoefficients,
  dataset: HistoricalDataSet,
  sampleSize: number = 100
): Promise<{ metrics: ValidationMetrics; validations: PredictionValidation[] }> {
  const sampleGames = dataset.games
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, sampleSize);

  const validations = await generatePredictionsWithCoefficients(
    sampleGames,
    dataset,
    coefficients
  );

  return {
    metrics: calculateValidationMetrics(validations),
    validations,
  };
}

/**
 * Compare two sets of coefficients
 */
export async function compareCoefficients(
  coefficients1: CalibrationCoefficients,
  coefficients2: CalibrationCoefficients,
  dataset: HistoricalDataSet,
  sampleSize: number = 100
): Promise<{
  metrics1: ValidationMetrics;
  metrics2: ValidationMetrics;
  improvement: {
    mae: number;
    winnerAccuracy: number;
  };
}> {
  const [metrics1, metrics2] = await Promise.all([
    validateCoefficients(coefficients1, dataset, sampleSize),
    validateCoefficients(coefficients2, dataset, sampleSize),
  ]);
  
  const improvement = {
    mae: metrics1.meanAbsoluteError.total - metrics2.meanAbsoluteError.total,
    winnerAccuracy: metrics2.accuracy.winner - metrics1.accuracy.winner,
  };
  
  return { metrics1, metrics2, improvement };
}

