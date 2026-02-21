/**
 * MLB API – data from ESPN only (no SportsData).
 * Uses the same pattern as NBA/NHL for consistency.
 */

import { TeamStats, GameResult } from "@/types";
import { SportsDataTeam } from "./base-sportsdata-client";
import { espnMLBClient } from "@/lib/api-clients/espn-sport-client";

export async function getMLBTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  return espnMLBClient.getTeamStats(teamName);
}

export async function getMLBRecentGames(teamName: string, limit?: number): Promise<GameResult[]> {
  return espnMLBClient.getRecentGames(teamName, limit ?? 5);
}

export async function findMLBTeamByName(teamName: string): Promise<SportsDataTeam | null> {
  const team = await espnMLBClient.findTeamByName(teamName);
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
export const mlbClient = {
  getTeamSeasonStats: getMLBTeamSeasonStats,
  getRecentGames: getMLBRecentGames,
  findTeamByName: findMLBTeamByName,
  isConfigured: () => true,
};
