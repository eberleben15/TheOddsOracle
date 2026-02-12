/**
 * NHL API – data from ESPN only (no SportsData).
 */

import { TeamStats, GameResult } from "@/types";
import { SportsDataTeam } from "./base-sportsdata-client";
import { espnNHLClient } from "@/lib/api-clients/espn-sport-client";

export async function getNHLTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  return espnNHLClient.getTeamStats(teamName);
}

export async function getNHLRecentGames(teamName: string, limit?: number): Promise<GameResult[]> {
  return espnNHLClient.getRecentGames(teamName, limit ?? 5);
}

export async function findNHLTeamByName(teamName: string): Promise<SportsDataTeam | null> {
  const team = await espnNHLClient.findTeamByName(teamName);
  if (!team) return null;
  return {
    TeamID: parseInt(team.id, 10) || 0,
    Key: team.id,
    Active: true,
    Name: team.displayName || team.shortDisplayName || teamName,
    Conference: undefined,
  };
}

// Legacy export for code that still references the client instance
export const nhlClient = {
  getTeamSeasonStats: getNHLTeamSeasonStats,
  getRecentGames: getNHLRecentGames,
  findTeamByName: findNHLTeamByName,
  isConfigured: () => true,
};
