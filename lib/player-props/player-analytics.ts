/**
 * Player Analytics
 * 
 * Calculates player analytics from season stats and game logs
 * for use in player prop predictions.
 */

import type {
  PlayerAnalytics,
  PlayerSeasonStats,
  PlayerGameLog,
  NBAPlayer,
} from "./player-types";
import { playerCache } from "./player-cache";

type Trend = "up" | "down" | "stable";

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = calculateAverage(values);
  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length);
}

function determineTrend(recentAvg: number, seasonAvg: number): Trend {
  if (seasonAvg === 0) return "stable";
  const diff = (recentAvg - seasonAvg) / seasonAvg;
  if (diff > 0.1) return "up";
  if (diff < -0.1) return "down";
  return "stable";
}

function calculateSplitAverage(
  games: PlayerGameLog[],
  isHome: boolean
): { points: number; rebounds: number; assists: number; threes: number; gamesPlayed: number } {
  const filtered = games.filter((g) => g.isHome === isHome);
  if (filtered.length === 0) {
    return { points: 0, rebounds: 0, assists: 0, threes: 0, gamesPlayed: 0 };
  }
  
  return {
    points: calculateAverage(filtered.map((g) => g.points)),
    rebounds: calculateAverage(filtered.map((g) => g.rebounds)),
    assists: calculateAverage(filtered.map((g) => g.assists)),
    threes: calculateAverage(filtered.map((g) => g.threes)),
    gamesPlayed: filtered.length,
  };
}

export async function calculatePlayerAnalytics(
  player: NBAPlayer,
  seasonStats: PlayerSeasonStats | null,
  gameLog: PlayerGameLog[]
): Promise<PlayerAnalytics | null> {
  // Need at least some data to calculate analytics
  if (!seasonStats && gameLog.length === 0) {
    return null;
  }
  
  // Season averages (from season stats or calculated from game log)
  const seasonAvg = seasonStats
    ? {
        points: seasonStats.pointsPerGame,
        rebounds: seasonStats.reboundsPerGame,
        assists: seasonStats.assistsPerGame,
        threes: seasonStats.threesPerGame,
        steals: seasonStats.stealsPerGame,
        blocks: seasonStats.blocksPerGame,
        turnovers: seasonStats.turnoversPerGame,
        minutes: seasonStats.minutesPerGame,
        gamesPlayed: seasonStats.gamesPlayed,
      }
    : {
        points: calculateAverage(gameLog.map((g) => g.points)),
        rebounds: calculateAverage(gameLog.map((g) => g.rebounds)),
        assists: calculateAverage(gameLog.map((g) => g.assists)),
        threes: calculateAverage(gameLog.map((g) => g.threes)),
        steals: calculateAverage(gameLog.map((g) => g.steals)),
        blocks: calculateAverage(gameLog.map((g) => g.blocks)),
        turnovers: calculateAverage(gameLog.map((g) => g.turnovers)),
        minutes: calculateAverage(gameLog.map((g) => g.minutes)),
        gamesPlayed: gameLog.length,
      };
  
  // Last 5 games
  const last5 = gameLog.slice(0, 5);
  const last5Avg = {
    points: calculateAverage(last5.map((g) => g.points)),
    rebounds: calculateAverage(last5.map((g) => g.rebounds)),
    assists: calculateAverage(last5.map((g) => g.assists)),
    threes: calculateAverage(last5.map((g) => g.threes)),
    steals: calculateAverage(last5.map((g) => g.steals)),
    blocks: calculateAverage(last5.map((g) => g.blocks)),
    turnovers: calculateAverage(last5.map((g) => g.turnovers)),
    minutes: calculateAverage(last5.map((g) => g.minutes)),
  };
  
  // Last 10 games
  const last10 = gameLog.slice(0, 10);
  const last10Avg = {
    points: calculateAverage(last10.map((g) => g.points)),
    rebounds: calculateAverage(last10.map((g) => g.rebounds)),
    assists: calculateAverage(last10.map((g) => g.assists)),
    threes: calculateAverage(last10.map((g) => g.threes)),
    steals: calculateAverage(last10.map((g) => g.steals)),
    blocks: calculateAverage(last10.map((g) => g.blocks)),
    turnovers: calculateAverage(last10.map((g) => g.turnovers)),
    minutes: calculateAverage(last10.map((g) => g.minutes)),
  };
  
  // Home/Away splits
  const homeSplit = calculateSplitAverage(gameLog, true);
  const awaySplit = calculateSplitAverage(gameLog, false);
  
  // Trends
  const trends = {
    pointsTrend: determineTrend(last5Avg.points, seasonAvg.points),
    reboundsTrend: determineTrend(last5Avg.rebounds, seasonAvg.rebounds),
    assistsTrend: determineTrend(last5Avg.assists, seasonAvg.assists),
    threesTrend: determineTrend(last5Avg.threes, seasonAvg.threes),
  };
  
  // Consistency metrics
  const consistency = {
    pointsStdDev: calculateStandardDeviation(gameLog.map((g) => g.points)),
    reboundsStdDev: calculateStandardDeviation(gameLog.map((g) => g.rebounds)),
    assistsStdDev: calculateStandardDeviation(gameLog.map((g) => g.assists)),
    minutesStdDev: calculateStandardDeviation(gameLog.map((g) => g.minutes)),
  };
  
  // Usage metrics
  const usageMetrics = seasonStats
    ? {
        fieldGoalAttempts: seasonStats.fieldGoalAttemptsPerGame,
        freeThrowAttempts: seasonStats.freeThrowAttemptsPerGame,
        threeAttempts: seasonStats.threeAttemptsPerGame,
        estimatedUsage: calculateEstimatedUsage(seasonStats),
      }
    : {
        fieldGoalAttempts: calculateAverage(gameLog.map((g) => g.fieldGoalAttempts)),
        freeThrowAttempts: calculateAverage(gameLog.map((g) => g.freeThrowAttempts)),
        threeAttempts: calculateAverage(gameLog.map((g) => g.threeAttempts)),
        estimatedUsage: 0,
      };
  
  return {
    playerId: player.id,
    playerName: player.name,
    team: player.team,
    position: player.position,
    seasonAvg,
    last5Avg,
    last10Avg,
    homeSplit,
    awaySplit,
    trends,
    consistency,
    usageMetrics,
  };
}

