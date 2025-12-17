/**
 * Advanced Team Analytics Engine (Phase 3)
 * 
 * Sophisticated statistical analysis and predictions for betting insights.
 * Uses multiple factors to calculate win probabilities, value bets, and trends.
 */

import { TeamStats, GameResult } from "@/types";

export interface TeamAnalytics {
  // Overall strength metrics
  offensiveRating: number; // Points scored relative to league average
  defensiveRating: number; // Points allowed relative to league average
  netRating: number; // Overall team strength
  
  // Efficiency metrics
  offensiveEfficiency: number; // Points per possession estimate
  defensiveEfficiency: number; // Opponent points per possession
  
  // Momentum & trends
  momentum: number; // -100 to +100 based on recent performance
  winStreak: number; // Current win streak (negative for losses)
  recentForm: string; // e.g., "W-W-L-W-W"
  last5Record: { wins: number; losses: number };
  
  // Advanced shooting metrics
  shootingEfficiency: number; // Combined FG%, 3P%, FT% weighted score
  threePointThreat: number; // 3P% relative to average
  freeThrowReliability: number; // FT% score
  
  // Rebounding & hustle
  reboundingAdvantage: number; // Rebounds per game vs average
  assistToTurnoverRatio: number; // Playmaking efficiency
  
  // Consistency
  consistency: number; // How consistent team performs (0-100)
  
  // Situational
  homeAdvantage?: number; // Estimated home court boost
}

export interface MatchupPrediction {
  winProbability: {
    away: number;
    home: number;
  };
  predictedScore: {
    away: number;
    home: number;
  };
  predictedSpread: number; // Positive = home favored
  confidence: number; // 0-100 prediction confidence
  keyFactors: string[]; // What drives the prediction
  valueBets: {
    type: 'moneyline' | 'spread' | 'total';
    recommendation: string;
    confidence: number;
    reason: string;
  }[];
}

/**
 * Calculate comprehensive team analytics
 */
export function calculateTeamAnalytics(
  stats: TeamStats,
  recentGames: GameResult[],
  isHome: boolean = false
): TeamAnalytics {
  // DEBUG: Log incoming stats
  console.log(`[ANALYTICS] Input for ${stats.name}:`, {
    offensiveEfficiency: stats.offensiveEfficiency,
    defensiveEfficiency: stats.defensiveEfficiency,
    pointsPerGame: stats.pointsPerGame,
    pointsAllowedPerGame: stats.pointsAllowedPerGame,
    recentGamesCount: recentGames.length,
  });
  
  // League averages for NCAA Basketball
  const LEAGUE_AVG_PPG = 75.0;
  const LEAGUE_AVG_FG = 45.0;
  const LEAGUE_AVG_3P = 35.0;
  const LEAGUE_AVG_FT = 72.0;
  const LEAGUE_AVG_REB = 36.0;
  
  // Use actual efficiency ratings from SportsData.io if available, otherwise calculate estimates
  // Offensive/Defensive ratings (per 100 possessions)
  const offensiveRating = stats.offensiveEfficiency ?? ((stats.pointsPerGame || 75) / LEAGUE_AVG_PPG) * 100;
  const defensiveRating = stats.defensiveEfficiency ?? ((stats.pointsAllowedPerGame || 75) / LEAGUE_AVG_PPG) * 100;
  const netRating = offensiveRating - defensiveRating;
  
  // DEBUG: Log calculated values
  console.log(`[ANALYTICS] Calculated for ${stats.name}:`, {
    offensiveRating,
    defensiveRating,
    netRating,
  });
  
  // Efficiency estimates (use actual if available from SportsData.io)
  const offensiveEfficiency = stats.offensiveEfficiency ?? ((stats.pointsPerGame || 75) * 1.05);
  const defensiveEfficiency = stats.defensiveEfficiency ?? ((stats.pointsAllowedPerGame || 75) * 1.05);
  
  // Momentum calculation from recent games
  const momentum = calculateMomentum(recentGames, stats.name);
  const { winStreak, recentForm, last5Record } = analyzeRecentForm(recentGames, stats.name);
  
  // Shooting efficiency (weighted: FG%=50%, 3P%=30%, FT%=20%)
  // Convert from decimal (0.45) to percentage (45) if needed
  const fgPct = (stats.fieldGoalPercentage || 0) > 1 ? stats.fieldGoalPercentage : (stats.fieldGoalPercentage || 0) * 100;
  const tpPct = (stats.threePointPercentage || 0) > 1 ? stats.threePointPercentage : (stats.threePointPercentage || 0) * 100;
  const ftPct = (stats.freeThrowPercentage || 0) > 1 ? stats.freeThrowPercentage : (stats.freeThrowPercentage || 0) * 100;
  
  const fgScore = ((fgPct || LEAGUE_AVG_FG) / LEAGUE_AVG_FG) * 50;
  const tpScore = ((tpPct || LEAGUE_AVG_3P) / LEAGUE_AVG_3P) * 30;
  const ftScore = ((ftPct || LEAGUE_AVG_FT) / LEAGUE_AVG_FT) * 20;
  const shootingEfficiency = fgScore + tpScore + ftScore;
  
  // Three-point threat
  const threePointThreat = ((tpPct || LEAGUE_AVG_3P) / LEAGUE_AVG_3P) * 100;
  
  // Free throw reliability
  const freeThrowReliability = ((ftPct || LEAGUE_AVG_FT) / LEAGUE_AVG_FT) * 100;
  
  // Rebounding advantage
  const reboundingAdvantage = ((stats.reboundsPerGame || LEAGUE_AVG_REB) / LEAGUE_AVG_REB) * 100;
  
  // Assist-to-turnover ratio (use actual if available, otherwise calculate)
  const assistToTurnoverRatio = stats.assistTurnoverRatio ?? 
    ((stats.assistsPerGame || 12) / Math.max(stats.turnoversPerGame || 12, 1));
  
  // Consistency score
  const consistency = calculateConsistency(recentGames);
  
  // Home advantage (typically 3-4 points in college basketball)
  const homeAdvantage = isHome ? 3.5 : 0;
  
  return {
    offensiveRating,
    defensiveRating,
    netRating,
    offensiveEfficiency,
    defensiveEfficiency,
    momentum,
    winStreak,
    recentForm,
    last5Record,
    shootingEfficiency,
    threePointThreat,
    freeThrowReliability,
    reboundingAdvantage,
    assistToTurnoverRatio,
    consistency,
    homeAdvantage,
  };
}

