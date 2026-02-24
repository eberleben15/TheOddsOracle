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
  // Market lines for ATS/O-U calculation
  marketSpread?: number; // The spread we bet against (closing line or opening)
  marketTotal?: number; // The over/under line
  predictedTotal?: number; // Our predicted total
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
  // ATS (Against The Spread) performance - critical for betting
  ats?: {
    wins: number;
    losses: number;
    pushes: number;
    winRate: number; // Percentage (excludes pushes)
    record: string; // e.g., "45-38-2"
  };
  // Over/Under performance
  overUnder?: {
    overWins: number;
    underWins: number;
    pushes: number;
    overWinRate: number; // % of overs that hit (legacy: of correct picks, % that were overs)
    totalAccuracy: number; // % of total predictions correct
    // Actionable: hit rate when we picked over vs under
    overPickAccuracy: number; // When we picked over, % correct
    underPickAccuracy: number; // When we picked under, % correct
    overPickCount: number;
    underPickCount: number;
  };
  // Performance by category
  categories?: {
    // Home vs Away picks
    homePickWinRate: number;
    homePickCount: number;
    awayPickWinRate: number;
    awayPickCount: number;
    // Favorites vs Underdogs (based on predicted spread magnitude)
    favoriteWinRate: number; // When we pick >3pt favorite
    favoriteCount: number;
    underdogWinRate: number; // When we pick underdog or <3pt favorite
    underdogCount: number;
    // By confidence tier
    highConfidence: { winRate: number; count: number }; // 75%+
    mediumConfidence: { winRate: number; count: number }; // 60-75%
    lowConfidence: { winRate: number; count: number }; // <60%
    // Close games vs blowouts
    closeGameWinRate: number; // Actual margin <= 5
    closeGameCount: number;
    blowoutWinRate: number; // Actual margin > 10
    blowoutCount: number;
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
    predictedTotal?: number; // Explicit total if different from sum of scores
  },
  actual: {
    homeScore: number;
    awayScore: number;
    homeTeam: string;
    awayTeam: string;
    gameId: number;
    date: string;
    marketSpread?: number; // Closing/opening line for ATS calculation
    marketTotal?: number; // Over/Under line for O/U calculation
  }
): PredictionValidation {
  const actualSpread = actual.homeScore - actual.awayScore;
  const actualWinner = actual.homeScore > actual.awayScore ? 'home' : 'away';
  const predictedWinner = prediction.predictedSpread > 0 ? 'home' : 'away';
  
  const homeScoreError = Math.abs(prediction.predictedScore.home - actual.homeScore);
  const awayScoreError = Math.abs(prediction.predictedScore.away - actual.awayScore);
  const spreadError = Math.abs(prediction.predictedSpread - actualSpread);
  const totalError = homeScoreError + awayScoreError;
  
  // Calculate predicted total
  const predictedTotal = prediction.predictedTotal ?? 
    (prediction.predictedScore.home + prediction.predictedScore.away);
  
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
    marketSpread: actual.marketSpread,
    marketTotal: actual.marketTotal,
    predictedTotal,
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

  // === ATS (Against The Spread) Performance ===
  // Use predicted spread vs actual margin to determine if we "covered"
  // If we predict home -5 and actual margin is home -7, we covered (home covered by more)
  // If market spread available, use that instead for true ATS
  let atsWins = 0;
  let atsLosses = 0;
  let atsPushes = 0;
  
  for (const v of validations) {
    // Determine if we bet on home or away based on our prediction
    const betOnHome = v.predictedSpread > 0;
    const ourLine = v.predictedSpread; // Our format: positive = home favored

    // Use market spread if available, otherwise use our predicted spread.
    // Odds API uses negative = home favored; our format uses positive = home favored.
    // Normalize to our format so cover formulas work: lineInOurFormat = home margin threshold.
    const lineInOurFormat =
      v.marketSpread != null ? -v.marketSpread : ourLine;

    // Actual margin from home perspective (positive = home won by this much)
    const actualMargin = v.actualSpread;

    // For ATS: did we cover?
    // If betting home at -5: home needs to win by MORE than 5 to cover (actualMargin > 5)
    // If betting away at +5: away covers when actualMargin < 5
    if (betOnHome) {
      const homeCover = actualMargin - lineInOurFormat; // >0 means home covered
      if (homeCover > 0) atsWins++;
      else if (homeCover < 0) atsLosses++;
      else atsPushes++;
    } else {
      const awayCover = lineInOurFormat - actualMargin; // >0 means away covered
      if (awayCover > 0) atsWins++;
      else if (awayCover < 0) atsLosses++;
      else atsPushes++;
    }
  }
  
  const atsGamesDecided = atsWins + atsLosses;
  const atsWinRate = atsGamesDecided > 0 ? (atsWins / atsGamesDecided) * 100 : 0;
  const ats = {
    wins: atsWins,
    losses: atsLosses,
    pushes: atsPushes,
    winRate: atsWinRate,
    record: `${atsWins}-${atsLosses}-${atsPushes}`,
  };

  // === Over/Under Performance ===
  const validationsWithTotal = validations.filter(v => v.predictedTotal != null);
  let overWins = 0;
  let underWins = 0;
  let ouPushes = 0;
  let overPickCorrect = 0;
  let overPickTotal = 0;
  let underPickCorrect = 0;
  let underPickTotal = 0;

  for (const v of validationsWithTotal) {
    const predictedTotal = v.predictedTotal!;
    const actualTotal = v.actualScore.home + v.actualScore.away;
    const marketLine = v.marketTotal ?? predictedTotal;

    // Did we predict over or under the market line?
    const predictedOver = predictedTotal > marketLine;
    const predictedUnder = predictedTotal < marketLine;
    const actualOver = actualTotal > marketLine;
    const isPush = actualTotal === marketLine;

    if (isPush) {
      ouPushes++;
    } else if (predictedOver === actualOver) {
      if (actualOver) overWins++;
      else underWins++;
    }

    // Actionable: hit rate when we picked over vs under
    if (predictedOver) {
      overPickTotal++;
      if (actualOver) overPickCorrect++;
    } else if (predictedUnder) {
      underPickTotal++;
      if (!actualOver) underPickCorrect++;
    }
  }

  const ouGamesDecided = overWins + underWins;
  const overUnder = validationsWithTotal.length > 0 ? {
    overWins,
    underWins,
    pushes: ouPushes,
    overWinRate: ouGamesDecided > 0 ? (overWins / ouGamesDecided) * 100 : 50,
    totalAccuracy: ouGamesDecided > 0 ? (ouGamesDecided / validationsWithTotal.length) * 100 : 0,
    overPickAccuracy: overPickTotal > 0 ? (overPickCorrect / overPickTotal) * 100 : 0,
    underPickAccuracy: underPickTotal > 0 ? (underPickCorrect / underPickTotal) * 100 : 0,
    overPickCount: overPickTotal,
    underPickCount: underPickTotal,
  } : undefined;

  // === Performance by Category ===
  // Home vs Away picks
  const homePicks = validations.filter(v => v.predictedSpread > 0);
  const awayPicks = validations.filter(v => v.predictedSpread <= 0);
  
  const homePickWins = homePicks.filter(v => v.actualWinner === 'home').length;
  const awayPickWins = awayPicks.filter(v => v.actualWinner === 'away').length;
  
  // Favorites vs Underdogs (magnitude of predicted spread)
  const FAVORITE_THRESHOLD = 3; // >3 points = clear favorite pick
  const favoritePicks = validations.filter(v => Math.abs(v.predictedSpread) > FAVORITE_THRESHOLD);
  const underdogPicks = validations.filter(v => Math.abs(v.predictedSpread) <= FAVORITE_THRESHOLD);
  
  const favoriteWins = favoritePicks.filter(v => {
    const predictedWinner = v.predictedSpread > 0 ? 'home' : 'away';
    return predictedWinner === v.actualWinner;
  }).length;
  
  const underdogWins = underdogPicks.filter(v => {
    const predictedWinner = v.predictedSpread > 0 ? 'home' : 'away';
    return predictedWinner === v.actualWinner;
  }).length;

  // By confidence tier
  const MEDIUM_CONF_THRESHOLD = 60;
  const highConf = validations.filter(v => (v.confidence ?? 0) >= HIGH_CONFIDENCE_THRESHOLD);
  const mediumConf = validations.filter(v => (v.confidence ?? 0) >= MEDIUM_CONF_THRESHOLD && (v.confidence ?? 0) < HIGH_CONFIDENCE_THRESHOLD);
  const lowConf = validations.filter(v => (v.confidence ?? 0) < MEDIUM_CONF_THRESHOLD);
  
  const calcTierWinRate = (tier: PredictionValidation[]) => {
    if (tier.length === 0) return 0;
    const wins = tier.filter(v => {
      const predictedWinner = v.predictedSpread > 0 ? 'home' : 'away';
      return predictedWinner === v.actualWinner;
    }).length;
    return (wins / tier.length) * 100;
  };

  // Close games vs blowouts (based on ACTUAL margin)
  const CLOSE_GAME_MARGIN = 5;
  const BLOWOUT_MARGIN = 10;
  const closeGames = validations.filter(v => Math.abs(v.actualSpread) <= CLOSE_GAME_MARGIN);
  const blowouts = validations.filter(v => Math.abs(v.actualSpread) > BLOWOUT_MARGIN);
  
  const closeGameWins = closeGames.filter(v => {
    const predictedWinner = v.predictedSpread > 0 ? 'home' : 'away';
    return predictedWinner === v.actualWinner;
  }).length;
  
  const blowoutWins = blowouts.filter(v => {
    const predictedWinner = v.predictedSpread > 0 ? 'home' : 'away';
    return predictedWinner === v.actualWinner;
  }).length;

  const categories = {
    homePickWinRate: homePicks.length > 0 ? (homePickWins / homePicks.length) * 100 : 0,
    homePickCount: homePicks.length,
    awayPickWinRate: awayPicks.length > 0 ? (awayPickWins / awayPicks.length) * 100 : 0,
    awayPickCount: awayPicks.length,
    favoriteWinRate: favoritePicks.length > 0 ? (favoriteWins / favoritePicks.length) * 100 : 0,
    favoriteCount: favoritePicks.length,
    underdogWinRate: underdogPicks.length > 0 ? (underdogWins / underdogPicks.length) * 100 : 0,
    underdogCount: underdogPicks.length,
    highConfidence: { winRate: calcTierWinRate(highConf), count: highConf.length },
    mediumConfidence: { winRate: calcTierWinRate(mediumConf), count: mediumConf.length },
    lowConfidence: { winRate: calcTierWinRate(lowConf), count: lowConf.length },
    closeGameWinRate: closeGames.length > 0 ? (closeGameWins / closeGames.length) * 100 : 0,
    closeGameCount: closeGames.length,
    blowoutWinRate: blowouts.length > 0 ? (blowoutWins / blowouts.length) * 100 : 0,
    blowoutCount: blowouts.length,
  };

  // Calibration: bin by predicted home win prob (0-100), compare to actual win rate
  const CALIBRATION_BINS = [
    { min: 48, max: 52, label: '~50%' },
    { min: 52, max: 60, label: '52-60%' },
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
    ats,
    overUnder,
    categories,
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
 * Validate a single game prediction against actual result.
 * Makes a prediction from team stats and validates it against the actual game result.
 */
export function validateSingleGamePrediction(
  game: GameResult,
  homeStats: TeamStats,
  awayStats: TeamStats,
  homeTeamName: string,
  awayTeamName: string
): PredictionValidation {
  const homeAnalytics = calculateTeamAnalytics(homeStats, homeStats.recentGames || [], true);
  const awayAnalytics = calculateTeamAnalytics(awayStats, awayStats.recentGames || [], false);
  const prediction = predictMatchup(awayAnalytics, homeAnalytics, awayStats, homeStats);

  const actual = {
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    gameId: game.id,
    date: game.date,
  };

  return validateGamePrediction(prediction, actual);
}

/**
 * Validate predictions for multiple historical games.
 * Thin wrapper that loops over games and calls validateSingleGamePrediction for each.
 */
export function validateHistoricalPredictions(
  games: GameResult[],
  homeStats: TeamStats,
  awayStats: TeamStats,
  homeTeamName: string,
  awayTeamName: string
): PredictionValidation[] {
  return games.map((game) =>
    validateSingleGamePrediction(game, homeStats, awayStats, homeTeamName, awayTeamName)
  );
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

