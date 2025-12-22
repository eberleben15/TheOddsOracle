/**
 * Advanced Team Analytics Engine (Phase 3)
 * 
 * Sophisticated statistical analysis and predictions for betting insights.
 * Uses multiple factors to calculate win probabilities, value bets, and trends.
 */

import { TeamStats, GameResult } from "@/types";
import { CalibrationCoefficients, DEFAULT_COEFFICIENTS } from "./prediction-calibration";
import { SimulationResult } from "./monte-carlo-simulation";

/**
 * Use default coefficients
 * Note: In the future, coefficients can be loaded from an API endpoint or environment variables
 * For now, we use the default values defined in prediction-calibration.ts
 */
const COEFFICIENTS = DEFAULT_COEFFICIENTS;

export interface TeamAnalytics {
  // Overall strength metrics
  offensiveRating: number; // Points scored relative to league average
  defensiveRating: number; // Points allowed relative to league average
  netRating: number; // Overall team strength
  
  // Efficiency metrics
  offensiveEfficiency: number; // Points per possession estimate
  defensiveEfficiency: number; // Opponent points per possession
  
  // Strength of Schedule adjustments
  adjustedOffensiveEfficiency?: number; // SOS-adjusted offensive efficiency
  adjustedDefensiveEfficiency?: number; // SOS-adjusted defensive efficiency
  strengthOfSchedule?: number; // SOS rating (positive = harder schedule)
  
  // Recent form metrics (Phase 2)
  recentFormOffensiveEfficiency?: number; // Last 5 games offensive efficiency
  recentFormDefensiveEfficiency?: number; // Last 5 games defensive efficiency
  
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
  simulation?: SimulationResult; // Monte Carlo simulation results (if available)
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
  const homeAdvantage = isHome ? COEFFICIENTS.homeAdvantage : 0;
  
  // Phase 2: Calculate recent form efficiency ratings (last 5 games)
  function calculateRecentFormEfficiency(
    teamStats: TeamStats,
    recentGames: GameResult[],
    teamName: string,
    isOffensive: boolean
  ): number | undefined {
    if (recentGames.length < 3) return undefined;
    
    const last5Games = recentGames.slice(0, 5);
    const teamPace = teamStats.pace ?? 70;
    
    let totalPoints = 0;
    let gameCount = 0;
    
    for (const game of last5Games) {
      const isHomeTeam = teamMatchesGame(teamName, game.homeTeam, game.homeTeamKey);
      const teamScore = isHomeTeam ? game.homeScore : game.awayScore;
      const oppScore = isHomeTeam ? game.awayScore : game.homeScore;
      
      if (isOffensive) {
        totalPoints += teamScore;
      } else {
        totalPoints += oppScore;
      }
      gameCount++;
    }
    
    if (gameCount === 0) return undefined;
    
    const avgPoints = totalPoints / gameCount;
    // Estimate efficiency: (Points / Pace) * 100
    const efficiency = (avgPoints / teamPace) * 100;
    
    // Return only if reasonable (70-130 range)
    if (efficiency >= 70 && efficiency <= 130) {
      return efficiency;
    }
    return undefined;
  }
  
  const recentFormOffEff = calculateRecentFormEfficiency(stats, recentGames, stats.name, true);
  const recentFormDefEff = calculateRecentFormEfficiency(stats, recentGames, stats.name, false);
  
  // Phase 2: Create weighted blend of season average and recent form
  // Use calibrated coefficients (default: 60% recent form, 40% season average)
  const RECENT_FORM_WEIGHT = COEFFICIENTS.recentFormWeight;
  const SEASON_AVG_WEIGHT = COEFFICIENTS.seasonAvgWeight;
  
  let weightedOffEff = offensiveEfficiency;
  let weightedDefEff = defensiveEfficiency;
  
