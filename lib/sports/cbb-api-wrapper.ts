/**
 * CBB API Wrapper
 * 
 * Wraps the existing sportsdata-api.ts to match the new unified interface
 */

import { TeamStats, GameResult } from "@/types";
import { SportsDataTeam } from "./base-sportsdata-client";
import {
  getTeamSeasonStats as getCBBTeamSeasonStatsOriginal,
  findTeamByName as findCBBTeamByNameOriginal,
} from "../sportsdata-api";

/**
 * Get CBB team season stats (wrapper for existing function)
 */
export async function getCBBTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  return getCBBTeamSeasonStatsOriginal(teamName);
}

/**
 * Get CBB recent games (extracted from TeamStats)
 */
export async function getCBBRecentGames(teamName: string, limit?: number): Promise<GameResult[]> {
  const stats = await getCBBTeamSeasonStatsOriginal(teamName);
  return stats?.recentGames?.slice(0, limit || 5) || [];
}

/**
 * Find CBB team by name (wrapper for existing function)
 */
export async function findCBBTeamByName(teamName: string): Promise<SportsDataTeam | null> {
  const team = await findCBBTeamByNameOriginal(teamName);
  if (!team) return null;
  
  // Transform to SportsDataTeam format
  return {
    TeamID: team.TeamID,
    Key: team.Key,
    Active: team.Active,
    Name: team.School || team.Name,
    City: undefined,
    GlobalTeamID: team.GlobalTeamID,
    Conference: team.Conference,
  };
}

