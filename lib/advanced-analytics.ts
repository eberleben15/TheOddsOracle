/**
 * Advanced Team Analytics Engine (Phase 3)
 *
 * Sophisticated statistical analysis and predictions for betting insights.
 * Uses multiple factors to calculate win probabilities, value bets, and trends.
 * Score predictions use sport-specific league averages so totals align with
 * sportsbook/ESPN expectations (CBB ~70 pace, NBA ~99 pace, etc.).
 */

import { TeamStats, GameResult } from "@/types";
import { CalibrationCoefficients, DEFAULT_COEFFICIENTS } from "./prediction-calibration";
import { SimulationResult } from "./monte-carlo-simulation";
import type { Sport } from "./sports/sport-config";
import { applyPlattScaling, getRecalibrationParams } from "./recalibration";

/** League constants per sport so predicted scores match sportsbook/ESPN scale (pace, PPG, score bounds). */
export interface LeagueConstants {
  leagueAvgPpg: number;
  leagueAvgPace: number;
  paceMin: number;
  paceMax: number;
  scoreMin: number;
  scoreMax: number;
  homeAdvantage: number;
}

const CBB_CONSTANTS: LeagueConstants = {
  leagueAvgPpg: 72,
  leagueAvgPace: 70,
  paceMin: 60,
  paceMax: 80,
  scoreMin: 50,
  scoreMax: 105,
  homeAdvantage: DEFAULT_COEFFICIENTS.homeAdvantage,
};

const NBA_CONSTANTS: LeagueConstants = {
  leagueAvgPpg: 112,
  leagueAvgPace: 99,
  paceMin: 92,
  paceMax: 106,
  scoreMin: 85,
  scoreMax: 135,
  homeAdvantage: 2.5,
};

const NHL_CONSTANTS: LeagueConstants = {
  leagueAvgPpg: 3.0,
  leagueAvgPace: 60,
  paceMin: 55,
  paceMax: 65,
  scoreMin: 1,
  scoreMax: 8,
  homeAdvantage: 0.15,
};

const MLB_CONSTANTS: LeagueConstants = {
  leagueAvgPpg: 4.5,
  leagueAvgPace: 9,
  paceMin: 8,
  paceMax: 12,
  scoreMin: 0,
  scoreMax: 15,
  homeAdvantage: 0.25,
};

/** Default (CBB) used when sport is unknown or unsupported for scoring. */
const DEFAULT_LEAGUE = CBB_CONSTANTS;

const LEAGUE_BY_SPORT: Partial<Record<Sport, LeagueConstants>> = {
  cbb: CBB_CONSTANTS,
  nba: NBA_CONSTANTS,
  nhl: NHL_CONSTANTS,
  mlb: MLB_CONSTANTS,
};

export function getLeagueConstants(sport?: Sport | string): LeagueConstants {
  if (!sport) return DEFAULT_LEAGUE;
  return LEAGUE_BY_SPORT[sport as Sport] ?? DEFAULT_LEAGUE;
}

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

/** Audit trail for prediction reproducibility and debugging */
export interface PredictionTrace {
  modelPath: 'fourFactors' | 'fallback';
  totalScore: number;
  fourFactorsScore?: number;
  efficiencyScore?: number;
  tempoAdjustment?: number;
  homeAdvantage: number;
  momentumScore?: number;
  blended?: boolean; // true when Four Factors + efficiency were blended
  homeWinProbRaw: number; // Before recalibration
  recalibrationApplied: boolean;
}

export interface AlternateSpread {
  spread: number;
  direction: 'buy' | 'sell';
  team: 'home' | 'away';
  reason: string;
  confidence: number;
  riskLevel: 'safer' | 'standard' | 'aggressive';
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
  alternateSpread?: AlternateSpread; // Suggested alternate spread
  confidence: number; // 0-100 prediction confidence
  keyFactors: string[]; // What drives the prediction
  /** Audit trail: intermediate values for reproducibility */
  trace?: PredictionTrace;
  valueBets: {
    type: 'moneyline' | 'spread' | 'total';
    recommendation: string;
    confidence: number;
    reason: string;
  }[];
  simulation?: SimulationResult; // Monte Carlo simulation results (if available)
}