function calculateEstimatedUsage(stats: PlayerSeasonStats): number {
  // Simplified usage rate proxy
  const fga = stats.fieldGoalAttemptsPerGame || 0;
  const fta = stats.freeThrowAttemptsPerGame || 0;
  const to = stats.turnoversPerGame || 0;
  const minutes = stats.minutesPerGame || 1;
  
  // Possessions used ≈ FGA + 0.44*FTA + TOV
  const possessionsUsed = fga + 0.44 * fta + to;
  
  // Normalize to minutes played (48 min game)
  const perMinute = possessionsUsed / minutes;
  const per48 = perMinute * 48;
  
  // Estimate team possessions per game (~100)
  const teamPossessions = 100;
  
  return (per48 / teamPossessions) * 100;
}

export async function getPlayerAnalyticsForGame(
  homeTeam: string,
  awayTeam: string,
  topPlayersPerTeam: number = 8
): Promise<Map<string, PlayerAnalytics>> {
  const analyticsMap = new Map<string, PlayerAnalytics>();
  
  // Get rosters
  const [homeRoster, awayRoster] = await Promise.all([
    playerCache.getRosterByTeamName(homeTeam),
    playerCache.getRosterByTeamName(awayTeam),
  ]);
  
  // Get top players (by status - active first)
  const activePlayers = [
    ...homeRoster.filter((p) => p.status === "active").slice(0, topPlayersPerTeam),
    ...awayRoster.filter((p) => p.status === "active").slice(0, topPlayersPerTeam),
  ];
  
  // Fetch stats and game logs
  const playerIds = activePlayers.map((p) => p.id);
  const [statsMap, logsMap] = await Promise.all([
    playerCache.getBatchSeasonStats(playerIds),
    playerCache.getBatchGameLogs(playerIds, 10),
  ]);
  
  // Calculate analytics for each player
  for (const player of activePlayers) {
    const seasonStats = statsMap.get(player.id) || null;
    const gameLog = logsMap.get(player.id) || [];
    
    const analytics = await calculatePlayerAnalytics(player, seasonStats, gameLog);
    if (analytics) {
      analyticsMap.set(player.id, analytics);
    }
  }
  
  return analyticsMap;
}

