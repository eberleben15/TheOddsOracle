/**
 * API-Sports.io Client
 * 
 * Client for API-Sports.io Basketball API
 * Documentation: https://api-sports.io/documentation/basketball
 * 
 * Free Tier: 100 requests/day
 * Best for: Team stats, games, head-to-head
 */

import { BaseApiClient, ApiClientConfig, ApiResponse } from "./base-api-client";
import { TeamStats, GameResult } from "@/types";

export interface APISportsTeam {
  id: number;
  name: string;
  code: string;
  logo?: string;
  country?: {
    name: string;
    code: string;
  };
}

export interface APISportsGame {
  id: number;
  date: string;
  time: string;
  timestamp: number;
  timezone: string;
  status: {
    long: string;
    short: string;
    elapsed?: number;
  };
  teams: {
    home: APISportsTeam;
    away: APISportsTeam;
  };
  scores: {
    home?: {
      quarter_1?: number;
      quarter_2?: number;
      quarter_3?: number;
      quarter_4?: number;
      total?: number;
    };
    away?: {
      quarter_1?: number;
      quarter_2?: number;
      quarter_3?: number;
      quarter_4?: number;
      total?: number;
    };
  };
  league: {
    id: number;
    name: string;
    type: string;
    season: number;
  };
}

export class APISportsClient extends BaseApiClient {
  constructor() {
    super({
      name: "API-Sports.io",
      baseUrl: "https://v1.basketball.api-sports.io",
      apiKeyEnv: "STATS_API_KEY",
      rateLimit: {
        perDay: 100, // Free tier limit
      },
    });
  }

  protected getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (this.config.apiKey) {
      headers["x-apisports-key"] = this.config.apiKey;
    }
    
    return headers;
  }

  /**
   * Search for teams
   */
  async searchTeams(query: string): Promise<ApiResponse<APISportsTeam[]>> {
    const result = await this.request<{ response: APISportsTeam[] }>(
      `/teams?search=${encodeURIComponent(query)}`,
      { method: "GET" },
      `teams-search-${query}`
    );
    if (result.success && result.data && "response" in result.data) {
      return { ...result, data: result.data.response ?? [] } as ApiResponse<APISportsTeam[]>;
    }
    return result as unknown as ApiResponse<APISportsTeam[]>;
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: number): Promise<ApiResponse<APISportsTeam>> {
    return this.request<{ response: APISportsTeam[] }>(
      `/teams?id=${teamId}`,
      { method: "GET" },
      `team-${teamId}`
    ).then(result => {
      if (result.success && result.data && result.data.response?.[0]) {
        return {
          ...result,
          data: result.data.response[0],
        };
      }
      return {
        ...result,
        data: undefined,
      };
    });
  }

  /**
   * Get games for a team
   */
  async getTeamGames(
    teamId: number,
    season?: number,
    date?: string
  ): Promise<ApiResponse<APISportsGame[]>> {
    let endpoint = `/games?team=${teamId}`;
    
    if (season) {
      endpoint += `&season=${season}`;
    }
    
    if (date) {
      endpoint += `&date=${date}`;
    }
    
    const result = await this.request<{ response: APISportsGame[] }>(
      endpoint,
      { method: "GET" },
      `games-team-${teamId}-${season || "all"}-${date || "all"}`
    );
    if (result.success && result.data && "response" in result.data) {
      return { ...result, data: result.data.response ?? [] } as ApiResponse<APISportsGame[]>;
    }
    return result as unknown as ApiResponse<APISportsGame[]>;
  }

  /**
   * Get head-to-head games
   */
  async getHeadToHead(
    team1Id: number,
    team2Id: number,
    season?: number
  ): Promise<ApiResponse<APISportsGame[]>> {
    let endpoint = `/games?h2h=${team1Id}-${team2Id}`;
    
    if (season) {
      endpoint += `&season=${season}`;
    }
    
    const result = await this.request<{ response: APISportsGame[] }>(
      endpoint,
      { method: "GET" },
      `h2h-${team1Id}-${team2Id}-${season || "all"}`
    );
    if (result.success && result.data && "response" in result.data) {
      return { ...result, data: result.data.response ?? [] } as ApiResponse<APISportsGame[]>;
    }
    return result as unknown as ApiResponse<APISportsGame[]>;
  }

  /**
   * Get games for a specific date
   */
  async getGamesByDate(date: string, league?: number): Promise<ApiResponse<APISportsGame[]>> {
    let endpoint = `/games?date=${date}`;
    
    if (league) {
      endpoint += `&league=${league}`; // League 12 = NCAA
    }
    
    const result = await this.request<{ response: APISportsGame[] }>(
      endpoint,
      { method: "GET" },
      `games-date-${date}-${league || "all"}`
    );
    if (result.success && result.data && "response" in result.data) {
      return { ...result, data: result.data.response ?? [] } as ApiResponse<APISportsGame[]>;
    }
    return result as unknown as ApiResponse<APISportsGame[]>;
  }

  /**
   * Get live games
   */
  async getLiveGames(league?: number): Promise<ApiResponse<APISportsGame[]>> {
    let endpoint = `/games?live=all`;
    
    if (league) {
      endpoint += `&league=${league}`;
    }
    
    const result = await this.request<{ response: APISportsGame[] }>(
      endpoint,
      { method: "GET" },
      "live-games"
    );
    if (result.success && result.data && "response" in result.data) {
      return { ...result, data: result.data.response ?? [] } as ApiResponse<APISportsGame[]>;
    }
    return result as unknown as ApiResponse<APISportsGame[]>;
  }

  /**
   * Get all teams for a league
   */
  async getTeamsByLeague(leagueId: number = 12): Promise<ApiResponse<APISportsTeam[]>> {
    const result = await this.request<{ response: APISportsTeam[] }>(
      `/teams?league=${leagueId}`,
      { method: "GET" },
      `teams-league-${leagueId}`
    );
    if (result.success && result.data && "response" in result.data) {
      return { ...result, data: result.data.response ?? [] } as ApiResponse<APISportsTeam[]>;
    }
    return result as unknown as ApiResponse<APISportsTeam[]>;
  }
}
