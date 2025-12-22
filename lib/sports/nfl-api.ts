/**
 * NFL SportsData.io API Integration
 * Documentation: https://sportsdata.io/developers/api-documentation/nfl
 */

import { BaseSportsDataClient, SportsDataTeam, SportsDataGame } from "./base-sportsdata-client";
import { TeamStats, GameResult } from "@/types";

export class NFLClient extends BaseSportsDataClient {
  constructor() {
    super("nfl");
  }

  /**
   * Get team season stats
   */
  async getTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
    try {
      const team = await this.findTeamByName(teamName);
      if (!team) {
        console.warn(`[NFL] Team not found: ${teamName}`);
        return null;
      }

      const season = this.getCurrentSeason();
      const endpoint = `/stats/json/TeamSeasonStats/${season}`;
      const allStats = await this.fetch<any[]>(endpoint);

      const teamStats = allStats.find((s) => s.TeamID === team.TeamID);
      if (!teamStats) {
        console.warn(`[NFL] Stats not found for team: ${teamName}`);
        return null;
      }

      return this.transformTeamStats(teamStats, team);
    } catch (error) {
      console.error(`[NFL] Error fetching team stats for ${teamName}:`, error);
      return null;
    }
  }

  /**
   * Get recent games for a team
   */
  async getRecentGames(teamName: string, limit: number = 5): Promise<GameResult[]> {
    try {
      const team = await this.findTeamByName(teamName);
      if (!team) return [];

      const season = this.getCurrentSeason();
      const endpoint = `/scores/json/TeamGameStatsBySeason/${season}/${team.TeamID}`;
      const games = await this.fetch<SportsDataGame[]>(endpoint);

      const completedGames = games
        .filter((g) => g.Status === "Final" && g.AwayTeamScore !== null && g.HomeTeamScore !== null)
        .sort((a, b) => {
          const dateA = a.DateTime ? new Date(a.DateTime).getTime() : 0;
          const dateB = b.DateTime ? new Date(b.DateTime).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, limit);

      return completedGames.map((g) => this.transformGame(g, team));
    } catch (error) {
      console.error(`[NFL] Error fetching recent games for ${teamName}:`, error);
      return [];
    }
  }

  private transformTeamStats(stats: any, team: SportsDataTeam): TeamStats {
    const games = stats.Games || 1;

    // NFL uses PointsPerGame directly
    let ppg = stats.PointsPerGame;
    if (!ppg || ppg === 0 || ppg > 50) {
      if (stats.Points && games > 0) {
        const calculated = stats.Points / games;
        if (calculated >= 10 && calculated <= 40) {
          ppg = calculated;
        } else {
          ppg = 22; // NFL average fallback
        }
      } else {
        ppg = 22;
      }
    }

    let oppPpg = stats.OpponentPointsPerGame;
    if (!oppPpg || oppPpg === 0 || oppPpg > 50) {
      if (stats.OpponentPoints && games > 0) {
        const calculated = stats.OpponentPoints / games;
        if (calculated >= 10 && calculated <= 40) {
          oppPpg = calculated;
        } else {
          oppPpg = 22;
        }
      } else {
        oppPpg = 22;
      }
    }

    ppg = Math.min(ppg, 40);
    oppPpg = Math.min(oppPpg, 40);

    return {
      id: team.TeamID,
      name: team.Name || "",
      code: team.Key || "",
      logo: undefined,
      wins: stats.Wins || 0,
      losses: stats.Losses || 0,
      pointsPerGame: ppg,
      pointsAllowedPerGame: oppPpg,
      recentGames: [],
    };
  }

  private transformGame(game: SportsDataGame, team: SportsDataTeam): GameResult {
    const isHome = game.HomeTeamID === team.TeamID;
    const teamScore = isHome ? game.HomeTeamScore || 0 : game.AwayTeamScore || 0;
    const oppScore = isHome ? game.AwayTeamScore || 0 : game.HomeTeamScore || 0;

    return {
      id: String(game.GameID),
      date: game.DateTime || new Date().toISOString(),
      homeTeam: game.HomeTeam,
      awayTeam: game.AwayTeam,
      homeScore: game.HomeTeamScore || 0,
      awayScore: game.AwayTeamScore || 0,
      winner: teamScore > oppScore ? (isHome ? game.HomeTeam : game.AwayTeam) : (isHome ? game.AwayTeam : game.HomeTeam),
    };
  }
}

export const nflClient = new NFLClient();

export async function getNFLTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  return nflClient.getTeamSeasonStats(teamName);
}

export async function getNFLRecentGames(teamName: string, limit?: number): Promise<GameResult[]> {
  return nflClient.getRecentGames(teamName, limit);
}

export async function findNFLTeamByName(teamName: string): Promise<SportsDataTeam | null> {
  return nflClient.findTeamByName(teamName);
}

