/**
 * NCAA Basketball Stats API Client - SportsData.io Integration
 * Replaces the old API-Basketball integration with reliable Four Factors data
 */

import { TeamStats, GameResult, HeadToHead } from "@/types";
import { 
  getTeamSeasonStats, 
  findTeamByName, 
  getHeadToHead as getSDHeadToHead 
} from "./sportsdata-api";

/**
 * Search for team by name and get team ID
 * Uses SportsData.io team database
 */
export async function searchTeamByName(teamName: string): Promise<number | null> {
  const team = await findTeamByName(teamName);
  return team ? team.TeamID : null;
}

/**
 * Get comprehensive team statistics with Four Factors
 * Uses SportsData.io season stats endpoint
 */
export async function getTeamStats(teamId: number, teamName?: string): Promise<TeamStats | null> {
  // If teamName is provided, use it directly; otherwise we need to fetch by ID
  if (teamName) {
    return await getTeamSeasonStats(teamName);
  }
  
  // If only ID is provided, we need to search for the team
  // This is less efficient, so prefer passing teamName when possible
  console.warn("[STATS] getTeamStats called with only ID, prefer passing teamName");
  return null;
}

/**
 * Get recent games for a team
 * Note: This is now handled within getTeamStats via SportsData.io
 */
export async function getRecentGames(
  teamId: number,
  limit: number = 10,
  teamName?: string
): Promise<GameResult[]> {
  if (!teamName) {
    console.warn("[STATS] getRecentGames requires teamName for SportsData.io");
    return [];
  }
  
  const stats = await getTeamSeasonStats(teamName);
  if (!stats) return [];
  
  return stats.recentGames.slice(0, limit);
}

/**
 * Get head-to-head matchup history
 */
export async function getHeadToHead(
  team1Id: number,
  team2Id: number,
  team1Name: string = "Team 1",
  team2Name: string = "Team 2"
): Promise<HeadToHead | null> {
  // Find team keys for SportsData.io
  const team1 = await findTeamByName(team1Name);
  const team2 = await findTeamByName(team2Name);
  
  if (!team1 || !team2) {
    console.warn(`[STATS] Could not find teams for H2H: ${team1Name}, ${team2Name}`);
    return null;
  }
  
  const games = await getSDHeadToHead(team1.Key, team2.Key, 5);
  
  if (games.length === 0) {
    return null;
  }
  
  // Count wins for each team
  const team1Wins = games.filter(g => {
    const isHomeWin = g.homeTeam === team1.Key && g.homeScore > g.awayScore;
    const isAwayWin = g.awayTeam === team1.Key && g.awayScore > g.homeScore;
    return isHomeWin || isAwayWin;
  }).length;
  
  const team2Wins = games.length - team1Wins;
  
  return {
    games,
    team1Wins,
    team2Wins,
  };
}

/**
 * Get current NCAA season
 * Format: "2025" for 2024-25 season
 */
export function getCurrentNCAASeason(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-11
  
  // NCAA season runs Nov-Apr
  // Nov-Dec of year X = season X+1
  // Jan-Oct of year X = season X
  const seasonYear = month >= 10 ? year + 1 : year;
  return seasonYear.toString();
}
