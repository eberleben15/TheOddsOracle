/**
 * NBA API – data from ESPN only (no SportsData).
 */

import { TeamStats, GameResult } from "@/types";
import { SportsDataTeam } from "./base-sportsdata-client";
import { espnNBAClient } from "@/lib/api-clients/espn-sport-client";

export async function getNBATeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  return espnNBAClient.getTeamStats(teamName);
}

export async function getNBARecentGames(teamName: string, limit?: number): Promise<GameResult[]> {
  return espnNBAClient.getRecentGames(teamName, limit ?? 5);
}

export async function findNBATeamByName(teamName: string): Promise<SportsDataTeam | null> {
  const team = await espnNBAClient.findTeamByName(teamName);
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
export const nbaClient = {
  getTeamSeasonStats: getNBATeamSeasonStats,
  getRecentGames: getNBARecentGames,
  findTeamByName: findNBATeamByName,
  isConfigured: () => true,
};
