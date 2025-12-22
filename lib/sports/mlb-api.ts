/**
 * MLB SportsData.io API Integration
 * Documentation: https://sportsdata.io/developers/api-documentation/mlb
 */

import { BaseSportsDataClient, SportsDataTeam, SportsDataGame } from "./base-sportsdata-client";
import { TeamStats, GameResult } from "@/types";

export class MLBClient extends BaseSportsDataClient {
  constructor() {
    super("mlb");
  }

  async getTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
    try {
      const team = await this.findTeamByName(teamName);
      if (!team) {
        console.warn(`[MLB] Team not found: ${teamName}`);
        return null;
      }

      const season = this.getCurrentSeason();
      const endpoint = `/stats/json/TeamSeasonStats/${season}`;
      const allStats = await this.fetch<any[]>(endpoint);

      const teamStats = allStats.find((s) => s.TeamID === team.TeamID);
      if (!teamStats) {
        console.warn(`[MLB] Stats not found for team: ${teamName}`);
        return null;
      }

      return this.transformTeamStats(teamStats, team);
    } catch (error) {
      console.error(`[MLB] Error fetching team stats for ${teamName}:`, error);
      return null;
    }
  }

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
      console.error(`[MLB] Error fetching recent games for ${teamName}:`, error);
      return [];
    }
  }

  private transformTeamStats(stats: any, team: SportsDataTeam): TeamStats {
    const games = stats.Games || 1;

    // MLB uses RunsPerGame
    let ppg = stats.RunsPerGame || stats.PointsPerGame;
    if (!ppg || ppg === 0 || ppg > 8) {
      if (stats.Runs && games > 0) {
        const calculated = stats.Runs / games;
        if (calculated >= 3 && calculated <= 7) {
          ppg = calculated;
        } else {
          ppg = 4.5; // MLB average fallback
        }
      } else {
        ppg = 4.5;
      }
    }

    let oppPpg = stats.RunsAgainstPerGame || stats.OpponentPointsPerGame;
    if (!oppPpg || oppPpg === 0 || oppPpg > 8) {
      if (stats.RunsAgainst && games > 0) {
        const calculated = stats.RunsAgainst / games;
        if (calculated >= 3 && calculated <= 7) {
          oppPpg = calculated;
        } else {
          oppPpg = 4.5;
        }
      } else {
        oppPpg = 4.5;
      }
    }

    ppg = Math.min(ppg, 7.5);
    oppPpg = Math.min(oppPpg, 7.5);

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

    const winner = teamScore > oppScore ? (isHome ? game.HomeTeam : game.AwayTeam) : (isHome ? game.AwayTeam : game.HomeTeam);
    return {
      id: Number(game.GameID),
      date: game.DateTime || new Date().toISOString(),
      homeTeam: game.HomeTeam,
      awayTeam: game.AwayTeam,
      homeTeamKey: game.HomeTeam || "",
      awayTeamKey: game.AwayTeam || "",
      homeScore: game.HomeTeamScore || 0,
      awayScore: game.AwayTeamScore || 0,
      winner: winner,
      winnerKey: winner,
    };
  }
}

export const mlbClient = new MLBClient();

export async function getMLBTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  return mlbClient.getTeamSeasonStats(teamName);
}

export async function getMLBRecentGames(teamName: string, limit?: number): Promise<GameResult[]> {
  return mlbClient.getRecentGames(teamName, limit);
}

export async function findMLBTeamByName(teamName: string): Promise<SportsDataTeam | null> {
  return mlbClient.findTeamByName(teamName);
}

