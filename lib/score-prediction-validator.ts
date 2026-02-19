/**
 * Score Prediction Validation Framework
 * 
 * Provides utilities to validate and calibrate score predictions against actual results.
 * Tracks prediction accuracy metrics and helps adjust coefficients.
 */

import { TeamStats, GameResult } from "@/types";
import { predictMatchup, calculateTeamAnalytics } from "./advanced-analytics";
import { TeamAnalytics } from "./advanced-analytics";

export interface PredictionValidation {
  gameId: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  predictedScore: { home: number; away: number };
  actualScore: { home: number; away: number };
  predictedSpread: number;
  actualSpread: number;
  homeWinProb: number;
  actualWinner: 'home' | 'away';
  confidence?: number;
  errors: {
    homeScoreError: number;
    awayScoreError: number;
    spreadError: number;
    totalError: number;
  };
}

export interface ValidationMetrics {
  meanAbsoluteError: {
    homeScore: number;
    awayScore: number;
    spread: number;
    total: number;
  };
  rootMeanSquaredError: {
    homeScore: number;
    awayScore: number;
    spread: number;
  };
  accuracy: {
    winner: number; // Percentage of correct winner predictions
    spreadWithin3: number; // Percentage of predictions within 3 points of actual spread
    spreadWithin5: number; // Percentage of predictions within 5 points of actual spread
    highConfidenceWinner?: number; // Winner accuracy when confidence > 75%
    highConfidenceCount?: number; // Number of high-confidence predictions
  };
  calibration?: {
    bins: { bucket: string; predicted: number; actual: number; count: number }[];
    meanCalibrationError: number; // Avg |predicted - actual| across bins
    brierScore: number; // Mean squared error of prob vs outcome (0-1, lower is better)
    logLoss: number; // Cross-entropy; penalizes overconfident mistakes (lower is better)
    expectedCalibrationError: number; // ECE: weighted avg |predicted - actual| (lower is better)
  };
  gameCount: number;
}

/**
 * Validate a single game prediction
 */
export function validateGamePrediction(
  prediction: {
    predictedScore: { home: number; away: number };
    predictedSpread: number;
    winProbability: { home: number; away: number };
    confidence?: number;
  },
  actual: {
    homeScore: number;
    awayScore: number;
    homeTeam: string;
    awayTeam: string;
    gameId: number;
    date: string;
  }
): PredictionValidation {
  const actualSpread = actual.homeScore - actual.awayScore;
  const actualWinner = actual.homeScore > actual.awayScore ? 'home' : 'away';
  const predictedWinner = prediction.predictedSpread > 0 ? 'home' : 'away';
  
  const homeScoreError = Math.abs(prediction.predictedScore.home - actual.homeScore);
  const awayScoreError = Math.abs(prediction.predictedScore.away - actual.awayScore);
  const spreadError = Math.abs(prediction.predictedSpread - actualSpread);
  const totalError = homeScoreError + awayScoreError;
  
  return {
    gameId: actual.gameId,
    date: actual.date,
    homeTeam: actual.homeTeam,
    awayTeam: actual.awayTeam,
    predictedScore: prediction.predictedScore,
    actualScore: { home: actual.homeScore, away: actual.awayScore },
    predictedSpread: prediction.predictedSpread,
    actualSpread,
    homeWinProb: prediction.winProbability.home,
    actualWinner,
    confidence: prediction.confidence,
    errors: {
      homeScoreError,
      awayScoreError,
      spreadError,
      totalError,
    },
  };
}

/**
 * Calculate validation metrics from a set of validations
 */
