/**
 * Base SportsData client (stubbed – SportsData.io no longer used)
 *
 * NBA/NFL/NHL/MLB use this base. When SPORTSDATA_API_KEY is not set, all
 * methods return empty/null so no API calls are made. CBB uses ESPN instead.
 */

import { Sport, SportConfig, getSportConfig } from "./sport-config";
import { apiTracker } from "../api-tracker";
import { teamLookupCache } from "../team-lookup-cache";

const API_KEY = process.env.SPORTSDATA_API_KEY;
const SPORTSDATA_DISABLED = !API_KEY;

export interface SportsDataTeam {
  TeamID: number;
  Key: string;
  Active: boolean;
  City?: string;
  Name: string;
  StadiumID?: number;
  Conference?: string;
  Division?: string;
  GlobalTeamID?: number;
  HeadCoach?: string;
  [key: string]: any; // Allow additional sport-specific fields
}

export interface SportsDataGame {
  GameID: number;
  Season: number;
  SeasonType?: number;
  Status: string;
  DateTime?: string;
  DateTimeUTC?: string;
  AwayTeam: string;
  HomeTeam: string;
  AwayTeamID: number;
  HomeTeamID: number;
  AwayTeamScore?: number | null;
  HomeTeamScore?: number | null;
  Updated?: string;
  [key: string]: any; // Allow additional sport-specific fields
}

/**
 * Base client for SportsData.io API calls
 */
export class BaseSportsDataClient {
  protected sport: Sport;
  protected config: SportConfig;
  protected baseUrl: string;

  constructor(sport: Sport) {
    this.sport = sport;
    this.config = getSportConfig(sport);
    this.baseUrl = this.config.baseUrl;
  }

  /** True when SPORTSDATA_API_KEY is set (used by NBA/NFL/NHL/MLB). */
  isConfigured(): boolean {
    return !SPORTSDATA_DISABLED;
  }

  /**
   * Make an API request to SportsData.io (throws when key not set)
   */
  protected async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (SPORTSDATA_DISABLED) {
      throw new Error("SportsData.io is not configured; use ESPN for CBB or set SPORTSDATA_API_KEY for other sports.");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Ocp-Apim-Subscription-Key": API_KEY!,
          ...options?.headers,
        },
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        apiTracker.log(`sportsdata/${endpoint}`, elapsed, false, response.status);
        throw new Error(
          `SportsData.io API error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = await response.json();
      apiTracker.log(`sportsdata/${endpoint}`, elapsed, false, response.status);
      return data as T;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      apiTracker.log(`sportsdata/${endpoint}`, elapsed, false);
      throw error;
    }
  }

  private teamsCache: SportsDataTeam[] | null = null;
  private teamsCacheExpiry = 0;
  private readonly TEAMS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  /**
   * Get all teams for the sport (returns [] when SportsData not configured)
   */
  async getTeams(): Promise<SportsDataTeam[]> {
    if (SPORTSDATA_DISABLED) return [];
    if (this.teamsCache && Date.now() < this.teamsCacheExpiry) {
      return this.teamsCache;
    }
    const endpoint = "/Teams";
    const teams = await this.fetch<SportsDataTeam[]>(endpoint);
    this.teamsCache = teams;
    this.teamsCacheExpiry = Date.now() + this.TEAMS_CACHE_TTL;
    return teams;
  }

  /**
   * Find a team by name (returns null when SportsData not configured)
   */
  async findTeamByName(teamName: string): Promise<SportsDataTeam | null> {
    if (SPORTSDATA_DISABLED) return null;
    const cached = teamLookupCache.get(this.sport, teamName);
    if (cached) return cached;
    const teams = await this.getTeams();
    const normalized = teamName.toLowerCase();

    // Try exact match first
    let team = teams.find(
      (t) => t.Name?.toLowerCase() === normalized || t.Key?.toLowerCase() === normalized
    );

    // Try partial match
    if (!team) {
      team = teams.find(
        (t) =>
          t.Name?.toLowerCase().includes(normalized) ||
          normalized.includes(t.Name?.toLowerCase())
      );
    }

    // Cache the result (even if null, to avoid repeated lookups)
    if (team) {
      teamLookupCache.set(this.sport, teamName, team);
    }

    return team || null;
  }

  /**
   * Get current season identifier
   */
  getCurrentSeason(): string {
    return this.config.currentSeason();
  }
}

