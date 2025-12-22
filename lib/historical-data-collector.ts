/**
 * Historical Data Collector
 * 
 * Collects historical game results and team stats for calibration and analysis.
 * Stores data that can be used to train and optimize prediction models.
 */

import { getGamesByDate, getAllTeamSeasonStats, getAllTeams, SportsDataGame, SportsDataTeamSeason, SportsDataTeam } from "./sportsdata-api";
import { TeamStats, GameResult } from "@/types";

export interface HistoricalGame {
  gameId: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
  winner: 'home' | 'away';
  season: number;
}

export interface HistoricalTeamStats {
  teamId: number;
  teamName: string;
  season: number;
  stats: TeamStats;
}

export interface HistoricalDataSet {
  games: HistoricalGame[];
  teamStats: HistoricalTeamStats[];
  seasons: number[];
  collectedAt: number;
}

// In-memory storage (in production, use database or file storage)
const historicalDataCache: Map<number, HistoricalDataSet> = new Map(); // Key: season year

/**
 * Calculate season year (e.g., 2024 for 2023-24 season)
 */
function calculateSeasonYear(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11
  
  // NCAA season runs Nov-Apr, so Nov-Dec belong to next season
  if (month >= 10) { // November or December
    return year + 1;
  }
  return year;
}

/**
 * Convert SportsData game to HistoricalGame
 */
function convertToHistoricalGame(game: SportsDataGame): HistoricalGame | null {
  if (!game.HomeTeamScore || !game.AwayTeamScore || !game.IsClosed) {
    return null;
  }
  
  return {
    gameId: game.GameID,
    date: game.DateTime,
    homeTeam: game.HomeTeam,
    awayTeam: game.AwayTeam,
    homeTeamId: game.HomeTeamID,
    awayTeamId: game.AwayTeamID,
    homeScore: game.HomeTeamScore,
    awayScore: game.AwayTeamScore,
    winner: game.HomeTeamScore > game.AwayTeamScore ? 'home' : 'away',
    season: game.Season,
  };
}

/**
 * Collect historical games for a date range
 */