/**
 * Calculate comprehensive team analytics.
 * @param sport - Optional sport for league constants (CBB vs NBA vs NHL); defaults to CBB.
 * @param coefficients - Optional calibration coefficients; uses defaults when not provided.
 */
export function calculateTeamAnalytics(
  stats: TeamStats,
  recentGames: GameResult[],
  isHome: boolean = false,
  sport?: Sport,
  coefficients: CalibrationCoefficients = DEFAULT_COEFFICIENTS
): TeamAnalytics {
  const league = getLeagueConstants(sport);
  const LEAGUE_AVG_PPG = league.leagueAvgPpg;
  const LEAGUE_AVG_FG = 45.0;
  const LEAGUE_AVG_3P = 35.0;
  const LEAGUE_AVG_FT = 72.0;
  const LEAGUE_AVG_REB = 36.0;

  // Use actual efficiency (points per 100 poss) if available; otherwise derive from PPG and league pace
  const pace = stats.pace ?? league.leagueAvgPace;
  const offensiveRating = stats.offensiveEfficiency ?? (stats.pointsPerGame != null && stats.pointsPerGame > 0
    ? (stats.pointsPerGame / pace) * 100
    : 100);
  const defensiveRating = stats.defensiveEfficiency ?? (stats.pointsAllowedPerGame != null && stats.pointsAllowedPerGame > 0
    ? (stats.pointsAllowedPerGame / pace) * 100
    : 100);
  const netRating = offensiveRating - defensiveRating;

  // Efficiency = points per 100 possessions (not PPG * 1.05)
  const offensiveEfficiency = stats.offensiveEfficiency ?? (stats.pointsPerGame != null && stats.pointsPerGame > 0
    ? (stats.pointsPerGame / pace) * 100
    : 100);
  const defensiveEfficiency = stats.defensiveEfficiency ?? (stats.pointsAllowedPerGame != null && stats.pointsAllowedPerGame > 0
    ? (stats.pointsAllowedPerGame / pace) * 100
    : 100);
  
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
  
  const homeAdvantage = isHome ? league.homeAdvantage : 0;
  
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
  const RECENT_FORM_WEIGHT = coefficients.recentFormWeight;
  const SEASON_AVG_WEIGHT = coefficients.seasonAvgWeight;
  
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
  const sosData = calculateStrengthOfSchedule(stats, recentGames, stats.name, coefficients);
  
  // Phase 4: Calculate opponent-adjusted metrics (tier-based)
  const tierAdjustedData = calculateOpponentAdjustedMetrics(stats, recentGames, stats.name);
  
  // Use tier-adjusted metrics if available and different from season average
  // Blend using calibrated coefficients (default: 70% tier-adjusted, 30% weighted)
  const FINAL_OFF_EFF = weightedOffEff * coefficients.weightedEffWeight + tierAdjustedData.tierAdjustedOffEff * coefficients.tierAdjustedWeight;
  const FINAL_DEF_EFF = weightedDefEff * coefficients.weightedEffWeight + tierAdjustedData.tierAdjustedDefEff * coefficients.tierAdjustedWeight;
  
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
  teamName: string,
  coefficients: CalibrationCoefficients = DEFAULT_COEFFICIENTS
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
    
    const SOS_ADJUSTMENT_FACTOR = coefficients.sosAdjustmentFactor;
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
    const SOS_ADJUSTMENT_FACTOR = coefficients.sosAdjustmentFactor;
  
  const adjustedOffensiveEfficiency = teamOffEff + (offensiveSOS * SOS_ADJUSTMENT_FACTOR);
  const adjustedDefensiveEfficiency = teamDefEff + (defensiveSOS * SOS_ADJUSTMENT_FACTOR);
  
  return {
    strengthOfSchedule,
    adjustedOffensiveEfficiency: Math.max(70, Math.min(130, adjustedOffensiveEfficiency)),
    adjustedDefensiveEfficiency: Math.max(70, Math.min(130, adjustedDefensiveEfficiency)),
  };
}

