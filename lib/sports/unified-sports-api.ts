/**
 * Unified Sports API
 * 
 * Provides a single interface to access all sports APIs
 */

import { Sport, getSportConfig } from "./sport-config";
import { TeamStats, GameResult } from "@/types";
import { SportsDataTeam } from "./base-sportsdata-client";

// Import sport-specific clients
import { getNBATeamSeasonStats, getNBARecentGames, findNBATeamByName } from "./nba-api";
import { nflClient, getNFLTeamSeasonStats, getNFLRecentGames, findNFLTeamByName } from "./nfl-api";
import { getNHLTeamSeasonStats, getNHLRecentGames, findNHLTeamByName } from "./nhl-api";
import { mlbClient, getMLBTeamSeasonStats, getMLBRecentGames, findMLBTeamByName } from "./mlb-api";
import {
  getCBBTeamSeasonStats,
  getCBBRecentGames,
  findCBBTeamByName,
} from "./cbb-api-wrapper";
import { espnClient } from "@/lib/api-clients/espn-client";
import { espnNBAClient, espnNHLClient } from "@/lib/api-clients/espn-sport-client";

/**
 * Get team season stats for any sport
 */
export async function getTeamSeasonStats(
  sport: Sport,
  teamName: string
): Promise<TeamStats | null> {
  switch (sport) {
    case "nba":
      return getNBATeamSeasonStats(teamName);
    case "nfl":
      return getNFLTeamSeasonStats(teamName);
    case "nhl":
      return getNHLTeamSeasonStats(teamName);
    case "mlb":
      return getMLBTeamSeasonStats(teamName);
    case "cbb":
      return getCBBTeamSeasonStats(teamName);
    default:
      throw new Error(`Unsupported sport: ${sport}`);
  }
}

/**
 * Get recent games for any sport
 */
export async function getRecentGames(
  sport: Sport,
  teamName: string,
  limit?: number
): Promise<GameResult[]> {
  switch (sport) {
    case "nba":
      return getNBARecentGames(teamName, limit);
    case "nfl":
      return getNFLRecentGames(teamName, limit);
    case "nhl":
      return getNHLRecentGames(teamName, limit);
    case "mlb":
      return getMLBRecentGames(teamName, limit);
    case "cbb":
      return getCBBRecentGames(teamName, limit);
    default:
      throw new Error(`Unsupported sport: ${sport}`);
  }
}

/**
 * Find team by name for any sport
 */
export async function findTeamByName(
  sport: Sport,
  teamName: string
): Promise<SportsDataTeam | null> {
  switch (sport) {
    case "nba":
      return findNBATeamByName(teamName);
    case "nfl":
      return findNFLTeamByName(teamName);
    case "nhl":
      return findNHLTeamByName(teamName);
    case "mlb":
      return findMLBTeamByName(teamName);
    case "cbb":
      return findCBBTeamByName(teamName);
    default:
      throw new Error(`Unsupported sport: ${sport}`);
  }
}

/**
 * Get The Odds API sport key for a sport
 */
export function getOddsApiSportKey(sport: Sport): string {
  return getSportConfig(sport).oddsApiKey;
}

/**
 * Get team logo URL for a sport (CBB, NBA, NHL use ESPN; NFL/MLB return null).
 */
export async function getTeamLogoUrl(
  sport: Sport,
  teamName: string
): Promise<string | null> {
  switch (sport) {
    case "cbb":
      return (await espnClient.getTeamLogoUrl(teamName)) ?? null;
    case "nba":
      return (await espnNBAClient.getTeamLogoUrl(teamName)) ?? null;
    case "nhl":
      return (await espnNHLClient.getTeamLogoUrl(teamName)) ?? null;
    case "nfl":
    case "mlb":
      return null;
    default:
      return null;
  }
}

