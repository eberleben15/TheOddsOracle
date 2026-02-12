/**
 * CBB API Wrapper
 *
 * Uses ESPN (via free-stats-aggregator) for all college basketball data.
 * No SportsData.io dependency.
 */

import { TeamStats, GameResult } from "@/types";
import { SportsDataTeam } from "./base-sportsdata-client";
import { freeStatsAggregator } from "../free-stats-aggregator";
import { espnClient } from "../api-clients/espn-client";

export async function getCBBTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  return freeStatsAggregator.getTeamStats(teamName);
}

export async function getCBBRecentGames(teamName: string, limit?: number): Promise<GameResult[]> {
  return freeStatsAggregator.getRecentGames(teamName, limit ?? 5);
}

export async function findCBBTeamByName(teamName: string): Promise<SportsDataTeam | null> {
  const team = await espnClient.findTeamByName(teamName);
  if (!team) return null;
  return {
    TeamID: parseInt(team.id, 10) || 0,
    Key: team.id,
    Active: true,
    Name: team.displayName || team.shortDisplayName || teamName,
    Conference: undefined,
  };
}