/**
 * Calculate an alternate spread suggestion based on prediction analysis.
 * 
 * Strategy:
 * - If spread is near a key number (3, 7, 10 in basketball; 3, 7 in football; 1.5 in hockey/baseball),
 *   suggest buying/selling the half point for value.
 * - If confidence is high (>80%), suggest a more aggressive alternate.
 * - If confidence is moderate, suggest a safer alternate.
 */
function calculateAlternateSpread(
  mainSpread: number,
  homeWinProb: number,
  confidence: number,
  homeTeamName: string,
  awayTeamName: string,
  sport?: Sport
): AlternateSpread {
  const absSpread = Math.abs(mainSpread);
  const homeFavored = mainSpread > 0;
  const favoredTeam = homeFavored ? 'home' : 'away';
  const favoredName = homeFavored ? homeTeamName : awayTeamName;
  const underdogName = homeFavored ? awayTeamName : homeTeamName;
  
  // Key numbers by sport where pushes are common
  const keyNumbers: Record<string, number[]> = {
    cbb: [3, 4, 5, 7, 10],
    nba: [3, 4, 5, 7, 10],
    nhl: [1, 1.5, 2],
    mlb: [1, 1.5, 2],
    nfl: [3, 7, 10, 14],
  };
  
  const sportKey = sport || 'cbb';
  const relevantKeyNumbers = keyNumbers[sportKey] || keyNumbers.cbb;
  
  // Check if near a key number
  const nearKeyNumber = relevantKeyNumbers.find(k => Math.abs(absSpread - k) <= 0.5);
  
  let alternateSpread: number;
  let direction: 'buy' | 'sell';
  let team: 'home' | 'away';
  let reason: string;
  let altConfidence: number;
  let riskLevel: 'safer' | 'standard' | 'aggressive';
  
  if (nearKeyNumber && confidence >= 70) {
    // Near a key number - suggest buying past it for the favored team
    const adjustment = sportKey === 'nhl' || sportKey === 'mlb' ? 0.5 : 1.5;
    
    if (confidence >= 80) {
      // High confidence: buy points for the favorite (more aggressive spread)
      alternateSpread = homeFavored ? mainSpread + adjustment : mainSpread - adjustment;
      direction = 'buy';
      team = favoredTeam;
      reason = `High confidence pick - buy ${favoredName} past key number ${nearKeyNumber}`;
      altConfidence = confidence - 5;
      riskLevel = 'aggressive';
    } else {
      // Moderate confidence: sell points (take underdog + extra points)
      alternateSpread = homeFavored ? mainSpread - adjustment : mainSpread + adjustment;
      direction = 'sell';
      team = homeFavored ? 'away' : 'home';
      reason = `Sell past key number ${nearKeyNumber} - take ${underdogName} +${Math.abs(alternateSpread).toFixed(1)}`;
      altConfidence = confidence + 5;
      riskLevel = 'safer';
    }
  } else if (confidence >= 85) {
    // Very high confidence without key number - suggest aggressive alternate
    const aggressiveAdjustment = sportKey === 'nhl' || sportKey === 'mlb' ? 1 : 3;
    alternateSpread = homeFavored 
      ? mainSpread + aggressiveAdjustment 
      : mainSpread - aggressiveAdjustment;
    direction = 'buy';
    team = favoredTeam;
    reason = `Strong edge detected - consider ${favoredName} ${alternateSpread > 0 ? '-' : '+'}${Math.abs(alternateSpread).toFixed(1)}`;
    altConfidence = confidence - 10;
    riskLevel = 'aggressive';
  } else if (confidence <= 65) {
    // Low confidence - suggest safer alternate (more points for underdog)
    const saferAdjustment = sportKey === 'nhl' || sportKey === 'mlb' ? 0.5 : 2;
    alternateSpread = homeFavored 
      ? mainSpread - saferAdjustment 
      : mainSpread + saferAdjustment;
    direction = 'sell';
    team = homeFavored ? 'away' : 'home';
    reason = `Lower confidence game - safer to take ${underdogName} +${Math.abs(alternateSpread).toFixed(1)}`;
    altConfidence = Math.min(85, confidence + 10);
    riskLevel = 'safer';
  } else {
    // Standard confidence - suggest a standard alternate (1-2 points different)
    const standardAdjustment = sportKey === 'nhl' || sportKey === 'mlb' ? 0.5 : 1.5;
    const winProbEdge = Math.abs(homeWinProb - 0.5);
    
    if (winProbEdge > 0.15) {
      // Clear favorite - slightly more aggressive
      alternateSpread = homeFavored 
        ? mainSpread + standardAdjustment 
        : mainSpread - standardAdjustment;
      direction = 'buy';
      team = favoredTeam;
      reason = `Consider buying ${favoredName} to ${alternateSpread > 0 ? '-' : '+'}${Math.abs(alternateSpread).toFixed(1)}`;
      altConfidence = confidence - 3;
      riskLevel = 'standard';
    } else {
      // Close game - play it safer
      alternateSpread = homeFavored 
        ? mainSpread - standardAdjustment 
        : mainSpread + standardAdjustment;
      direction = 'sell';
      team = homeFavored ? 'away' : 'home';
      reason = `Close matchup - consider ${underdogName} +${Math.abs(alternateSpread).toFixed(1)} for safety`;
      altConfidence = confidence + 3;
      riskLevel = 'safer';
    }
  }
  
  return {
    spread: Math.round(alternateSpread * 2) / 2, // Round to nearest 0.5
    direction,
    team,
    reason,
    confidence: Math.max(50, Math.min(95, altConfidence)),
    riskLevel,
  };
}

