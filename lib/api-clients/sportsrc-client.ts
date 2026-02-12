/**
 * SportSRC API Client
 * 
 * Client for SportSRC API (free forever, no API key required)
 * Documentation: https://www.sportsrc.org/
 * 
 * Best for: Schedules, live scores
 */

import { BaseApiClient, ApiClientConfig, ApiResponse } from "./base-api-client";
import { TeamStats, GameResult } from "@/types";

export interface SportSRCSchedule {
  date: string;
  games: SportSRCGame[];
}

export interface SportSRCGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  date: string;
  time?: string;
}

export class SportSRCClient extends BaseApiClient {
  constructor() {
    super({
      name: "SportSRC",
      baseUrl: "https://www.sportsrc.org/api",
      // No API key needed
    });
  }

  protected getDefaultHeaders(): Record<string, string> {
    // SportSRC doesn't require authentication
    return {
      "Content-Type": "application/json",
    };
  }

  /**
   * Get schedule for a specific date
   */
  async getSchedule(date?: string): Promise<ApiResponse<SportSRCSchedule>> {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const endpoint = `/basketball/schedule?date=${dateStr}`;
    
    return this.request<SportSRCSchedule>(endpoint, {
      method: "GET",
    }, `schedule-${dateStr}`);
  }

  /**
   * Get live scores
   */
  async getLiveScores(): Promise<ApiResponse<SportSRCGame[]>> {
    return this.request<SportSRCGame[]>(`/basketball/live`, {
      method: "GET",
    }, "live-scores");
  }

  /**
   * Get team list
   */
  async getTeams(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/basketball/teams`, {
      method: "GET",
    }, "teams-list");
  }

  /**
   * Search for a team
   */
  async searchTeam(teamName: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/basketball/teams?name=${encodeURIComponent(teamName)}`, {
      method: "GET",
    }, `team-search-${teamName}`);
  }
}
