/**
 * Monte Carlo Simulation
 * 
 * Generates score distributions and better uncertainty estimates
 * by simulating game outcomes thousands of times.
 */

import { VarianceModel, getStandardDeviationForPrediction } from "./variance-estimation";
import { MatchupPrediction } from "./advanced-analytics";

export interface SimulationResult {
  // Predicted scores with uncertainty
  homeScore: {
    mean: number;
    median: number;
    stdDev: number;
    range: { min: number; max: number };
    percentiles: {
      p10: number; // 10th percentile
      p25: number;
      p75: number;
      p90: number;
    };
  };
  awayScore: {
    mean: number;
    median: number;
    stdDev: number;
    range: { min: number; max: number };
    percentiles: {
      p10: number;
      p25: number;
      p75: number;
      p90: number;
    };
  };
  
  // Win probabilities (from simulations)
  winProbability: {
    home: number;
    away: number;
  };
  
  // Spread distribution
  spread: {
    mean: number;
    median: number;
    stdDev: number;
    range: { min: number; max: number };
  };
  
  // Total score distribution
  total: {
    mean: number;
    median: number;
    stdDev: number;
    range: { min: number; max: number };
  };
  
  // Confidence intervals
  confidenceIntervals: {
    homeScore: { lower: number; upper: number }; // 80% CI
    awayScore: { lower: number; upper: number };
    spread: { lower: number; upper: number };
    total: { lower: number; upper: number };
  };
  
  simulationCount: number;
}

/**
 * Generate random number from normal distribution (Box-Muller transform)
 */
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Clamp score to realistic college basketball range
 */
function clampScore(score: number): number {
  return Math.max(40, Math.min(120, score));
}

/**
 * Run Monte Carlo simulation for a prediction
 */
export function runMonteCarloSimulation(
  prediction: MatchupPrediction,
  varianceModel: VarianceModel,
  numSimulations: number = 10000
): SimulationResult {
  const homeMean = prediction.predictedScore.home;
  const awayMean = prediction.predictedScore.away;
  
  // Get standard deviations for both teams
  const homeStdDev = getStandardDeviationForPrediction(
    varianceModel,
    prediction.predictedScore,
    prediction.predictedSpread
  );
  const awayStdDev = getStandardDeviationForPrediction(
    varianceModel,
    prediction.predictedScore,
    -prediction.predictedSpread // Reverse spread for away team
  );
  
  // Run simulations
  const homeScores: number[] = [];
  const awayScores: number[] = [];
  const spreads: number[] = [];
  const totals: number[] = [];
  const homeWins = { count: 0 };
  
  for (let i = 0; i < numSimulations; i++) {
    // Sample from normal distribution
    let homeScore = randomNormal(homeMean, homeStdDev);
    let awayScore = randomNormal(awayMean, awayStdDev);
    
    // Clamp to realistic ranges
    homeScore = clampScore(homeScore);
    awayScore = clampScore(awayScore);
    
    homeScores.push(homeScore);
    awayScores.push(awayScore);
    spreads.push(homeScore - awayScore);
    totals.push(homeScore + awayScore);
    
    if (homeScore > awayScore) {
      homeWins.count++;
    }
  }
  
  // Sort for percentile calculations
  homeScores.sort((a, b) => a - b);
  awayScores.sort((a, b) => a - b);
  spreads.sort((a, b) => a - b);
  totals.sort((a, b) => a - b);
  
  // Calculate statistics
  function calculateStats(values: number[]): {
    mean: number;
    median: number;
    stdDev: number;
    range: { min: number; max: number };
    percentiles: { p10: number; p25: number; p75: number; p90: number };
  } {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const median = values[Math.floor(values.length / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      median,
      stdDev,
      range: {
        min: values[0],
        max: values[values.length - 1],
      },
      percentiles: {
        p10: values[Math.floor(values.length * 0.1)],
        p25: values[Math.floor(values.length * 0.25)],
        p75: values[Math.floor(values.length * 0.75)],
        p90: values[Math.floor(values.length * 0.9)],
      },
    };
  }
  
  const homeStats = calculateStats(homeScores);
  const awayStats = calculateStats(awayScores);
  const spreadStats = calculateStats(spreads);
  const totalStats = calculateStats(totals);
  
  // Calculate confidence intervals (80% CI: 10th to 90th percentile)
  const confidenceIntervals = {
    homeScore: {
      lower: homeStats.percentiles.p10,
      upper: homeStats.percentiles.p90,
    },
    awayScore: {
      lower: awayStats.percentiles.p10,
      upper: awayStats.percentiles.p90,
    },
    spread: {
      lower: spreadStats.percentiles.p10,
      upper: spreadStats.percentiles.p90,
    },
    total: {
      lower: totalStats.percentiles.p10,
      upper: totalStats.percentiles.p90,
    },
  };
  
  return {
    homeScore: homeStats,
    awayScore: awayStats,
    winProbability: {
      home: homeWins.count / numSimulations,
      away: 1 - (homeWins.count / numSimulations),
    },
    spread: spreadStats,
    total: totalStats,
    confidenceIntervals,
    simulationCount: numSimulations,
  };
}

/**
 * Get score range as string (e.g., "68-82 points")
 */
export function formatScoreRange(simulation: SimulationResult, team: 'home' | 'away'): string {
  const stats = team === 'home' ? simulation.homeScore : simulation.awayScore;
  return `${Math.round(stats.percentiles.p25)}-${Math.round(stats.percentiles.p75)} points`;
}

/**
 * Get confidence interval as string
 */
export function formatConfidenceInterval(simulation: SimulationResult, metric: 'homeScore' | 'awayScore' | 'spread' | 'total'): string {
  const ci = simulation.confidenceIntervals[metric];
  if (metric === 'spread') {
    const sign = ci.lower >= 0 ? '+' : '';
    return `${sign}${Math.round(ci.lower)} to ${ci.upper >= 0 ? '+' : ''}${Math.round(ci.upper)}`;
  }
  return `${Math.round(ci.lower)} to ${Math.round(ci.upper)}`;
}