export function calculateValidationMetrics(
  validations: PredictionValidation[]
): ValidationMetrics {
  if (validations.length === 0) {
    return {
      meanAbsoluteError: { homeScore: 0, awayScore: 0, spread: 0, total: 0 },
      rootMeanSquaredError: { homeScore: 0, awayScore: 0, spread: 0 },
      accuracy: { winner: 0, spreadWithin3: 0, spreadWithin5: 0 },
      calibration: {
        bins: [],
        meanCalibrationError: 0,
        brierScore: 0,
        logLoss: 0,
        expectedCalibrationError: 0,
      },
      gameCount: 0,
    };
  }
  
  // Mean Absolute Error (MAE)
  const maeHome = validations.reduce((sum, v) => sum + v.errors.homeScoreError, 0) / validations.length;
  const maeAway = validations.reduce((sum, v) => sum + v.errors.awayScoreError, 0) / validations.length;
  const maeSpread = validations.reduce((sum, v) => sum + v.errors.spreadError, 0) / validations.length;
  const maeTotal = validations.reduce((sum, v) => sum + v.errors.totalError, 0) / validations.length;
  
  // Root Mean Squared Error (RMSE)
  const rmseHome = Math.sqrt(
    validations.reduce((sum, v) => sum + Math.pow(v.errors.homeScoreError, 2), 0) / validations.length
  );
  const rmseAway = Math.sqrt(
    validations.reduce((sum, v) => sum + Math.pow(v.errors.awayScoreError, 2), 0) / validations.length
  );
  const rmseSpread = Math.sqrt(
    validations.reduce((sum, v) => sum + Math.pow(v.errors.spreadError, 2), 0) / validations.length
  );
  
  // Accuracy metrics
  const correctWinner = validations.filter(v => {
    const predictedWinner = v.predictedSpread > 0 ? 'home' : 'away';
    return predictedWinner === v.actualWinner;
  }).length;
  const winnerAccuracy = (correctWinner / validations.length) * 100;
  
  const spreadWithin3 = validations.filter(v => v.errors.spreadError <= 3).length;
  const spreadWithin5 = validations.filter(v => v.errors.spreadError <= 5).length;
  
  // High-confidence accuracy (confidence > 75%)
  const HIGH_CONFIDENCE_THRESHOLD = 75;
  const highConfidenceValidations = validations.filter(
    v => v.confidence != null && v.confidence > HIGH_CONFIDENCE_THRESHOLD
  );
  let highConfidenceWinner: number | undefined;
  if (highConfidenceValidations.length > 0) {
    const hcCorrect = highConfidenceValidations.filter(v => {
      const predictedWinner = v.predictedSpread > 0 ? 'home' : 'away';
      return predictedWinner === v.actualWinner;
    }).length;
    highConfidenceWinner = (hcCorrect / highConfidenceValidations.length) * 100;
  }
  
  // Calibration: bin by predicted home win prob (0-100), compare to actual win rate
  const CALIBRATION_BINS = [
    { min: 50, max: 60, label: '50-60%' },
    { min: 60, max: 70, label: '60-70%' },
    { min: 70, max: 80, label: '70-80%' },
    { min: 80, max: 90, label: '80-90%' },
    { min: 90, max: 100, label: '90-100%' },
  ];
  const calibrationBins: { bucket: string; predicted: number; actual: number; count: number }[] = [];
  for (const bin of CALIBRATION_BINS) {
    const inBin = validations.filter(
      v => v.homeWinProb >= bin.min && v.homeWinProb < bin.max
    );
    if (inBin.length > 0) {
      const predicted = (bin.min + bin.max) / 2;
      const homeWins = inBin.filter(v => v.actualWinner === 'home').length;
      const actual = (homeWins / inBin.length) * 100;
      calibrationBins.push({
        bucket: bin.label,
        predicted,
        actual,
        count: inBin.length,
      });
    }
  }
  const meanCalibrationError =
    calibrationBins.length > 0
      ? calibrationBins.reduce((sum, b) => sum + Math.abs(b.predicted - b.actual), 0) /
        calibrationBins.length
      : 0;

  // Industry-standard calibration metrics (Brier, Log Loss, ECE)
  const homeWinProb01 = validations.map((v) => v.homeWinProb / 100);
  const actualHomeWin = validations.map((v) => (v.actualWinner === 'home' ? 1 : 0));
  const brierScore =
    homeWinProb01.reduce(
      (sum, p, i) => sum + Math.pow(p - actualHomeWin[i], 2),
      0
    ) / validations.length;
  const EPS = 1e-7; // avoid log(0)
  const logLoss =
    -homeWinProb01.reduce(
      (sum, p, i) =>
        sum +
        (actualHomeWin[i] * Math.log(Math.max(p, EPS)) +
          (1 - actualHomeWin[i]) * Math.log(Math.max(1 - p, EPS))),
      0
    ) / validations.length;
  // ECE: for each bin, |predicted - actual| * (count/n), then sum
  const ece =
    calibrationBins.length > 0
      ? calibrationBins.reduce(
          (sum, b) =>
            sum + (Math.abs(b.predicted - b.actual) / 100) * (b.count / validations.length),
          0
        )
      : 0;

  return {
    meanAbsoluteError: {
      homeScore: maeHome,
      awayScore: maeAway,
      spread: maeSpread,
      total: maeTotal,
    },
    rootMeanSquaredError: {
      homeScore: rmseHome,
      awayScore: rmseAway,
      spread: rmseSpread,
    },
    accuracy: {
      winner: winnerAccuracy,
      spreadWithin3: (spreadWithin3 / validations.length) * 100,
      spreadWithin5: (spreadWithin5 / validations.length) * 100,
      ...(highConfidenceWinner != null && {
        highConfidenceWinner,
        highConfidenceCount: highConfidenceValidations.length,
      }),
    },
    calibration: {
      bins: calibrationBins,
      meanCalibrationError: calibrationBins.length > 0 ? meanCalibrationError : 0,
      brierScore,
      logLoss,
      expectedCalibrationError: ece,
    },
    gameCount: validations.length,
  };
}

/**
 * Validate predictions for historical games
 * Takes completed games and validates predictions against actual results
 */
