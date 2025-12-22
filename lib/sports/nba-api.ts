/**
 * NBA SportsData.io API Integration
 * Documentation: https://sportsdata.io/developers/api-documentation/nba
 */

import { BaseSportsDataClient, SportsDataTeam, SportsDataGame } from "./base-sportsdata-client";
import { TeamStats, GameResult } from "@/types";

export class NBAClient extends BaseSportsDataClient {
  constructor() {
    super("nba");
  }

  /**
   * Get team season stats
   */
  async getTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
    try {
      const team = await this.findTeamByName(teamName);
      if (!team) {
        console.warn(`[NBA] Team not found: ${teamName}`);
        return null;
      }

      const season = this.getCurrentSeason();
      const endpoint = `/stats/json/TeamSeasonStats/${season}`;
      const allStats = await this.fetch<any[]>(endpoint);

      const teamStats = allStats.find((s) => s.TeamID === team.TeamID);
      if (!teamStats) {
        console.warn(`[NBA] Stats not found for team: ${teamName}`);
        return null;
      }

      return this.transformTeamStats(teamStats, team);
    } catch (error) {
      console.error(`[NBA] Error fetching team stats for ${teamName}:`, error);
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

      // Filter completed games and sort by date (most recent first)
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
      console.error(`[NBA] Error fetching recent games for ${teamName}:`, error);
      return [];
    }
  }

  /**
   * Transform SportsData.io team stats to our TeamStats format
   */
  private transformTeamStats(stats: any, team: SportsDataTeam): TeamStats {
    const games = stats.Games || 1;

    // Calculate PPG (points per game)
    let ppg = stats.PointsPerGame;
    if (!ppg || ppg === 0 || ppg > 150) {
      if (stats.Points && games > 0) {
        const calculated = stats.Points / games;
        if (calculated >= 80 && calculated <= 130) {
          ppg = calculated;
        } else {
          ppg = 105; // NBA average fallback
        }
      } else {
        ppg = 105;
      }
    }

    // Calculate Opponent PPG
    let oppPpg = stats.OpponentPointsPerGame;
    if (!oppPpg || oppPpg === 0 || oppPpg > 150) {
      if (stats.OpponentPoints && games > 0) {
        const calculated = stats.OpponentPoints / games;
        if (calculated >= 80 && calculated <= 130) {
          oppPpg = calculated;
        } else {
          oppPpg = 105; // NBA average fallback
        }
      } else {
        oppPpg = 105;
      }
    }

    // Cap at reasonable NBA ranges
    ppg = Math.min(ppg, 130);
    oppPpg = Math.min(oppPpg, 130);

    return {
      id: team.TeamID,
      name: team.Name || teamName,
      code: team.Key || "",
      logo: undefined,
      wins: stats.Wins || 0,
      losses: stats.Losses || 0,
      pointsPerGame: ppg,
      pointsAllowedPerGame: oppPpg,
      recentGames: [], // Will be populated separately
    };
  }

  /**
   * Transform SportsData.io game to our GameResult format
   */
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

// Export singleton instance
export const nbaClient = new NBAClient();

// Export convenience functions
export async function getNBATeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  return nbaClient.getTeamSeasonStats(teamName);
}

export async function getNBARecentGames(teamName: string, limit?: number): Promise<GameResult[]> {
  return nbaClient.getRecentGames(teamName, limit);
}

export async function findNBATeamByName(teamName: string): Promise<SportsDataTeam | null> {
  return nbaClient.findTeamByName(teamName);
}