  if (recentFormOffEff !== undefined) {
    weightedOffEff = (recentFormOffEff * RECENT_FORM_WEIGHT) + (offensiveEfficiency * SEASON_AVG_WEIGHT);
  }
  if (recentFormDefEff !== undefined) {
    weightedDefEff = (recentFormDefEff * RECENT_FORM_WEIGHT) + (defensiveEfficiency * SEASON_AVG_WEIGHT);
  }
  
  // Phase 2: Calculate Strength of Schedule adjustments (enhanced with actual opponent ratings)
  // Pre-load ratings cache asynchronously (non-blocking, will be available for future calls)
  // This ensures the cache is populated for synchronous lookups
  try {
    const { getAllTeamRatings } = require("./team-ratings-cache");
    getAllTeamRatings().catch(() => {
      // Silently fail if cache loading fails, will use fallback
    });
  } catch (error) {
    // Module not available, will use fallback
  }
  
  // Calculate SOS (will use cache if available, otherwise falls back to estimation)
  const sosData = calculateStrengthOfSchedule(stats, recentGames, stats.name);
  
  // Phase 4: Calculate opponent-adjusted metrics (tier-based)
  const tierAdjustedData = calculateOpponentAdjustedMetrics(stats, recentGames, stats.name);
  
  // Use tier-adjusted metrics if available and different from season average
  // Blend using calibrated coefficients (default: 70% tier-adjusted, 30% weighted)
  const FINAL_OFF_EFF = weightedOffEff * COEFFICIENTS.weightedEffWeight + tierAdjustedData.tierAdjustedOffEff * COEFFICIENTS.tierAdjustedWeight;
  const FINAL_DEF_EFF = weightedDefEff * COEFFICIENTS.weightedEffWeight + tierAdjustedData.tierAdjustedDefEff * COEFFICIENTS.tierAdjustedWeight;
  