export function getStatForPropType(
  analytics: PlayerAnalytics,
  propType: string,
  useRecent: boolean = true
): { seasonAvg: number; recentAvg: number; trend: Trend } {
  const source = useRecent ? analytics.last5Avg : analytics.last10Avg;
  const season = analytics.seasonAvg;
  
  switch (propType) {
    case "points":
      return {
        seasonAvg: season.points,
        recentAvg: source.points,
        trend: analytics.trends.pointsTrend,
      };
    case "rebounds":
      return {
        seasonAvg: season.rebounds,
        recentAvg: source.rebounds,
        trend: analytics.trends.reboundsTrend,
      };
    case "assists":
      return {
        seasonAvg: season.assists,
        recentAvg: source.assists,
        trend: analytics.trends.assistsTrend,
      };
    case "threes":
      return {
        seasonAvg: season.threes,
        recentAvg: source.threes,
        trend: analytics.trends.threesTrend,
      };
    case "steals":
      return {
        seasonAvg: season.steals,
        recentAvg: source.steals,
        trend: "stable",
      };
    case "blocks":
      return {
        seasonAvg: season.blocks,
        recentAvg: source.blocks,
        trend: "stable",
      };
    case "turnovers":
      return {
        seasonAvg: season.turnovers,
        recentAvg: source.turnovers,
        trend: "stable",
      };
    case "pra":
      return {
        seasonAvg: season.points + season.rebounds + season.assists,
        recentAvg: source.points + source.rebounds + source.assists,
        trend: "stable",
      };
    case "points_rebounds":
      return {
        seasonAvg: season.points + season.rebounds,
        recentAvg: source.points + source.rebounds,
        trend: "stable",
      };
    case "points_assists":
      return {
        seasonAvg: season.points + season.assists,
        recentAvg: source.points + source.assists,
        trend: "stable",
      };
    case "rebounds_assists":
      return {
        seasonAvg: season.rebounds + season.assists,
        recentAvg: source.rebounds + source.assists,
        trend: "stable",
      };
    case "blocks_steals":
      return {
        seasonAvg: season.blocks + season.steals,
        recentAvg: source.blocks + source.steals,
        trend: "stable",
      };
    default:
      return { seasonAvg: 0, recentAvg: 0, trend: "stable" };
  }
}

export function getConsistencyScore(analytics: PlayerAnalytics, propType: string): number {
  const { consistency, seasonAvg } = analytics;
  
  let stdDev: number;
  let avg: number;
  
  switch (propType) {
    case "points":
      stdDev = consistency.pointsStdDev;
      avg = seasonAvg.points;
      break;
    case "rebounds":
      stdDev = consistency.reboundsStdDev;
      avg = seasonAvg.rebounds;
      break;
    case "assists":
      stdDev = consistency.assistsStdDev;
      avg = seasonAvg.assists;
      break;
    default:
      return 50; // Default consistency
  }
  
  if (avg === 0) return 50;
  
  // Coefficient of variation (lower = more consistent)
  const cv = stdDev / avg;
  
  // Convert to 0-100 score (higher = more consistent)
  // CV of 0 = 100, CV of 0.5 = 50, CV of 1 = 0
  return Math.max(0, Math.min(100, (1 - cv) * 100));
}