/**
 * Check if a team name matches a game participant
 * Handles various name formats: full name, first word, team key
 */
function teamMatchesGame(teamName: string, gameTeamName: string, gameTeamKey?: string): boolean {
  if (!teamName || !gameTeamName) return false;
  
  const teamNameLower = teamName.toLowerCase();
  const gameTeamLower = gameTeamName.toLowerCase();
  
  // Exact match
  if (teamNameLower === gameTeamLower) return true;
  
  // First word match (e.g., "Wisconsin" matches "Wisconsin Badgers")
  const teamFirstWord = teamNameLower.split(' ')[0];
  const gameFirstWord = gameTeamLower.split(' ')[0];
  if (teamFirstWord === gameFirstWord) return true;
  
  // Team key match (e.g., "WIS" matches "Wisconsin")
  if (gameTeamKey && teamNameLower.includes(gameTeamKey.toLowerCase())) return true;
  
  // Partial match
  if (gameTeamLower.includes(teamFirstWord) || teamNameLower.includes(gameFirstWord)) return true;
  
  return false;
}

/**
 * Calculate team momentum based on recent performance
 */
function calculateMomentum(games: GameResult[], teamName: string): number {
  if (games.length === 0) return 0;
  
  let momentum = 0;
  const recentGames = games.slice(0, 5); // Last 5 games
  
  recentGames.forEach((game, index) => {
    const weight = (5 - index) / 5; // More recent = higher weight
    
    // Check if this team won - use both winner name and key for matching
    const isWin = teamMatchesGame(teamName, game.winner, game.winnerKey);
    
    // Determine if this team was home or away
    const isHome = teamMatchesGame(teamName, game.homeTeam, game.homeTeamKey);
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;
    const margin = Math.abs(teamScore - oppScore);
    
    if (isWin) {
      // Win momentum
      momentum += (20 + Math.min(margin, 20)) * weight; // 20-40 points per win
    } else {
      // Loss momentum (negative)
      momentum -= (20 + Math.min(margin, 20)) * weight; // -20 to -40 per loss
    }
  });
  
  // Normalize to -100 to +100
  return Math.max(-100, Math.min(100, momentum));
}

