/**
 * Validation Dashboard / Performance Monitoring
 * 
 * Provides utilities for monitoring prediction performance over time
 * and identifying trends, biases, and areas for improvement.
 */

import { TrackedPrediction, getValidatedPredictions, getTrackingStats, StoredFavorableBet } from "./prediction-tracker";
import { ValidationMetrics, calculateValidationMetrics, PredictionValidation, validateGamePrediction, logValidationMetrics } from "./score-prediction-validator";

export interface PerformanceTrend {
  period: string; // e.g., "2024-01", "Last 7 days"
  metrics: ValidationMetrics;
  gameCount: number;
}

export interface FavorableBetPerformance {
  totalRecommendations: number;
  hitCount: number;
  hitRate: number;
  byType: { type: string; hit: number; total: number; rate: number }[];
}

export interface PerformanceReport {
  overall: ValidationMetrics;
  trends: PerformanceTrend[];
  recent: PerformanceTrend; // Last 7 days
  monthly: PerformanceTrend[]; // Last 3 months
  biases?: {
    homeTeamBias?: number; // Systematic over/under prediction for home teams
    awayTeamBias?: number;
    scoreBias?: number; // Systematic over/under prediction for total scores
  };
  favorableBetPerformance?: FavorableBetPerformance;
  bySport?: Record<string, ValidationMetrics>;
}

/**
 * Generate performance report from tracked predictions
 * @param days - Number of days to include in the report
 * @param sport - Optional sport filter (e.g., "basketball_ncaab")
 */