export function validateHistoricalPredictions(
  games: GameResult[],
  homeStats: TeamStats,
  awayStats: TeamStats,
  homeTeamName: string,
  awayTeamName: string
): PredictionValidation[] {
  const validations: PredictionValidation[] = [];
  
  // Calculate analytics for both teams
  const homeAnalytics = calculateTeamAnalytics(homeStats, homeStats.recentGames || [], true);
  const awayAnalytics = calculateTeamAnalytics(awayStats, awayStats.recentGames || [], false);
  
  // Make prediction
  const prediction = predictMatchup(awayAnalytics, homeAnalytics, awayStats, homeStats);
  
  // Validate against actual game result
  const actual = {
    homeScore: games[0].homeScore,
    awayScore: games[0].awayScore,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    gameId: games[0].id,
    date: games[0].date,
  };
  
  validations.push(validateGamePrediction(prediction, actual));
  
  return validations;
}

/**
 * Log validation metrics to console for monitoring
 */
export function logValidationMetrics(metrics: ValidationMetrics): void {
  console.log('\n📊 Score Prediction Validation Metrics');
  console.log('='.repeat(50));
  console.log(`Games Validated: ${metrics.gameCount}`);
  console.log('\nMean Absolute Error (MAE):');
  console.log(`  Home Score: ${metrics.meanAbsoluteError.homeScore.toFixed(2)} points`);
  console.log(`  Away Score: ${metrics.meanAbsoluteError.awayScore.toFixed(2)} points`);
  console.log(`  Spread: ${metrics.meanAbsoluteError.spread.toFixed(2)} points`);
  console.log(`  Total: ${metrics.meanAbsoluteError.total.toFixed(2)} points`);
  console.log('\nRoot Mean Squared Error (RMSE):');
  console.log(`  Home Score: ${metrics.rootMeanSquaredError.homeScore.toFixed(2)} points`);
  console.log(`  Away Score: ${metrics.rootMeanSquaredError.awayScore.toFixed(2)} points`);
  console.log(`  Spread: ${metrics.rootMeanSquaredError.spread.toFixed(2)} points`);
  console.log('\nAccuracy:');
  console.log(`  Winner Prediction: ${metrics.accuracy.winner.toFixed(1)}%`);
  if (metrics.accuracy.highConfidenceWinner != null && metrics.accuracy.highConfidenceCount != null) {
    console.log(`  High-Confidence Winner (n=${metrics.accuracy.highConfidenceCount}): ${metrics.accuracy.highConfidenceWinner.toFixed(1)}%`);
  }
  console.log(`  Spread Within 3 Points: ${metrics.accuracy.spreadWithin3.toFixed(1)}%`);
  console.log(`  Spread Within 5 Points: ${metrics.accuracy.spreadWithin5.toFixed(1)}%`);
  if (metrics.calibration) {
    console.log('\nCalibration (industry standard):');
    console.log(`  Brier Score: ${metrics.calibration.brierScore.toFixed(4)} (lower = better)`);
    console.log(`  Log Loss: ${metrics.calibration.logLoss.toFixed(4)} (lower = better)`);
    console.log(`  Expected Calibration Error: ${metrics.calibration.expectedCalibrationError.toFixed(4)} (lower = better)`);
    console.log(`  Mean Calibration Error: ${metrics.calibration.meanCalibrationError.toFixed(1)}%`);
    for (const bin of metrics.calibration.bins) {
      console.log(`  ${bin.bucket}: predicted ~${bin.predicted.toFixed(0)}%, actual ${bin.actual.toFixed(1)}% (n=${bin.count})`);
    }
  }
  console.log('='.repeat(50) + '\n');
}

/**
 * Compare two sets of validation metrics
 */
export function compareValidationMetrics(
  baseline: ValidationMetrics,
  improved: ValidationMetrics
): {
  improvement: {
    maeHome: number;
    maeAway: number;
    maeSpread: number;
    winnerAccuracy: number;
  };
  percentImprovement: {
    maeHome: number;
    maeAway: number;
    maeSpread: number;
    winnerAccuracy: number;
  };
} {
  const improvement = {
    maeHome: baseline.meanAbsoluteError.homeScore - improved.meanAbsoluteError.homeScore,
    maeAway: baseline.meanAbsoluteError.awayScore - improved.meanAbsoluteError.awayScore,
    maeSpread: baseline.meanAbsoluteError.spread - improved.meanAbsoluteError.spread,
    winnerAccuracy: improved.accuracy.winner - baseline.accuracy.winner,
  };
  
  const percentImprovement = {
    maeHome: (improvement.maeHome / baseline.meanAbsoluteError.homeScore) * 100,
    maeAway: (improvement.maeAway / baseline.meanAbsoluteError.awayScore) * 100,
    maeSpread: (improvement.maeSpread / baseline.meanAbsoluteError.spread) * 100,
    winnerAccuracy: improvement.winnerAccuracy,
  };
  
  return { improvement, percentImprovement };
}