/**
 * Predict matchup outcome (unified model).
 *
 * - Win probability: Four Factors (eFG%, TOV%, ORB%, FTR) or net rating + momentum + home.
 * - Expected total: tempo-free (efficiency × pace, sport-specific).
 * - Margin: implied from win probability so score winner always matches win-prob winner.
 * One source of truth: win prob drives margin, tempo-free drives total.
 */
export function predictMatchup(
  awayAnalytics: TeamAnalytics,
  homeAnalytics: TeamAnalytics,
  awayStats: TeamStats,
  homeStats: TeamStats,
  sport?: Sport,
  coefficients: CalibrationCoefficients = DEFAULT_COEFFICIENTS
): MatchupPrediction {
  const league = getLeagueConstants(sport);

  // Efficiency-based score (SOS-adjusted, schedule-aware) — always compute for disagreement check
  const efficiencyScore =
    (homeAnalytics.netRating - awayAnalytics.netRating) * 0.04 +
    ((homeAnalytics.offensiveRating - awayAnalytics.defensiveRating) -
      (awayAnalytics.offensiveRating - homeAnalytics.defensiveRating)) * 0.03;

  // Use Four Factors if available (from SportsData.io)
  const hasFourFactors = awayStats.effectiveFieldGoalPercentage && homeStats.effectiveFieldGoalPercentage;

  let totalScore = 0;
  let keyFactors: string[] = [];
  let traceData: Omit<PredictionTrace, 'homeWinProbRaw' | 'recalibrationApplied'> = {
    modelPath: hasFourFactors ? 'fourFactors' : 'fallback',
    totalScore: 0,
    homeAdvantage: coefficients.homeAdvantage,
  };
  
  if (hasFourFactors) {
    // FOUR FACTORS MODEL (Industry Standard)
    // Reference: Basketball on Paper by Dean Oliver
    // All stats are in 0-100 (percentage points). Scale so totalScore stays in ~[-20, 20]
    // for the logistic 1/(1+exp(-totalScore/8)) to yield sensible win probs (not 0% or 100%).

    // 1. Effective Field Goal % (40% weight - MOST IMPORTANT)
    const efgDiff = (homeStats.effectiveFieldGoalPercentage || 0) - (awayStats.effectiveFieldGoalPercentage || 0);
    const efgScore = efgDiff * 0.4; // ~0.4 per percentage point

    // 2. Turnover Rate (25% weight - lower is better)
    const tovDiff = (awayStats.turnoverRate || 0) - (homeStats.turnoverRate || 0); // Reversed (lower TOV is good)
    const tovScore = tovDiff * 0.125; // ~0.125 per percentage point

    // 3. Offensive Rebound Rate (20% weight) — stored as 0-100
    const orbDiff = (homeStats.offensiveReboundRate || 0) - (awayStats.offensiveReboundRate || 0);
    const orbScore = orbDiff * 0.15; // ~0.15 per percentage point

    // 4. Free Throw Rate (15% weight) — stored as 0-100
    const ftrDiff = (homeStats.freeThrowRate || 0) - (awayStats.freeThrowRate || 0);
    const ftrScore = ftrDiff * 0.09; // ~0.09 per percentage point

    // Combine Four Factors (typical sum in [-10, 10] for close matchups)
    const fourFactorsScore = efgScore + tovScore + orbScore + ftrScore;
    
    // Add tempo/efficiency adjustment if available
    let tempoAdjustment = 0;
    if (homeStats.pace && awayStats.pace && homeStats.offensiveEfficiency && awayStats.offensiveEfficiency) {
      const expectedPace = (homeStats.pace + awayStats.pace) / 2;
      const efficiencyDiff = (homeStats.offensiveEfficiency || 0) - (awayStats.defensiveEfficiency || 0) -
                             ((awayStats.offensiveEfficiency || 0) - (homeStats.defensiveEfficiency || 0));
      tempoAdjustment = (efficiencyDiff / 100) * (expectedPace / 70) * 3; // Scale by pace
    }
    
    // Home court advantage: scale down when Four Factors heavily favor the away team.
    // A fixed ~3.5 points shouldn't flip a huge talent gap (e.g. Troy vs UL Monroe).
    const baseHomeAdv = coefficients.homeAdvantage;
    let homeAdvantage = baseHomeAdv;
    if (fourFactorsScore < -3) {
      // Away team strongly favored by stats: cap home advantage to ~1.5 so it can't flip the result
      const scale = Math.max(0.3, 1 + fourFactorsScore / 6); // e.g. -6 -> 0, -3 -> 0.5
      homeAdvantage = baseHomeAdv * Math.max(0.4, scale);
    }
    
    // Momentum (smaller weight with Four Factors)
    const momentumScore = ((homeAnalytics.momentum - awayAnalytics.momentum) / 200) * 2;
    
    let fourFactorsTotal = fourFactorsScore + tempoAdjustment + homeAdvantage + momentumScore;

    // CRITICAL: Four Factors use raw stats (no SOS adjustment). When efficiency disagrees,
    // favor the schedule-aware model. efficiencyScore scale: net rating diff * 0.04 ≈ 0.4 per 10 pts.
    const STRONG_DISAGREEMENT = 0.8; // ~20 pt net rating gap triggers (was 4 = 100+ pt, never triggered)
    const fourFactorsFavorsHome = fourFactorsTotal > 0;
    const efficiencyFavorsAway = efficiencyScore < -0.5;
    const efficiencyFavorsHome = efficiencyScore > 0.5;
    let blended = false;
    if (
      (fourFactorsFavorsHome && efficiencyFavorsAway && Math.abs(efficiencyScore) > STRONG_DISAGREEMENT) ||
      (!fourFactorsFavorsHome && efficiencyFavorsHome && Math.abs(efficiencyScore) > STRONG_DISAGREEMENT)
    ) {
      // Blend 70% efficiency (schedule-aware) + 30% Four Factors when they disagree
      totalScore = efficiencyScore * 0.7 + fourFactorsTotal * 0.3;
      blended = true;
      keyFactors.push('Schedule-adjusted ratings override raw Four Factors (large disagreement)');
    } else {
      totalScore = fourFactorsTotal;
    }
    traceData = {
      modelPath: 'fourFactors',
      totalScore,
      fourFactorsScore,
      efficiencyScore,
      tempoAdjustment,
      homeAdvantage,
      momentumScore,
      blended,
    };
    
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
    // Scale so totalScore stays in ~[-15, 15] for sensible win probs (ratings are ~80-120)
    const factors = {
      netRating: (homeAnalytics.netRating - awayAnalytics.netRating) * 0.04,
      matchup: ((homeAnalytics.offensiveRating - awayAnalytics.defensiveRating) -
                (awayAnalytics.offensiveRating - homeAnalytics.defensiveRating)) * 0.03,
      momentum: ((homeAnalytics.momentum - awayAnalytics.momentum) / 200) * 1.5,
      home: (homeAnalytics.homeAdvantage ?? coefficients.homeAdvantage) * 0.35,
    };
    totalScore = Object.values(factors).reduce((a, b) => a + b, 0);
    traceData = {
      modelPath: 'fallback',
      totalScore,
      homeAdvantage: factors.home,
    };
    
    // Identify key factors (thresholds match scaled factors)
    if (Math.abs(factors.netRating) > 0.5) {
      keyFactors.push(`${factors.netRating > 0 ? homeStats.name : awayStats.name} has superior overall rating`);
    }
    if (Math.abs(factors.momentum) > 0.5) {
      keyFactors.push(`${factors.momentum > 0 ? homeStats.name : awayStats.name} has strong momentum`);
    }
    if (homeAnalytics.shootingEfficiency > awayAnalytics.shootingEfficiency + 10) {
      keyFactors.push(`${homeStats.name} has better shooting efficiency`);
    } else if (awayAnalytics.shootingEfficiency > homeAnalytics.shootingEfficiency + 10) {
      keyFactors.push(`${awayStats.name} has better shooting efficiency`);
    }
  }
  
  // Win probability from Four Factors / fallback (primary "who wins" signal)
  let homeWinProb = 1 / (1 + Math.exp(-totalScore / 8));
  homeWinProb = Math.max(0.02, Math.min(0.98, homeWinProb));
  const homeWinProbRaw = homeWinProb;
  const recalParams = getRecalibrationParams();
  const recalibrationApplied = recalParams != null && (recalParams.A !== 1 || recalParams.B !== 0);
  if (recalibrationApplied && recalParams != null) {
    homeWinProb = applyPlattScaling(homeWinProb, recalParams);
    homeWinProb = Math.max(0.02, Math.min(0.98, homeWinProb));
  }
  const awayWinProb = 1 - homeWinProb;

  // Predict scores: tempo-free gives expected total; margin is set from win probability (unified model)
  let homePredicted: number;
  let awayPredicted: number;
  const homePace = homeStats.pace ?? league.leagueAvgPace;
  const awayPace = awayStats.pace ?? league.leagueAvgPace;
  const homeOffEff = homeStats.offensiveEfficiency ?? (homeStats.pointsPerGame != null && homeStats.pointsPerGame > 0 ? (homeStats.pointsPerGame / homePace) * 100 : 100);
  const awayOffEff = awayStats.offensiveEfficiency ?? (awayStats.pointsPerGame != null && awayStats.pointsPerGame > 0 ? (awayStats.pointsPerGame / awayPace) * 100 : 100);
  const homeDefEff = homeStats.defensiveEfficiency ?? (homeStats.pointsAllowedPerGame != null && homeStats.pointsAllowedPerGame > 0 ? (homeStats.pointsAllowedPerGame / homePace) * 100 : 100);
  const awayDefEff = awayStats.defensiveEfficiency ?? (awayStats.pointsAllowedPerGame != null && awayStats.pointsAllowedPerGame > 0 ? (awayStats.pointsAllowedPerGame / awayPace) * 100 : 100);
  const hasPaceAndEfficiency = (homeStats.pace != null || awayStats.pace != null) || (homeStats.offensiveEfficiency != null && awayStats.offensiveEfficiency != null);
  
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
      percentileMultiplier = coefficients.percentileMultipliers.elite;
    } else if (opponentDefPercentile < 25) {
      // Good defense
      percentileMultiplier = coefficients.percentileMultipliers.good;
    } else if (opponentDefPercentile < 75) {
      // Average defense
      percentileMultiplier = 1.0;
    } else if (opponentDefPercentile < 90) {
      // Below average defense
      percentileMultiplier = coefficients.percentileMultipliers.belowAverage;
    } else {
      // Poor defense - weaker impact
      percentileMultiplier = coefficients.percentileMultipliers.poor;
    }
    
    // Base adjustment factor (reduced from 0.15 to account for percentile multiplier)
    const baseAdjustmentFactor = coefficients.baseDefensiveAdjustmentFactor;
    
    // Calculate adjustment: (rating diff / 100) * factor * multiplier
    const adjustment = (ratingDiff / 100) * baseAdjustmentFactor * percentileMultiplier;
    
    // Additional factor: consider offensive rating relative to defense
    // High-powered offense vs elite defense gets reduced less
    const offDefRatio = teamOffEff / Math.max(opponentDefRating, 80);
    const ratioAdjustment = offDefRatio > 1.1 ? 0.05 : 0; // Strong offense gets slight boost
    
    return adjustment + ratioAdjustment;
  }
  
  // Use tempo-free path when we have or can derive efficiency (always true when we have PPG/PAPG)
  const useTempoFree = (homeStats.pointsPerGame != null && awayStats.pointsPerGame != null) ||
    (homeStats.offensiveEfficiency != null && awayStats.offensiveEfficiency != null);

  if (useTempoFree) {
    // Tempo-free: expected score = (Offensive Efficiency / 100) × Expected Pace
    const paceDiff = Math.abs(homePace - awayPace);
    let expectedPace = (homePace + awayPace) / 2;
    if (paceDiff > 5) {
      const PACE_MISMATCH_FACTOR = 0.3;
      if (homePace > awayPace) expectedPace = awayPace + paceDiff * (1 - PACE_MISMATCH_FACTOR);
      else expectedPace = homePace + paceDiff * (1 - PACE_MISMATCH_FACTOR);
    }
    expectedPace = Math.max(league.paceMin, Math.min(league.paceMax, expectedPace));

    const homeOffensiveRating = homeAnalytics.adjustedOffensiveEfficiency ?? homeOffEff;
    const awayDefensiveRating = awayAnalytics.adjustedDefensiveEfficiency ?? awayDefEff;
    const awayOffensiveRating = awayAnalytics.adjustedOffensiveEfficiency ?? awayOffEff;
    const homeDefensiveRating = homeAnalytics.adjustedDefensiveEfficiency ?? homeDefEff;

    const homeBaseScore = (homeOffensiveRating / 100) * expectedPace;
    const awayBaseScore = (awayOffensiveRating / 100) * expectedPace;

    const homeDefPercentile = calculateDefensivePercentile(homeDefensiveRating);
    const awayDefPercentile = calculateDefensivePercentile(awayDefensiveRating);

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

    homePredicted = homeBaseScore * (1 + homeDefenseImpact) + (homeAnalytics.homeAdvantage ?? league.homeAdvantage);
    awayPredicted = awayBaseScore * (1 + awayDefenseImpact);

    homePredicted = Math.max(league.scoreMin, Math.min(league.scoreMax, homePredicted));
    awayPredicted = Math.max(league.scoreMin, Math.min(league.scoreMax, awayPredicted));
  } else {
    // FALLBACK: Use PPG with opponent defensive adjustment (sport-specific league scale)
    const leagueAvgPPG = league.leagueAvgPpg;
    const leaguePace = league.leagueAvgPace;
    const estimatedHomeDefRating = (homeStats.pointsAllowedPerGame ?? leagueAvgPPG) / leaguePace * 100;
    const estimatedAwayDefRating = (awayStats.pointsAllowedPerGame ?? leagueAvgPPG) / leaguePace * 100;

    const homeDefPercentile = calculateDefensivePercentile(estimatedHomeDefRating);
    const awayDefPercentile = calculateDefensivePercentile(estimatedAwayDefRating);

    const homeOffEst = (homeStats.pointsPerGame ?? leagueAvgPPG) / leaguePace * 100;
    const awayOffEst = (awayStats.pointsPerGame ?? leagueAvgPPG) / leaguePace * 100;

    const homeDefenseAdjustment = calculateDefensiveAdjustment(
      homeOffEst,
      estimatedAwayDefRating,
      awayDefPercentile.percentile
    );
    const awayDefenseAdjustment = calculateDefensiveAdjustment(
      awayOffEst,
      estimatedHomeDefRating,
      homeDefPercentile.percentile
    );

    homePredicted = (homeStats.pointsPerGame ?? leagueAvgPPG) * (1 + homeDefenseAdjustment);
    awayPredicted = (awayStats.pointsPerGame ?? leagueAvgPPG) * (1 + awayDefenseAdjustment);

    const spreadAdjustment = totalScore / 2;
    homePredicted = homePredicted + spreadAdjustment + (homeAnalytics.homeAdvantage ?? league.homeAdvantage);
    awayPredicted = awayPredicted - spreadAdjustment;

    homePredicted = Math.max(league.scoreMin, Math.min(league.scoreMax, homePredicted));
    awayPredicted = Math.max(league.scoreMin, Math.min(league.scoreMax, awayPredicted));
  }

  // Unified model: keep tempo-free total, set margin from win probability so one source of truth
  // Implied spread (points): in basketball ~4 pt margin ≈ 60% win prob; use spread = k * log(p/(1-p))
  const rawTotal = homePredicted + awayPredicted;
  const impliedSpread = (() => {
    const p = Math.max(0.01, Math.min(0.99, homeWinProb));
    const logit = Math.log(p / (1 - p));
    const k = 5; // ~5 points per logit unit: 60% → ~2.5 pt, 70% → ~5 pt
    return Math.max(-25, Math.min(25, k * logit));
  })();
  homePredicted = (rawTotal + impliedSpread) / 2;
  awayPredicted = (rawTotal - impliedSpread) / 2;
  homePredicted = Math.max(league.scoreMin, Math.min(league.scoreMax, homePredicted));
  awayPredicted = Math.max(league.scoreMin, Math.min(league.scoreMax, awayPredicted));

  // Predicted spread (now aligned with win probability by construction)
  const predictedSpread = homePredicted - awayPredicted;

  const dataQuality = hasFourFactors ? 85 : 70;
  const avgConsistency = (awayAnalytics.consistency + homeAnalytics.consistency) / 2;
  const certaintyBonus = Math.abs(homeWinProb - 0.5) * 20;
  const confidence = Math.min(95, Math.max(60, (dataQuality + avgConsistency + certaintyBonus) / 3));

  // Round; no ties (favored team gets +1 if needed)
  let awayFinal = Math.round(awayPredicted);
  let homeFinal = Math.round(homePredicted);
  if (awayFinal === homeFinal) {
    if (homeWinProb >= 0.5) homeFinal += 1;
    else awayFinal += 1;
  }

  const finalSpread = homeFinal - awayFinal;
  
  // Calculate alternate spread suggestion
  const alternateSpread = calculateAlternateSpread(
    finalSpread,
    homeWinProb,
    confidence,
    homeStats.name,
    awayStats.name,
    sport
  );

  return {
    winProbability: {
      away: awayWinProb * 100,
      home: homeWinProb * 100,
    },
    predictedScore: {
      away: awayFinal,
      home: homeFinal,
    },
    predictedSpread: finalSpread,
    alternateSpread,
    confidence,
    keyFactors,
    trace: {
      ...traceData,
      homeWinProbRaw,
      recalibrationApplied,
    },
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