/**
 * Analyze recent form and streaks
 */
function analyzeRecentForm(games: GameResult[], teamName: string): {
  winStreak: number;
  recentForm: string;
  last5Record: { wins: number; losses: number };
} {
  if (games.length === 0) {
    return { winStreak: 0, recentForm: '', last5Record: { wins: 0, losses: 0 } };
  }
  
  let winStreak = 0;
  let recentForm = '';
  let wins = 0;
  let losses = 0;
  
  const recentGames = games.slice(0, 5);
  
  for (let i = 0; i < recentGames.length; i++) {
    const game = recentGames[i];
    // Use improved matching that handles full names, first words, and keys
    const isWin = teamMatchesGame(teamName, game.winner, game.winnerKey);
    
    // Build form string
    recentForm += isWin ? 'W' : 'L';
    if (i < recentGames.length - 1) recentForm += '-';
    
    // Count record
    if (isWin) wins++;
    else losses++;
    
    // Calculate streak (only most recent)
    if (i === 0) {
      winStreak = isWin ? 1 : -1;
      for (let j = 1; j < recentGames.length; j++) {
        const nextWin = teamMatchesGame(teamName, recentGames[j].winner, recentGames[j].winnerKey);
        if (nextWin === isWin) {
          winStreak += isWin ? 1 : -1;
        } else {
          break;
        }
      }
    }
  }
  
  return {
    winStreak,
    recentForm,
    last5Record: { wins, losses },
  };
}

/**
 * Calculate performance consistency
 */
function calculateConsistency(games: GameResult[]): number {
  if (games.length < 3) return 50; // Not enough data
  
  const margins = games.slice(0, 10).map(game => {
    return Math.abs(game.homeScore - game.awayScore);
  });
  
  if (margins.length === 0) return 50;
  
  const avgMargin = margins.reduce((a, b) => a + b, 0) / margins.length;
  const variance = margins.reduce((sum, margin) => {
    return sum + Math.pow(margin - avgMargin, 2);
  }, 0) / margins.length;
  
  const standardDeviation = Math.sqrt(variance);
  
  // Lower standard deviation = higher consistency
  // Typical SD for close games is 8-12 points
  const consistencyScore = Math.max(0, Math.min(100, 100 - (standardDeviation * 5)));
  
  return consistencyScore;
}

/**
 * Predict matchup outcome using Four Factors Model (Dean Oliver)
 * Industry-standard methodology for basketball predictions
 */