export async function collectHistoricalGames(
  startDate: Date,
  endDate: Date
): Promise<HistoricalGame[]> {
  const games: HistoricalGame[] = [];
  const currentDate = new Date(startDate);
  
  console.log(`Collecting historical games from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    try {
      const dayGames = await getGamesByDate(dateStr);
      const completedGames = dayGames
        .filter(g => g.IsClosed && g.HomeTeamScore !== null && g.AwayTeamScore !== null)
        .map(convertToHistoricalGame)
        .filter((g): g is HistoricalGame => g !== null);
      
      games.push(...completedGames);
      
      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn(`Error collecting games for ${dateStr}:`, error);
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`Collected ${games.length} historical games`);
  return games;
}

/**
 * Collect team stats for a season
 */
export async function collectTeamStatsForSeason(season: number): Promise<HistoricalTeamStats[]> {
  console.log(`Collecting team stats for season ${season}`);
  
  try {
    const [allStats, allTeams] = await Promise.all([
      getAllTeamSeasonStats(),
      getAllTeams(),
    ]);
    
    // Filter to requested season
    const seasonStats = allStats.filter(s => s.Season === season);
    const teamMap = new Map(allTeams.map(t => [t.TeamID, t]));
    
    const historicalStats: HistoricalTeamStats[] = seasonStats.map(stat => {
      const team = teamMap.get(stat.TeamID);
      if (!team) return null;
      
      const pace = stat.Possessions / Math.max(stat.Games, 1);
      
      const stats: TeamStats = {
        id: stat.TeamID,
        name: team.School,
        code: team.Key,
        wins: stat.Wins,
        losses: stat.Losses,
        pointsPerGame: stat.PointsPerGame,
        pointsAllowedPerGame: stat.OpponentPointsPerGame,
        recentGames: [], // Historical games don't include recent games
        offensiveEfficiency: stat.OffensiveRating,
        defensiveEfficiency: stat.DefensiveRating,
        pace: pace,
        effectiveFieldGoalPercentage: stat.EffectiveFieldGoalsPercentage,
        turnoverRate: stat.TurnOversPercentage,
        offensiveReboundRate: stat.OffensiveReboundsPercentage,
        freeThrowRate: stat.FreeThrowAttemptRate,
        fieldGoalPercentage: stat.FieldGoalsPercentage,
        threePointPercentage: stat.ThreePointersPercentage,
        freeThrowPercentage: stat.FreeThrowsPercentage,
        reboundsPerGame: stat.Rebounds / Math.max(stat.Games, 1),
        assistsPerGame: stat.Assists / Math.max(stat.Games, 1),
        turnoversPerGame: stat.Turnovers / Math.max(stat.Games, 1),
        stealsPerGame: stat.Steals / Math.max(stat.Games, 1),
        blocksPerGame: stat.BlockedShots / Math.max(stat.Games, 1),
        foulsPerGame: stat.PersonalFouls / Math.max(stat.Games, 1),
        assistTurnoverRatio: stat.Assists / Math.max(stat.Turnovers, 1),
      };
      
      return {
        teamId: stat.TeamID,
        teamName: team.School,
        season: stat.Season,
        stats,
      };
    }).filter((s): s is HistoricalTeamStats => s !== null);
    
    console.log(`Collected stats for ${historicalStats.length} teams`);
    return historicalStats;
  } catch (error) {
    console.error(`Error collecting team stats for season ${season}:`, error);
    return [];
  }
}

/**
 * Collect complete historical dataset for a season
 */
export async function collectHistoricalDataForSeason(season: number): Promise<HistoricalDataSet> {
  console.log(`\nCollecting historical data for season ${season}`);
  
  // Determine date range for season (approximate: Nov 1 - Apr 15)
  const seasonStart = new Date(season - 1, 10, 1); // November 1 of previous year
  const seasonEnd = new Date(season, 3, 15); // April 15 of season year
  
  const [games, teamStats] = await Promise.all([
    collectHistoricalGames(seasonStart, seasonEnd),
    collectTeamStatsForSeason(season),
  ]);
  
  const dataset: HistoricalDataSet = {
    games,
    teamStats,
    seasons: [season],
    collectedAt: Date.now(),
  };
  
  // Cache the dataset
  historicalDataCache.set(season, dataset);
  
  return dataset;
}

/**
 * Collect historical data for multiple seasons
 */
export async function collectHistoricalDataForSeasons(
  seasons: number[]
): Promise<HistoricalDataSet> {
  console.log(`\nCollecting historical data for seasons: ${seasons.join(', ')}`);
  
  const allGames: HistoricalGame[] = [];
  const allTeamStats: HistoricalTeamStats[] = [];
  
  for (const season of seasons) {
    const dataset = await collectHistoricalDataForSeason(season);
    allGames.push(...dataset.games);
    allTeamStats.push(...dataset.teamStats);
    
    // Rate limiting between seasons
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const combinedDataset: HistoricalDataSet = {
    games: allGames,
    teamStats: allTeamStats,
    seasons,
    collectedAt: Date.now(),
  };
  
  return combinedDataset;
}

/**
 * Get cached historical dataset for a season
 */
export function getCachedHistoricalData(season: number): HistoricalDataSet | null {
  return historicalDataCache.get(season) || null;
}

/**
 * Get all cached historical datasets
 */
export function getAllCachedHistoricalData(): HistoricalDataSet[] {
  return Array.from(historicalDataCache.values());
}

/**
 * Clear cached historical data
 */
export function clearHistoricalDataCache(): void {
  historicalDataCache.clear();
}

/**
 * Get statistics about collected historical data
 */
export function getHistoricalDataStats(): {
  seasons: number[];
  totalGames: number;
  totalTeams: number;
  dateRange: { earliest: string | null; latest: string | null };
} {
  const datasets = Array.from(historicalDataCache.values());
  
  if (datasets.length === 0) {
    return {
      seasons: [],
      totalGames: 0,
      totalTeams: 0,
      dateRange: { earliest: null, latest: null },
    };
  }
  
  const allGames = datasets.flatMap(d => d.games);
  const allTeams = new Set(datasets.flatMap(d => d.teamStats.map(ts => ts.teamId)));
  
  const dates = allGames.map(g => g.date).sort();
  
  return {
    seasons: Array.from(new Set(datasets.flatMap(d => d.seasons))).sort(),
    totalGames: allGames.length,
    totalTeams: allTeams.size,
    dateRange: {
      earliest: dates[0] || null,
      latest: dates[dates.length - 1] || null,
    },
  };
}

/**
 * Find team stats for a specific team and season
 */
export function findTeamStatsForSeason(
  teamId: number,
  season: number
): HistoricalTeamStats | null {
  const dataset = historicalDataCache.get(season);
  if (!dataset) return null;
  
  return dataset.teamStats.find(ts => ts.teamId === teamId && ts.season === season) || null;
}

/**
 * Find games between two teams
 */
export function findGamesBetweenTeams(
  team1Id: number,
  team2Id: number,
  season?: number
): HistoricalGame[] {
  const datasets = season 
    ? [historicalDataCache.get(season)].filter((d): d is HistoricalDataSet => d !== null && d !== undefined)
    : Array.from(historicalDataCache.values());
  
  const allGames = datasets.flatMap(d => d.games);
  
  return allGames.filter(g => 
    (g.homeTeamId === team1Id && g.awayTeamId === team2Id) ||
    (g.homeTeamId === team2Id && g.awayTeamId === team1Id)
  );
}