export async function generatePerformanceReport(days: number = 90, sport?: string): Promise<PerformanceReport> {
  const validated = await getValidatedPredictions(sport);
  
  // Filter to recent predictions
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const recentPredictions = validated.filter(p => p.predictedAt >= cutoff);
  
  if (recentPredictions.length === 0) {
    return {
      overall: {
        meanAbsoluteError: { homeScore: 0, awayScore: 0, spread: 0, total: 0 },
        rootMeanSquaredError: { homeScore: 0, awayScore: 0, spread: 0 },
        accuracy: { winner: 0, spreadWithin3: 0, spreadWithin5: 0 },
        gameCount: 0,
      },
      trends: [],
      recent: {
        period: `Last ${days} days`,
        metrics: {
          meanAbsoluteError: { homeScore: 0, awayScore: 0, spread: 0, total: 0 },
          rootMeanSquaredError: { homeScore: 0, awayScore: 0, spread: 0 },
          accuracy: { winner: 0, spreadWithin3: 0, spreadWithin5: 0 },
          gameCount: 0,
        },
        gameCount: 0,
      },
      monthly: [],
    };
  }
  
  // Convert to validations
  const validations = recentPredictions.map(tracked => {
    if (!tracked.actualOutcome) {
      throw new Error("Prediction marked as validated but missing actual outcome");
    }
    
    return validateGamePrediction(
      tracked.prediction,
      {
        homeScore: tracked.actualOutcome.homeScore,
        awayScore: tracked.actualOutcome.awayScore,
        homeTeam: tracked.homeTeam,
        awayTeam: tracked.awayTeam,
        gameId: parseInt(tracked.gameId),
        date: tracked.date,
      }
    );
  });
  
  // Overall metrics
  const overall = calculateValidationMetrics(validations);
  
  // Calculate trends (weekly)
  const trends: PerformanceTrend[] = [];
  const now = Date.now();
  const weeks = Math.min(12, Math.ceil(days / 7)); // Last 12 weeks
  
  for (let i = 0; i < weeks; i++) {
    const weekStart = now - ((i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = now - (i * 7 * 24 * 60 * 60 * 1000);
    
    const weekPredictions = validated.filter(p => 
      p.predictedAt >= weekStart && p.predictedAt < weekEnd
    );
    
    if (weekPredictions.length > 0) {
      const weekValidations = weekPredictions.map(tracked => {
        if (!tracked.actualOutcome) throw new Error("Missing outcome");
        return validateGamePrediction(tracked.prediction, {
          homeScore: tracked.actualOutcome.homeScore,
          awayScore: tracked.actualOutcome.awayScore,
          homeTeam: tracked.homeTeam,
          awayTeam: tracked.awayTeam,
          gameId: parseInt(tracked.gameId),
          date: tracked.date,
        });
      });
      
      trends.push({
        period: `Week ${weeks - i}`,
        metrics: calculateValidationMetrics(weekValidations),
        gameCount: weekPredictions.length,
      });
    }
  }
  
  // Recent (last 7 days)
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const recentPredictionsFiltered = validated.filter(p => p.predictedAt >= sevenDaysAgo);
  const recentValidations = recentPredictionsFiltered.map(tracked => {
    if (!tracked.actualOutcome) throw new Error("Missing outcome");
    return validateGamePrediction(tracked.prediction, {
      homeScore: tracked.actualOutcome.homeScore,
      awayScore: tracked.actualOutcome.awayScore,
      homeTeam: tracked.homeTeam,
      awayTeam: tracked.awayTeam,
      gameId: parseInt(tracked.gameId),
      date: tracked.date,
    });
  });
  
  // Monthly trends
  const monthly: PerformanceTrend[] = [];
  const months = Math.min(3, Math.ceil(days / 30));
  
  for (let i = 0; i < months; i++) {
    const monthStart = new Date(now);
    monthStart.setMonth(monthStart.getMonth() - (i + 1));
    const monthEnd = new Date(now);
    monthEnd.setMonth(monthEnd.getMonth() - i);
    
    const monthPredictions = validated.filter(p => {
      const predDate = new Date(p.predictedAt);
      return predDate >= monthStart && predDate < monthEnd;
    });
    
    if (monthPredictions.length > 0) {
      const monthValidations = monthPredictions.map(tracked => {
        if (!tracked.actualOutcome) throw new Error("Missing outcome");
        return validateGamePrediction(tracked.prediction, {
          homeScore: tracked.actualOutcome.homeScore,
          awayScore: tracked.actualOutcome.awayScore,
          homeTeam: tracked.homeTeam,
          awayTeam: tracked.awayTeam,
          gameId: parseInt(tracked.gameId),
          date: tracked.date,
        });
      });
      
      monthly.push({
        period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        metrics: calculateValidationMetrics(monthValidations),
        gameCount: monthPredictions.length,
      });
    }
  }
  
  // Detect biases
  const biases = detectBiases(validations);
  
  // Favorable bet performance (when favorableBets were recorded)
  const favorableBetPerformance = computeFavorableBetPerformance(recentPredictions);
  
  // Per-sport metrics
  const bySport = computePerSportMetrics(recentPredictions);
  
  return {
    overall,
    trends,
    recent: {
      period: "Last 7 days",
      metrics: calculateValidationMetrics(recentValidations),
      gameCount: recentPredictionsFiltered.length,
    },
    monthly,
    biases,
    favorableBetPerformance,
    bySport: Object.keys(bySport).length > 0 ? bySport : undefined,
  };
}

/**
 * Compute favorable bet hit rate from validated predictions with favorableBets
 */
function computeFavorableBetPerformance(predictions: TrackedPrediction[]): FavorableBetPerformance | undefined {
  const withBets = predictions.filter(
    p => p.actualOutcome && Array.isArray(p.favorableBets) && p.favorableBets.length > 0
  );
  if (withBets.length === 0) return undefined;
  
  let totalHit = 0;
  let totalRecs = 0;
  const byType: Record<string, { hit: number; total: number }> = {};
  
  for (const p of withBets) {
    const { homeScore, awayScore, winner } = p.actualOutcome!;
    const actualSpread = homeScore - awayScore;
    const actualTotal = homeScore + awayScore;
    
    for (const bet of p.favorableBets!) {
      const won = didFavorableBetWin(bet, winner, actualSpread, actualTotal);
      totalRecs++;
      if (won) totalHit++;
      
      const key = bet.type;
      if (!byType[key]) byType[key] = { hit: 0, total: 0 };
      byType[key].total++;
      if (won) byType[key].hit++;
    }
  }
  
  return {
    totalRecommendations: totalRecs,
    hitCount: totalHit,
    hitRate: totalRecs > 0 ? (totalHit / totalRecs) * 100 : 0,
    byType: Object.entries(byType).map(([type, { hit, total }]) => ({
      type,
      hit,
      total,
      rate: total > 0 ? (hit / total) * 100 : 0,
    })),
  };
}

function didFavorableBetWin(
  bet: StoredFavorableBet,
  actualWinner: "home" | "away",
  actualSpread: number,
  actualTotal: number
): boolean {
  if (bet.type === "moneyline") {
    const betHome = bet.team === "home";
    return (betHome && actualWinner === "home") || (!betHome && actualWinner === "away");
  }
  if (bet.type === "spread") {
    const betHome = bet.team === "home";
    const lineMatch = bet.recommendation.match(/(-?\d+\.?\d*)/);
    const line = lineMatch ? parseFloat(lineMatch[1]) : 0;
    if (betHome) {
      return actualSpread + line > 0;
    } else {
      return -actualSpread - line > 0;
    }
  }
  if (bet.type === "total") {
    const over = bet.recommendation.toLowerCase().includes("over");
    const lineMatch = bet.recommendation.match(/(\d+\.?\d*)/);
    const line = lineMatch ? parseFloat(lineMatch[1]) : actualTotal;
    return over ? actualTotal > line : actualTotal < line;
  }
  return false;
}

/**
 * Compute validation metrics per sport
 */
function computePerSportMetrics(predictions: TrackedPrediction[]): Record<string, ValidationMetrics> {
  const bySport: Record<string, PredictionValidation[]> = {};
  for (const p of predictions) {
    if (!p.actualOutcome) continue;
    const sport = p.sport || "unknown";
    if (!bySport[sport]) bySport[sport] = [];
    bySport[sport].push(
      validateGamePrediction(p.prediction, {
        homeScore: p.actualOutcome.homeScore,
        awayScore: p.actualOutcome.awayScore,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        gameId: parseInt(p.gameId),
        date: p.date,
      })
    );
  }
  const result: Record<string, ValidationMetrics> = {};
  for (const [sport, validations] of Object.entries(bySport)) {
    if (validations.length > 0) result[sport] = calculateValidationMetrics(validations);
  }
  return result;
}

/**
 * Detect systematic biases in predictions
 */
function detectBiases(validations: PredictionValidation[]): PerformanceReport['biases'] {
  if (validations.length === 0) return undefined;
  
  // Home team bias: average error in home score predictions
  const homeBias = validations.reduce((sum, v) => {
    const error = v.predictedScore.home - v.actualScore.home;
    return sum + error;
  }, 0) / validations.length;
  
  // Away team bias
  const awayBias = validations.reduce((sum, v) => {
    const error = v.predictedScore.away - v.actualScore.away;
    return sum + error;
  }, 0) / validations.length;
  
  // Total score bias
  const totalBias = validations.reduce((sum, v) => {
    const predictedTotal = v.predictedScore.home + v.predictedScore.away;
    const actualTotal = v.actualScore.home + v.actualScore.away;
    return sum + (predictedTotal - actualTotal);
  }, 0) / validations.length;
  
  return {
    homeTeamBias: Math.abs(homeBias) > 0.5 ? homeBias : undefined, // Only report if significant
    awayTeamBias: Math.abs(awayBias) > 0.5 ? awayBias : undefined,
    scoreBias: Math.abs(totalBias) > 1.0 ? totalBias : undefined,
  };
}

/**
 * Print performance report to console
 */
export async function printPerformanceReport(report: PerformanceReport): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("PREDICTION PERFORMANCE REPORT");
  console.log("=".repeat(60));
  
  console.log("\n📊 Overall Performance:");
  logValidationMetrics(report.overall);
  
  if (report.recent.gameCount > 0) {
    console.log("\n📈 Recent Performance (Last 7 Days):");
    logValidationMetrics(report.recent.metrics);
  }
  
  if (report.trends.length > 0) {
    console.log("\n📉 Performance Trends (Weekly):");
    console.log("-".repeat(60));
    console.log("Period".padEnd(12) + "Games".padEnd(8) + "Winner Acc".padEnd(12) + "Score MAE".padEnd(12) + "Spread MAE");
    console.log("-".repeat(60));
    
    for (const trend of report.trends.slice(0, 8).reverse()) { // Last 8 weeks
      console.log(
        trend.period.padEnd(12) +
        String(trend.gameCount).padEnd(8) +
        `${trend.metrics.accuracy.winner.toFixed(1)}%`.padEnd(12) +
        trend.metrics.meanAbsoluteError.total.toFixed(2).padEnd(12) +
        trend.metrics.meanAbsoluteError.spread.toFixed(2)
      );
    }
  }
  
  if (report.biases) {
    console.log("\n⚠️  Detected Biases:");
    if (report.biases.homeTeamBias) {
      console.log(`  Home Team: ${report.biases.homeTeamBias > 0 ? '+' : ''}${report.biases.homeTeamBias.toFixed(2)} points (${report.biases.homeTeamBias > 0 ? 'over' : 'under'}predicting)`);
    }
    if (report.biases.awayTeamBias) {
      console.log(`  Away Team: ${report.biases.awayTeamBias > 0 ? '+' : ''}${report.biases.awayTeamBias.toFixed(2)} points (${report.biases.awayTeamBias > 0 ? 'over' : 'under'}predicting)`);
    }
    if (report.biases.scoreBias) {
      console.log(`  Total Score: ${report.biases.scoreBias > 0 ? '+' : ''}${report.biases.scoreBias.toFixed(2)} points (${report.biases.scoreBias > 0 ? 'over' : 'under'}predicting)`);
    }
  }
  
  if (report.favorableBetPerformance) {
    const fb = report.favorableBetPerformance;
    console.log("\n📈 Favorable Bet Performance:");
    console.log(`  Total: ${fb.hitCount}/${fb.totalRecommendations} (${fb.hitRate.toFixed(1)}% hit rate)`);
    for (const t of fb.byType) {
      console.log(`  ${t.type}: ${t.hit}/${t.total} (${t.rate.toFixed(1)}%)`);
    }
  }
  
  if (report.bySport && Object.keys(report.bySport).length > 0) {
    console.log("\n🏀 Performance by Sport:");
    for (const [sport, metrics] of Object.entries(report.bySport)) {
      console.log(`  ${sport}: ${metrics.accuracy.winner.toFixed(1)}% winner, MAE ${metrics.meanAbsoluteError.total.toFixed(2)} (n=${metrics.gameCount})`);
    }
  }
  
  console.log("\n" + "=".repeat(60) + "\n");
}

/**
 * Check if performance is below threshold and needs attention
 */
export async function checkPerformanceAlert(report: PerformanceReport): Promise<{
  alert: boolean;
  message?: string;
  metrics: ValidationMetrics;
}> {
  const THRESHOLD_WINNER_ACC = 65; // Minimum acceptable winner accuracy
  const THRESHOLD_SCORE_MAE = 12; // Maximum acceptable score MAE
  const THRESHOLD_SPREAD_MAE = 10; // Maximum acceptable spread MAE
  
  const metrics = report.recent.metrics;
  
  if (metrics.gameCount < 10) {
    return { alert: false, metrics }; // Not enough data
  }
  
  const issues: string[] = [];
  
  if (metrics.accuracy.winner < THRESHOLD_WINNER_ACC) {
    issues.push(`Winner accuracy ${metrics.accuracy.winner.toFixed(1)}% below threshold ${THRESHOLD_WINNER_ACC}%`);
  }
  
  if (metrics.meanAbsoluteError.total > THRESHOLD_SCORE_MAE) {
    issues.push(`Score MAE ${metrics.meanAbsoluteError.total.toFixed(2)} above threshold ${THRESHOLD_SCORE_MAE}`);
  }
  
  if (metrics.meanAbsoluteError.spread > THRESHOLD_SPREAD_MAE) {
    issues.push(`Spread MAE ${metrics.meanAbsoluteError.spread.toFixed(2)} above threshold ${THRESHOLD_SPREAD_MAE}`);
  }
  
  if (issues.length > 0) {
    return {
      alert: true,
      message: `Performance below threshold: ${issues.join(', ')}`,
      metrics,
    };
  }
  
  return { alert: false, metrics };
}