  return {
    offensiveRating,
    defensiveRating,
    netRating,
    offensiveEfficiency: FINAL_OFF_EFF, // Final: blend of recent form + tier-adjusted (Phase 2 + 4)
    defensiveEfficiency: FINAL_DEF_EFF, // Final: blend of recent form + tier-adjusted (Phase 2 + 4)
    adjustedOffensiveEfficiency: sosData.adjustedOffensiveEfficiency,
    adjustedDefensiveEfficiency: sosData.adjustedDefensiveEfficiency,
    strengthOfSchedule: sosData.strengthOfSchedule,
    recentFormOffensiveEfficiency: recentFormOffEff,
    recentFormDefensiveEfficiency: recentFormDefEff,
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
 * Phase 4: Categorize opponent quality tiers
 */
function categorizeOpponentTier(efficiency: number): 'elite' | 'average' | 'weak' {
  // Top 25% (elite): efficiency > 105
  // Middle 50% (average): 95-105
  // Bottom 25% (weak): efficiency < 95
  if (efficiency >= 105) return 'elite';
  if (efficiency >= 95) return 'average';
  return 'weak';
}

/**
 * Phase 4: Calculate opponent-adjusted efficiency ratings
 * Analyzes performance vs different quality tiers to get tier-adjusted ratings
 */
function calculateOpponentAdjustedMetrics(
  teamStats: TeamStats,
  recentGames: GameResult[],
  teamName: string
): {
  tierAdjustedOffEff: number;
  tierAdjustedDefEff: number;
} {
  const LEAGUE_AVG_EFF = 100;
  const teamPace = teamStats.pace ?? 70;
  
  // Track performance vs different tiers
  const tierStats: {
    elite: { games: number; offEff: number[]; defEff: number[] };
    average: { games: number; offEff: number[]; defEff: number[] };
    weak: { games: number; offEff: number[]; defEff: number[] };
  } = {
    elite: { games: 0, offEff: [], defEff: [] },
    average: { games: 0, offEff: [], defEff: [] },
    weak: { games: 0, offEff: [], defEff: [] },
  };
  
  // Analyze recent games to categorize opponents
  for (const game of recentGames.slice(0, 20)) {
    const isHome = teamMatchesGame(teamName, game.homeTeam, game.homeTeamKey);
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const oppScore = isHome ? game.awayScore : game.homeScore;
    
    // Estimate opponent's efficiency from their scoring
    const oppOffEff = (oppScore / teamPace) * 100;
    const teamOffEff = (teamScore / teamPace) * 100;
    
    // Categorize opponent
    const tier = categorizeOpponentTier(oppOffEff);
    
    if (tierStats[tier].games < 10) { // Limit to avoid skewing
      tierStats[tier].games++;
      tierStats[tier].offEff.push(teamOffEff);
      tierStats[tier].defEff.push(oppOffEff);
    }
  }
  
  // Calculate tier-adjusted ratings
  // Weighted average: more weight to tiers with more games
  let totalWeight = 0;
  let weightedOffEff = 0;
  let weightedDefEff = 0;
  
  const tierWeights = { elite: 1.2, average: 1.0, weak: 0.8 }; // Elite games weighted more
  
  for (const [tier, stats] of Object.entries(tierStats) as Array<[keyof typeof tierStats, typeof tierStats['elite']]>) {
    if (stats.games > 0) {
      const avgOffEff = stats.offEff.reduce((a, b) => a + b, 0) / stats.offEff.length;
      const avgDefEff = stats.defEff.reduce((a, b) => a + b, 0) / stats.defEff.length;
      
      const weight = stats.games * tierWeights[tier];
      weightedOffEff += avgOffEff * weight;
      weightedDefEff += avgDefEff * weight;
      totalWeight += weight;
    }
  }
  
  if (totalWeight === 0) {
    // Fallback to season averages
    return {
      tierAdjustedOffEff: teamStats.offensiveEfficiency ?? 100,
      tierAdjustedDefEff: teamStats.defensiveEfficiency ?? 100,
    };
  }
  
  return {
    tierAdjustedOffEff: weightedOffEff / totalWeight,
    tierAdjustedDefEff: weightedDefEff / totalWeight,
  };
}

/**
 * Phase 2: Enhanced Strength of Schedule (SOS) Calculation
 * Uses actual opponent efficiency ratings from cache instead of estimates
 * 
 * Formula: SOS = Average opponent efficiency rating - League average
 * Positive SOS = harder schedule, negative = easier schedule
 */
function calculateStrengthOfSchedule(
  teamStats: TeamStats,
  recentGames: GameResult[],
  teamName: string
): {
  strengthOfSchedule: number;
  adjustedOffensiveEfficiency: number;
  adjustedDefensiveEfficiency: number;
} {
  // League average efficiency (typically 100-105 in college)
  const LEAGUE_AVG_OFF_EFF = 100;
  const LEAGUE_AVG_DEF_EFF = 100;
  
  // Need at least 5 games to calculate meaningful SOS
  if (recentGames.length < 5) {
    return {
      strengthOfSchedule: 0,
      adjustedOffensiveEfficiency: teamStats.offensiveEfficiency ?? 100,
      adjustedDefensiveEfficiency: teamStats.defensiveEfficiency ?? 100,
    };
  }
  
  const teamOffEff = teamStats.offensiveEfficiency ?? 100;
  const teamDefEff = teamStats.defensiveEfficiency ?? 100;
  
  // Phase 2: Use actual opponent ratings from cache (synchronous lookup)
  let getOpponentRatingsFromGameSync: ((name: string, key?: string) => any) | null = null;
  try {
    // Dynamically import the sync function (works even if cache isn't loaded yet)
    const ratingsModule = require("./team-ratings-cache");
    getOpponentRatingsFromGameSync = ratingsModule.getOpponentRatingsFromGameSync;
  } catch (error) {
    // Module not available, will use fallback
  }
  
  const opponentRatings: Array<{
    offensiveEfficiency: number;
    defensiveEfficiency: number;
    weight: number; // Weight by recency (more recent games weighted higher)
  }> = [];
  
  // Collect opponent ratings with recency weighting
  const gamesToAnalyze = recentGames.slice(0, 20); // Use up to 20 games
  
  for (let i = 0; i < gamesToAnalyze.length; i++) {
    const game = gamesToAnalyze[i];
    const isHome = teamMatchesGame(teamName, game.homeTeam, game.homeTeamKey);
    const opponentName = isHome ? game.awayTeam : game.homeTeam;
    const opponentKey = isHome ? game.awayTeamKey : game.homeTeamKey;
    
    // Try to get actual opponent ratings from cache (synchronous)
    let opponentRating = null;
    if (getOpponentRatingsFromGameSync) {
      opponentRating = getOpponentRatingsFromGameSync(opponentName, opponentKey);
    }
    
    if (opponentRating && 
        opponentRating.offensiveEfficiency >= 70 && opponentRating.offensiveEfficiency <= 130 &&
        opponentRating.defensiveEfficiency >= 70 && opponentRating.defensiveEfficiency <= 130) {
      // Weight by recency: most recent game = weight 1.0, older games decay
      const recencyWeight = 1.0 - (i / gamesToAnalyze.length) * 0.5; // 1.0 to 0.5 range
      
      opponentRatings.push({
        offensiveEfficiency: opponentRating.offensiveEfficiency,
        defensiveEfficiency: opponentRating.defensiveEfficiency,
        weight: recencyWeight,
      });
    }
  }
  
  // Fallback to estimation if we don't have enough cached ratings
  if (opponentRatings.length < 3) {
    // Use old estimation method as fallback
    const opponentOffEffs: number[] = [];
    const opponentDefEffs: number[] = [];
    const teamPace = teamStats.pace ?? 70;
    
    for (const game of gamesToAnalyze) {
      const isHome = teamMatchesGame(teamName, game.homeTeam, game.homeTeamKey);
      const teamScore = isHome ? game.homeScore : game.awayScore;
      const oppScore = isHome ? game.awayScore : game.homeScore;
      
      const estimatedOppOffEff = (oppScore / teamPace) * 100;
      const estimatedOppDefEff = (teamScore / teamPace) * 100;
      
      if (estimatedOppOffEff >= 70 && estimatedOppOffEff <= 130) {
        opponentOffEffs.push(estimatedOppOffEff);
      }
      if (estimatedOppDefEff >= 70 && estimatedOppDefEff <= 130) {
        opponentDefEffs.push(estimatedOppDefEff);
      }
    }
    
    if (opponentOffEffs.length < 3 || opponentDefEffs.length < 3) {
      return {
        strengthOfSchedule: 0,
        adjustedOffensiveEfficiency: teamOffEff,
        adjustedDefensiveEfficiency: teamDefEff,
      };
    }
    
    const avgOppOffEff = opponentOffEffs.reduce((a, b) => a + b, 0) / opponentOffEffs.length;
    const avgOppDefEff = opponentDefEffs.reduce((a, b) => a + b, 0) / opponentDefEffs.length;
    
    const offensiveSOS = avgOppDefEff - LEAGUE_AVG_DEF_EFF;
    const defensiveSOS = avgOppOffEff - LEAGUE_AVG_OFF_EFF;
    const strengthOfSchedule = (offensiveSOS + defensiveSOS) / 2;
    
    const SOS_ADJUSTMENT_FACTOR = COEFFICIENTS.sosAdjustmentFactor;
    const adjustedOffensiveEfficiency = teamOffEff + (offensiveSOS * SOS_ADJUSTMENT_FACTOR);
    const adjustedDefensiveEfficiency = teamDefEff + (defensiveSOS * SOS_ADJUSTMENT_FACTOR);
    
    return {
      strengthOfSchedule,
      adjustedOffensiveEfficiency: Math.max(70, Math.min(130, adjustedOffensiveEfficiency)),
      adjustedDefensiveEfficiency: Math.max(70, Math.min(130, adjustedDefensiveEfficiency)),
    };
  }
  
  // Calculate weighted average opponent efficiency using actual ratings
  let totalWeight = 0;
  let weightedOppOffEff = 0;
  let weightedOppDefEff = 0;
  
  for (const rating of opponentRatings) {
    weightedOppOffEff += rating.offensiveEfficiency * rating.weight;
    weightedOppDefEff += rating.defensiveEfficiency * rating.weight;
    totalWeight += rating.weight;
  }
  
  const avgOppOffEff = weightedOppOffEff / totalWeight;
  const avgOppDefEff = weightedOppDefEff / totalWeight;
  
  // SOS = how much better/worse opponents are than average
  const offensiveSOS = avgOppDefEff - LEAGUE_AVG_DEF_EFF;
  const defensiveSOS = avgOppOffEff - LEAGUE_AVG_OFF_EFF;
  const strengthOfSchedule = (offensiveSOS + defensiveSOS) / 2;
  
  // Adjust efficiency ratings based on SOS
  // Adjustment factor using calibrated coefficients (default: 0.3 means 30% of SOS difference is adjusted)
  const SOS_ADJUSTMENT_FACTOR = COEFFICIENTS.sosAdjustmentFactor;
  
  const adjustedOffensiveEfficiency = teamOffEff + (offensiveSOS * SOS_ADJUSTMENT_FACTOR);
  const adjustedDefensiveEfficiency = teamDefEff + (defensiveSOS * SOS_ADJUSTMENT_FACTOR);
  
  return {
    strengthOfSchedule,
    adjustedOffensiveEfficiency: Math.max(70, Math.min(130, adjustedOffensiveEfficiency)),
    adjustedDefensiveEfficiency: Math.max(70, Math.min(130, adjustedDefensiveEfficiency)),
  };
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
    
    // Home court advantage using calibrated coefficient (default: 3.5 points)
    const homeAdvantage = COEFFICIENTS.homeAdvantage;
    
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
  
  // College basketball typical range: 60-85 points per team
  const LEAGUE_AVG_PACE = 70; // Typical possessions per game in college
  
  // Phase 3: Calculate defensive quality percentiles for better matchup prediction
  function calculateDefensivePercentile(defensiveRating: number): {
    percentile: number; // 0-100
    tier: 'elite' | 'good' | 'average' | 'below_average' | 'poor';
  } {
    // College basketball defensive rating typical range: 85-115
    // Elite: <90 (top 10%)
    // Good: 90-95 (10-25%)
    // Average: 95-105 (25-75%)
    // Below Average: 105-110 (75-90%)
    // Poor: >110 (bottom 10%)
    
    let percentile: number;
    let tier: 'elite' | 'good' | 'average' | 'below_average' | 'poor';
    
    if (defensiveRating < 90) {
      percentile = 5 + (90 - defensiveRating) * 0.5; // 5-10 percentile
      tier = 'elite';
    } else if (defensiveRating < 95) {
      percentile = 10 + (95 - defensiveRating) * 3; // 10-25 percentile
      tier = 'good';
    } else if (defensiveRating < 105) {
      percentile = 25 + (105 - defensiveRating) * 2.5; // 25-75 percentile
      tier = 'average';
    } else if (defensiveRating < 110) {
      percentile = 75 + (110 - defensiveRating) * 3; // 75-90 percentile
      tier = 'below_average';
    } else {
      percentile = 90 + Math.min(10, (defensiveRating - 110) * 1); // 90-100 percentile
      tier = 'poor';
    }
    
    return { percentile: Math.max(0, Math.min(100, percentile)), tier };
  }
  
  // Phase 3: Non-linear defensive adjustment based on percentile
  function calculateDefensiveAdjustment(
    teamOffEff: number,
    opponentDefRating: number,
    opponentDefPercentile: number
  ): number {
    // Base adjustment from rating difference
    const ratingDiff = opponentDefRating - 100; // Negative = good defense
    
    // Non-linear scaling based on percentile
    // Elite defenses (top 10%) have stronger impact
    // Poor defenses (bottom 10%) have weaker impact
    let percentileMultiplier: number;
    
    if (opponentDefPercentile < 10) {
      // Elite defense - stronger impact
      percentileMultiplier = COEFFICIENTS.percentileMultipliers.elite;
    } else if (opponentDefPercentile < 25) {
      // Good defense
      percentileMultiplier = COEFFICIENTS.percentileMultipliers.good;
    } else if (opponentDefPercentile < 75) {
      // Average defense
      percentileMultiplier = 1.0;
    } else if (opponentDefPercentile < 90) {
      // Below average defense
      percentileMultiplier = COEFFICIENTS.percentileMultipliers.belowAverage;
    } else {
      // Poor defense - weaker impact
      percentileMultiplier = COEFFICIENTS.percentileMultipliers.poor;
    }
    
    // Base adjustment factor (reduced from 0.15 to account for percentile multiplier)
    const baseAdjustmentFactor = COEFFICIENTS.baseDefensiveAdjustmentFactor;
    
    // Calculate adjustment: (rating diff / 100) * factor * multiplier
    const adjustment = (ratingDiff / 100) * baseAdjustmentFactor * percentileMultiplier;
    
    // Additional factor: consider offensive rating relative to defense
    // High-powered offense vs elite defense gets reduced less
    const offDefRatio = teamOffEff / Math.max(opponentDefRating, 80);
    const ratioAdjustment = offDefRatio > 1.1 ? 0.05 : 0; // Strong offense gets slight boost
    
    return adjustment + ratioAdjustment;
  }
  
  if (homeStats.pace && awayStats.pace && homeStats.offensiveEfficiency && awayStats.offensiveEfficiency) {
    // ADVANCED: Use efficiency ratings and pace
    // Offensive efficiency is points per 100 possessions (typically 100-120)
    // Pace is possessions per game (typically 65-75 for college basketball)
    
    // Phase 5: Enhanced pace calculation with mismatch adjustments
    const homePace = homeStats.pace;
    const awayPace = awayStats.pace;
    const paceDiff = Math.abs(homePace - awayPace);
    
    // Expected pace is average, but adjust for pace mismatch
    let expectedPace = (homePace + awayPace) / 2;
    
    // Phase 5: When pace differs significantly (>5 possessions), adjust
    // Fast teams slow down slightly when playing slow teams
    // Slow teams speed up slightly when playing fast teams
    if (paceDiff > 5) {
      const PACE_MISMATCH_FACTOR = 0.3; // 30% adjustment factor
      
      if (homePace > awayPace) {
        // Home is faster - expected pace closer to home but adjusted down
        expectedPace = awayPace + (paceDiff * (1 - PACE_MISMATCH_FACTOR));
      } else {
        // Away is faster - expected pace closer to away but adjusted down
        expectedPace = homePace + (paceDiff * (1 - PACE_MISMATCH_FACTOR));
      }
    }
    
    // Ensure expected pace is reasonable (60-80 possessions)
    expectedPace = Math.max(60, Math.min(80, expectedPace));
    
    // Use SOS-adjusted efficiencies if available (Phase 1)
    const homeOffensiveRating = homeAnalytics.adjustedOffensiveEfficiency ?? homeStats.offensiveEfficiency;
    const awayDefensiveRating = awayAnalytics.adjustedDefensiveEfficiency ?? 
      (awayStats.defensiveEfficiency || (awayStats.pointsAllowedPerGame / expectedPace) * 100);
    
    const awayOffensiveRating = awayAnalytics.adjustedOffensiveEfficiency ?? awayStats.offensiveEfficiency;
    const homeDefensiveRating = homeAnalytics.adjustedDefensiveEfficiency ?? 
      (homeStats.defensiveEfficiency || (homeStats.pointsAllowedPerGame / expectedPace) * 100);
    
    // Base score = (Offensive Rating / 100) * Pace
    const homeBaseScore = (homeOffensiveRating / 100) * expectedPace;
    const awayBaseScore = (awayOffensiveRating / 100) * expectedPace;
    
    // Phase 3: Calculate defensive percentiles
    const homeDefPercentile = calculateDefensivePercentile(homeDefensiveRating);
    const awayDefPercentile = calculateDefensivePercentile(awayDefensiveRating);
    
    // Phase 3: Apply non-linear defensive adjustments
    const homeDefenseImpact = calculateDefensiveAdjustment(
      homeOffensiveRating,
      awayDefensiveRating,
      awayDefPercentile.percentile
    );
    const awayDefenseImpact = calculateDefensiveAdjustment(
      awayOffensiveRating,
      homeDefensiveRating,
      homeDefPercentile.percentile
    );
    
    // Apply defensive adjustment
    homePredicted = homeBaseScore * (1 + homeDefenseImpact) + (homeAnalytics.homeAdvantage || COEFFICIENTS.homeAdvantage);
    awayPredicted = awayBaseScore * (1 + awayDefenseImpact);
    
    // Ensure scores are realistic for college basketball (typically 55-100 points)
    // Higher cap allows for high-scoring games while preventing unrealistic values
    homePredicted = Math.max(50, Math.min(105, homePredicted));
    awayPredicted = Math.max(50, Math.min(105, awayPredicted));
  } else {
    // FALLBACK: Use points per game with opponent defensive adjustment
    // Matchup-adjusted scoring: team's offense vs opponent's defense
    
    // Base prediction: team's PPG, but adjust based on opponent's defensive quality
    const leagueAvgPPG = 72; // Average college basketball scoring
    
    // Estimate defensive ratings from PAPG (for percentile calculation)
    const estimatedHomeDefRating = (homeStats.pointsAllowedPerGame / 70) * 100; // Rough estimate
    const estimatedAwayDefRating = (awayStats.pointsAllowedPerGame / 70) * 100;
    
    // Phase 3: Use percentile-based defensive adjustments in fallback too
    const homeDefPercentile = calculateDefensivePercentile(estimatedHomeDefRating);
    const awayDefPercentile = calculateDefensivePercentile(estimatedAwayDefRating);
    
    // Calculate defensive strength relative to league average
    const awayDefStrength = (awayStats.pointsAllowedPerGame - leagueAvgPPG) / leagueAvgPPG;
    const homeDefStrength = (homeStats.pointsAllowedPerGame - leagueAvgPPG) / leagueAvgPPG;
    
    // Phase 3: Apply percentile-based adjustment
    const homeDefenseAdjustment = calculateDefensiveAdjustment(
      homeStats.pointsPerGame * 1.05, // Estimate offensive efficiency
      estimatedAwayDefRating,
      awayDefPercentile.percentile
    );
    
    const awayDefenseAdjustment = calculateDefensiveAdjustment(
      awayStats.pointsPerGame * 1.05,
      estimatedHomeDefRating,
      homeDefPercentile.percentile
    );
    
    // Calculate base scores with defensive adjustment
    homePredicted = homeStats.pointsPerGame * (1 + homeDefenseAdjustment);
    awayPredicted = awayStats.pointsPerGame * (1 + awayDefenseAdjustment);
    
    // Apply predicted margin/spread from the model (totalScore is home advantage in points)
    const spreadAdjustment = totalScore / 2;
    homePredicted = homePredicted + spreadAdjustment;
    awayPredicted = awayPredicted - spreadAdjustment;
    
    // Add home court advantage (typically 3-4 points in college basketball)
    homePredicted = homePredicted + (homeAnalytics.homeAdvantage || COEFFICIENTS.homeAdvantage);
    
    // Ensure scores are realistic for college basketball (typically 55-100 points)
    // Higher cap allows for high-scoring games while preventing unrealistic values
    homePredicted = Math.max(52, Math.min(105, homePredicted));
    awayPredicted = Math.max(52, Math.min(105, awayPredicted));
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