export function predictMatchup(
  awayAnalytics: TeamAnalytics,
  homeAnalytics: TeamAnalytics,
  awayStats: TeamStats,
  homeStats: TeamStats
): MatchupPrediction {
  // Use Four Factors if available (from SportsData.io)
  const hasFourFactors = awayStats.effectiveFieldGoalPercentage && homeStats.effectiveFieldGoalPercentage;
  
  let totalScore = 0;
  let keyFactors: string[] = [];
  
  if (hasFourFactors) {
    // FOUR FACTORS MODEL (Industry Standard)
    // Reference: Basketball on Paper by Dean Oliver
    
    // 1. Effective Field Goal % (40% weight - MOST IMPORTANT)
    const efgDiff = (homeStats.effectiveFieldGoalPercentage || 0) - (awayStats.effectiveFieldGoalPercentage || 0);
    const efgScore = efgDiff * 0.40 * 100; // Scale to points
    
    // 2. Turnover Rate (25% weight - lower is better)
    const tovDiff = (awayStats.turnoverRate || 0) - (homeStats.turnoverRate || 0); // Reversed (lower TOV is good)
    const tovScore = tovDiff * 0.25 * 50; // Scale to points
    
    // 3. Offensive Rebound Rate (20% weight)
    const orbDiff = (homeStats.offensiveReboundRate || 0) - (awayStats.offensiveReboundRate || 0);
    const orbScore = orbDiff * 0.20 * 75; // Scale to points
    
    // 4. Free Throw Rate (15% weight)
    const ftrDiff = (homeStats.freeThrowRate || 0) - (awayStats.freeThrowRate || 0);
    const ftrScore = ftrDiff * 0.15 * 60; // Scale to points
    
    // Combine Four Factors
    const fourFactorsScore = efgScore + tovScore + orbScore + ftrScore;
    
    // Add tempo/efficiency adjustment if available
    let tempoAdjustment = 0;
    if (homeStats.pace && awayStats.pace && homeStats.offensiveEfficiency && awayStats.offensiveEfficiency) {
      const expectedPace = (homeStats.pace + awayStats.pace) / 2;
      const efficiencyDiff = (homeStats.offensiveEfficiency || 0) - (awayStats.defensiveEfficiency || 0) -
                             ((awayStats.offensiveEfficiency || 0) - (homeStats.defensiveEfficiency || 0));
      tempoAdjustment = (efficiencyDiff / 100) * (expectedPace / 70) * 3; // Scale by pace
    }
    
    // Home court advantage (3.5 points standard in college basketball)
    const homeAdvantage = 3.5;
    
    // Momentum (smaller weight with Four Factors)
    const momentumScore = ((homeAnalytics.momentum - awayAnalytics.momentum) / 200) * 2;
    
    totalScore = fourFactorsScore + tempoAdjustment + homeAdvantage + momentumScore;
    
    // Identify key factors
    if (Math.abs(efgDiff) > 3) {
      keyFactors.push(`${efgDiff > 0 ? homeStats.name : awayStats.name} has ${Math.abs(efgDiff).toFixed(1)}% better eFG% (40% of prediction)`);
    }
    if (Math.abs(tovDiff) > 2) {
      keyFactors.push(`${tovDiff > 0 ? homeStats.name : awayStats.name} turns ball over ${Math.abs(tovDiff).toFixed(1)}% less (25% of prediction)`);
    }
    if (Math.abs(orbDiff) > 3) {
      keyFactors.push(`${orbDiff > 0 ? homeStats.name : awayStats.name} has ${Math.abs(orbDiff).toFixed(1)}% better ORB% (20% of prediction)`);
    }
    if (homeStats.pace && awayStats.pace) {
      const expectedPace = (homeStats.pace + awayStats.pace) / 2;
      keyFactors.push(`Expected pace: ${expectedPace.toFixed(1)} possessions (${expectedPace > 72 ? 'fast' : expectedPace > 68 ? 'average' : 'slow'})`);
    }
    
  } else {
    // FALLBACK: Basic model without Four Factors
    const factors = {
      // Net rating difference (40% weight)
      netRating: (homeAnalytics.netRating - awayAnalytics.netRating) * 0.4,
      
      // Offensive vs Defensive matchup (30% weight)
      matchup: ((homeAnalytics.offensiveRating - awayAnalytics.defensiveRating) -
                (awayAnalytics.offensiveRating - homeAnalytics.defensiveRating)) * 0.3,
      
      // Momentum difference (15% weight)
      momentum: ((homeAnalytics.momentum - awayAnalytics.momentum) / 200) * 15,
      
      // Home court advantage (15% weight)
      home: (homeAnalytics.homeAdvantage || 0) * 0.15,
    };
    
    totalScore = Object.values(factors).reduce((a, b) => a + b, 0);
    
    // Identify key factors
    if (Math.abs(factors.netRating) > 5) {
      keyFactors.push(`${factors.netRating > 0 ? homeStats.name : awayStats.name} has superior overall rating`);
    }
    if (Math.abs(factors.momentum) > 3) {
      keyFactors.push(`${factors.momentum > 0 ? homeStats.name : awayStats.name} has strong momentum`);
    }
    if (homeAnalytics.shootingEfficiency > awayAnalytics.shootingEfficiency + 10) {
      keyFactors.push(`${homeStats.name} has better shooting efficiency`);
    } else if (awayAnalytics.shootingEfficiency > homeAnalytics.shootingEfficiency + 10) {
      keyFactors.push(`${awayStats.name} has better shooting efficiency`);
    }
  }
  
  // Convert to win probability (using logistic function calibrated for college basketball)
  const homeWinProb = 1 / (1 + Math.exp(-totalScore / 8));
  const awayWinProb = 1 - homeWinProb;
  
  // Predict scores using tempo-free approach if data available
  let homePredicted: number;
  let awayPredicted: number;
  
  if (homeStats.pace && awayStats.pace && homeStats.offensiveEfficiency && awayStats.offensiveEfficiency) {
    // ADVANCED: Use efficiency ratings and pace
    const expectedPace = (homeStats.pace + awayStats.pace) / 2;
    
    // Points = (Offensive Efficiency) * (Pace / 100)
    homePredicted = (homeStats.offensiveEfficiency / 100) * expectedPace + 3.5; // +3.5 home court
    awayPredicted = (awayStats.offensiveEfficiency / 100) * expectedPace;
  } else {
    // FALLBACK: Simple average + spread adjustment
    const avgTotal = (awayStats.pointsPerGame + homeStats.pointsPerGame + 
                      awayStats.pointsAllowedPerGame + homeStats.pointsAllowedPerGame) / 4;
    
    homePredicted = avgTotal / 2 + (totalScore / 2) + (homeAnalytics.homeAdvantage || 0);
    awayPredicted = avgTotal / 2 - (totalScore / 2);
  }
  
  // Predicted spread
  const predictedSpread = homePredicted - awayPredicted;
  
  // Calculate confidence based on:
  // 1. Data quality (Four Factors available = higher confidence)
  // 2. Game consistency
  // 3. Win probability (closer to 50% = lower confidence)
  const dataQuality = hasFourFactors ? 85 : 70;
  const avgConsistency = (awayAnalytics.consistency + homeAnalytics.consistency) / 2;
  const certaintyBonus = Math.abs(homeWinProb - 0.5) * 20; // More certain predictions = higher confidence
  
  const confidence = Math.min(95, Math.max(60, (dataQuality + avgConsistency + certaintyBonus) / 3));
  
  return {
    winProbability: {
      away: awayWinProb * 100,
      home: homeWinProb * 100,
    },
    predictedScore: {
      away: Math.round(awayPredicted),
      home: Math.round(homePredicted),
    },
    predictedSpread: predictedSpread,
    confidence,
    keyFactors,
    valueBets: [], // To be populated by odds comparison
  };
}

/**
 * Identify value bets by comparing predictions to odds
 */
export function identifyValueBets(
  prediction: MatchupPrediction,
  odds: { moneyline?: { away: number; home: number }; spread?: number }
): MatchupPrediction {
  const valueBets = [];
  
  // Check moneyline value
  if (odds.moneyline) {
    const awayImpliedProb = moneylineToProb(odds.moneyline.away);
    const homeImpliedProb = moneylineToProb(odds.moneyline.home);
    
    const awayEdge = prediction.winProbability.away - awayImpliedProb;
    const homeEdge = prediction.winProbability.home - homeImpliedProb;
    
    if (awayEdge > 5) { // 5% edge threshold
      valueBets.push({
        type: 'moneyline' as const,
        recommendation: `Away moneyline`,
        confidence: Math.min(95, prediction.confidence + awayEdge),
        reason: `Model gives ${prediction.winProbability.away.toFixed(1)}% chance, odds imply ${awayImpliedProb.toFixed(1)}% (${awayEdge.toFixed(1)}% edge)`,
      });
    }
    
    if (homeEdge > 5) {
      valueBets.push({
        type: 'moneyline' as const,
        recommendation: `Home moneyline`,
        confidence: Math.min(95, prediction.confidence + homeEdge),
        reason: `Model gives ${prediction.winProbability.home.toFixed(1)}% chance, odds imply ${homeImpliedProb.toFixed(1)}% (${homeEdge.toFixed(1)}% edge)`,
      });
    }
  }
  
  // Check spread value
  if (odds.spread !== undefined) {
    const spreadDiff = Math.abs(prediction.predictedSpread - odds.spread);
    if (spreadDiff > 3) { // 3 point difference
      valueBets.push({
        type: 'spread' as const,
        recommendation: prediction.predictedSpread > odds.spread ? 'Home -spread' : 'Away +spread',
        confidence: Math.min(90, prediction.confidence + spreadDiff * 2),
        reason: `Model predicts ${prediction.predictedSpread.toFixed(1)}-point spread, line is ${odds.spread.toFixed(1)}`,
      });
    }
  }
  
  return {
    ...prediction,
    valueBets,
  };
}

/**
 * Convert moneyline odds to implied probability
 */
function moneylineToProb(moneyline: number): number {
  if (moneyline < 0) {
    return (Math.abs(moneyline) / (Math.abs(moneyline) + 100)) * 100;
  } else {
    return (100 / (moneyline + 100)) * 100;
  }
}

