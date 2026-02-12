/**
 * ESPN API Client for NBA and NHL
 *
 * Uses ESPN's public site API (no API key). Same shape as CBB:
 * - NBA: https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba
 * - NHL: https://site.web.api.espn.com/apis/site/v2/sports/hockey/nhl
 *
 * Provides: teams, scoreboard, team schedule, team statistics, recent games.
 */

import { TeamStats, GameResult } from "@/types";
import { apiUsageTracker } from "@/lib/api-usage-tracker";

const RATE_LIMIT_MS = 150;
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
}

export type ESPNSportType = "basketball" | "hockey";

interface ESPNTeamRef {
  id: string;
  displayName: string;
  shortDisplayName?: string;
  abbreviation?: string;
  location?: string;
  name?: string;
  logo?: string;
  logos?: Array<{ href: string; rel?: string[] }>;
}

interface ESPNCompetitor {
  id: string;
  homeAway: "home" | "away";
  team: ESPNTeamRef;
  score?: string | number | { value?: number; displayValue?: string };
  winner?: boolean;
  records?: Array<{ summary?: string; type?: string }>;
  statistics?: Array<{ name: string; displayValue?: string; value?: number }>;
}

function parseScore(s: ESPNCompetitor["score"]): number {
  if (s == null) return 0;
  if (typeof s === "number" && !Number.isNaN(s)) return s;
  if (typeof s === "string") return parseInt(s, 10) || 0;
  if (typeof s === "object" && "value" in s) return Number((s as { value?: number }).value) || 0;
  if (typeof s === "object" && "displayValue" in s) return parseInt(String((s as { displayValue?: string }).displayValue), 10) || 0;
  return 0;
}

interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  seasonType?: { id?: string; type?: number; name?: string };
  competitions?: Array<{
    competitors?: ESPNCompetitor[];
    status?: { type?: { completed?: boolean }; state?: string };
  }>;
}

interface ESPNScoreboardResponse {
  events?: ESPNEvent[];
  day?: { date?: string };
}

interface ESPNTeamsResponse {
  sports?: Array<{
    leagues?: Array<{
      teams?: Array<{ team: ESPNTeamRef }>;
    }>;
  }>;
}

interface ESPNScheduleResponse {
  team?: ESPNTeamRef & { recordSummary?: string };
  events?: ESPNEvent[];
}

interface ESPNStatItem {
  name: string;
  value: number;
  displayValue?: string;
  abbreviation?: string;
}
interface ESPNStatsCategory {
  name: string;
  stats?: ESPNStatItem[];
}
interface ESPNTeamStatisticsResponse {
  results?: {
    stats?: {
      categories?: ESPNStatsCategory[];
    };
  };
}

function parseRecord(summary: string): { wins: number; losses: number } {
  const match = summary?.match(/^(\d+)-(\d+)$/);
  if (!match) return { wins: 0, losses: 0 };
  return { wins: parseInt(match[1], 10), losses: parseInt(match[2], 10) };
}

export class ESPNSportClient {
  private teamsCache: { team: ESPNTeamRef }[] | null = null;
  private teamsCacheTime = 0;
  private readonly TEAMS_CACHE_MS = 1000 * 60 * 60;

  constructor(
    private readonly baseUrl: string,
    private readonly sportType: ESPNSportType
  ) {}

  private getLogoFallbackPath(): string {
    return this.sportType === "hockey" ? "nhl" : "nba";
  }


  isConfigured(): boolean {
    return true;
  }

  async getAllTeams(): Promise<{ team: ESPNTeamRef }[]> {
    if (this.teamsCache && Date.now() - this.teamsCacheTime < this.TEAMS_CACHE_MS) {
      return this.teamsCache;
    }
    const url = `${this.baseUrl}/teams?limit=100`;
    const res = await rateLimitedFetch(url);
    apiUsageTracker.record("ESPN", `getAllTeams-${this.sportType}`, res.ok, false);
    if (!res.ok) return [];
    const data: ESPNTeamsResponse = await res.json();
    const teams = data.sports?.[0]?.leagues?.[0]?.teams?.filter((t) => t.team?.id) ?? [];
    this.teamsCache = teams;
    this.teamsCacheTime = Date.now();
    return teams;
  }

  async findTeamByName(teamName: string): Promise<ESPNTeamRef | null> {
    const normalized = teamName.toLowerCase().trim();
    const teams = await this.getAllTeams();
    for (const { team } of teams) {
      const display = (team.displayName || "").toLowerCase();
      const short = (team.shortDisplayName || "").toLowerCase();
      const loc = (team.location || "").toLowerCase();
      const abbr = (team.abbreviation || "").toLowerCase();
      if (
        display === normalized ||
        short === normalized ||
        loc === normalized ||
        abbr === normalized ||
        display.includes(normalized) ||
        normalized.includes(display) ||
        (normalized.split(/\s+/).every((w) => display.includes(w)))
      ) {
        return team;
      }
    }
    return null;
  }

  async getTeamById(teamId: string): Promise<ESPNTeamRef | null> {
    const teams = await this.getAllTeams();
    const t = teams.find((x) => x.team.id === teamId);
    return t?.team ?? null;
  }

  async getTeamSchedule(teamId: string): Promise<ESPNScheduleResponse | null> {
    const url = `${this.baseUrl}/teams/${teamId}/schedule`;
    const res = await rateLimitedFetch(url);
    apiUsageTracker.record("ESPN", `getTeamSchedule-${this.sportType}`, res.ok, false);
    if (!res.ok) return null;
    return res.json();
  }

  async getTeamStatistics(teamId: string): Promise<Map<string, number> | null> {
    const url = `${this.baseUrl}/teams/${teamId}/statistics`;
    const res = await rateLimitedFetch(url);
    apiUsageTracker.record("ESPN", `getTeamStatistics-${this.sportType}`, res.ok, false);
    if (!res.ok) return null;
    const data: ESPNTeamStatisticsResponse = await res.json();
    const categories = data.results?.stats?.categories;
    if (!categories?.length) return null;
    const map = new Map<string, number>();
    for (const cat of categories) {
      for (const stat of cat.stats ?? []) {
        if (stat.name != null && typeof stat.value === "number" && !Number.isNaN(stat.value)) {
          map.set(stat.name, stat.value);
        }
      }
    }
    return map.size ? map : null;
  }

  eventToGameResult(ev: ESPNEvent, _perspectiveTeamId?: string): GameResult | null {
    const comp = ev.competitions?.[0];
    const competitors = comp?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === "home");
    const away = competitors.find((c) => c.homeAway === "away");
    if (!home?.team || !away?.team) return null;
    const homeScore = parseScore(home.score);
    const awayScore = parseScore(away.score);
    const homeName = home.team.displayName || home.team.shortDisplayName || "";
    const awayName = away.team.displayName || away.team.shortDisplayName || "";
    const winner = homeScore > awayScore ? homeName : awayName;
    const winnerKey = homeScore > awayScore ? home.team.abbreviation || home.team.id : away.team.abbreviation || away.team.id;
    return {
      id: parseInt(ev.id, 10) || 0,
      date: ev.date?.slice(0, 10) || "",
      homeTeam: homeName,
      awayTeam: awayName,
      homeTeamKey: home.team.abbreviation || home.team.id,
      awayTeamKey: away.team.abbreviation || away.team.id,
      homeScore,
      awayScore,
      winner,
      winnerKey,
      homeTeamLogo: this.getTeamLogoUrlFromRef(home.team),
      awayTeamLogo: this.getTeamLogoUrlFromRef(away.team),
    };
  }

  async getTeamStats(teamName: string): Promise<TeamStats | null> {
    const team = await this.findTeamByName(teamName);
    if (!team) return null;
    const schedule = await this.getTeamSchedule(team.id);
    const record = parseRecord(schedule?.team?.recordSummary ?? "0-0");

    const base: TeamStats = {
      id: parseInt(team.id, 10) || 0,
      name: team.displayName || team.shortDisplayName || teamName,
      code: team.abbreviation || team.id,
      logo: this.getTeamLogoUrlFromRef(team),
      wins: record.wins,
      losses: record.losses,
      pointsPerGame: 0,
      pointsAllowedPerGame: 0,
      recentGames: [],
    };

    if (!schedule?.events?.length) {
      const statMap = await this.getTeamStatistics(team.id);
      if (this.sportType === "basketball" && statMap) {
        this.applyBasketballStats(base, statMap);
      } else if (this.sportType === "hockey" && statMap) {
        this.applyHockeyStats(base, statMap);
      }
      return base;
    }

    const completed = schedule.events.filter((ev) => {
      const state = ev.competitions?.[0]?.status?.state;
      const isPost = state === "post" || ev.competitions?.[0]?.competitors?.every((c) => c.score != null);
      if (!isPost) return false;
      // Only count Regular Season (type 2) so PPG/PAPG match ESPN; include when seasonType missing
      const st = (ev as ESPNEvent).seasonType;
      if (st != null && st.type !== undefined && st.type !== 2) return false;
      return true;
    });
    const byDateDesc = [...completed].sort((a, b) => {
      const tA = a.date ? new Date(a.date).getTime() : 0;
      const tB = b.date ? new Date(b.date).getTime() : 0;
      return tB - tA;
    });

    let totalPoints = 0;
    let totalOppPoints = 0;
    let wins = 0;
    let losses = 0;
    for (const ev of completed) {
      const comp = ev.competitions?.[0];
      const competitors = comp?.competitors ?? [];
      const home = competitors.find((c) => c.homeAway === "home");
      const away = competitors.find((c) => c.homeAway === "away");
      if (!home?.team || !away?.team) continue;
      const homeScore = parseScore(home.score);
      const awayScore = parseScore(away.score);
      const isHome = home.team.id === team.id;
      const teamScore = isHome ? homeScore : awayScore;
      const oppScore = isHome ? awayScore : homeScore;
      totalPoints += teamScore;
      totalOppPoints += oppScore;
      if (teamScore > oppScore) wins++;
      else losses++;
    }

    const recentGames: GameResult[] = [];
    for (const ev of byDateDesc.slice(0, 10)) {
      const gr = this.eventToGameResult(ev);
      if (gr) recentGames.push(gr);
    }
    base.recentGames = recentGames;

    const gamesCount = completed.length;
    const winsFinal = record.wins !== 0 || record.losses !== 0 ? record.wins : wins;
    const lossesFinal = record.wins !== 0 || record.losses !== 0 ? record.losses : losses;
    base.wins = winsFinal;
    base.losses = lossesFinal;
    base.pointsPerGame = gamesCount > 0 ? Math.round((totalPoints / gamesCount) * 100) / 100 : 0;
    base.pointsAllowedPerGame = gamesCount > 0 ? Math.round((totalOppPoints / gamesCount) * 100) / 100 : 0;

    const statMap = await this.getTeamStatistics(team.id);
    if (this.sportType === "basketball" && statMap) {
      this.applyBasketballStats(base, statMap);
    } else if (this.sportType === "hockey" && statMap) {
      this.applyHockeyStats(base, statMap);
    }

    return base;
  }

  private applyBasketballStats(base: TeamStats, statMap: Map<string, number>): void {
    // Prefer ESPN's official PPG so Quick Comparison matches ESPN (NBA uses "avgPoints")
    const avgPts = statMap.get("avgPoints");
    if (avgPts != null && !Number.isNaN(avgPts)) {
      base.pointsPerGame = Math.round(avgPts * 100) / 100;
    }
    base.fieldGoalPercentage = statMap.get("fieldGoalPct");
    base.threePointPercentage = statMap.get("threePointFieldGoalPct") ?? statMap.get("threePointPct");
    base.freeThrowPercentage = statMap.get("freeThrowPct");
    base.reboundsPerGame = statMap.get("avgRebounds");
    base.assistsPerGame = statMap.get("avgAssists");
    base.turnoversPerGame = statMap.get("avgTurnovers");
    base.stealsPerGame = statMap.get("avgSteals");
    base.blocksPerGame = statMap.get("avgBlocks");
    base.assistTurnoverRatio = statMap.get("assistTurnoverRatio");
    const fga = statMap.get("fieldGoalsAttempted");
    const fta = statMap.get("freeThrowsAttempted");
    const orb = statMap.get("offensiveRebounds");
    const drb = statMap.get("defensiveRebounds");
    if (fga != null && fga > 0 && fta != null) {
      base.freeThrowRate = Math.round((fta / fga) * 10000) / 100;
    }
    if (orb != null && drb != null && orb + drb > 0) {
      base.offensiveReboundRate = Math.round((orb / (orb + drb)) * 10000) / 100;
    }
    const fgm = statMap.get("fieldGoalsMade");
    const threeMade = statMap.get("threePointFieldGoalsMade");
    const tov = statMap.get("turnovers");
    const pts = statMap.get("points");
    const gamesPlayed = statMap.get("gamesPlayed");
    if (fga != null && fga > 0 && fgm != null && threeMade != null) {
      base.effectiveFieldGoalPercentage = Math.round(((fgm + 0.5 * threeMade) / fga) * 10000) / 100;
    }
    if (tov != null && fga != null && fta != null) {
      const den = fga + 0.44 * fta + tov;
      if (den > 0) base.turnoverRate = Math.round((tov / den) * 10000) / 100;
    }
  }

  private applyHockeyStats(base: TeamStats, statMap: Map<string, number>): void {
    // ESPN NHL stats may use different keys; map common ones to pointsPerGame if not set
    const goalsPerGame = statMap.get("goalsPerGame") ?? statMap.get("avgGoals");
    const goalsAgainstPerGame = statMap.get("goalsAgainstPerGame") ?? statMap.get("avgGoalsAgainst");
    if (goalsPerGame != null && base.pointsPerGame === 0) base.pointsPerGame = goalsPerGame;
    if (goalsAgainstPerGame != null && base.pointsAllowedPerGame === 0) base.pointsAllowedPerGame = goalsAgainstPerGame;
  }

  /** Get logo URL for a team by name (for use in cards, etc.). */
  async getTeamLogoUrl(teamName: string): Promise<string | undefined> {
    const team = await this.findTeamByName(teamName);
    return team ? this.getTeamLogoUrlFromRef(team) : undefined;
  }

  private getTeamLogoUrlFromRef(team: ESPNTeamRef): string | undefined {
    if (team.logo) return team.logo;
    const href = team.logos?.[0]?.href;
    if (href) return href;
    if (team.id) return `https://a.espncdn.com/i/teamlogos/${this.getLogoFallbackPath()}/500/${team.id}.png`;
    return undefined;
  }

  async getRecentGames(teamName: string, limit: number = 10): Promise<GameResult[]> {
    const team = await this.findTeamByName(teamName);
    if (!team) return [];
    const schedule = await this.getTeamSchedule(team.id);
    if (!schedule?.events?.length) return [];
    const completed = schedule.events.filter((ev) => {
      const state = ev.competitions?.[0]?.status?.state;
      return state === "post" || ev.competitions?.[0]?.competitors?.every((c) => c.score != null);
    });
    const sorted = [...completed].sort((a, b) => {
      const tA = a.date ? new Date(a.date).getTime() : 0;
      const tB = b.date ? new Date(b.date).getTime() : 0;
      return tB - tA;
    });
    const results: GameResult[] = [];
    for (const ev of sorted.slice(0, limit)) {
      const gr = this.eventToGameResult(ev, team.id);
      if (gr) results.push(gr);
    }
    return results;
  }
}

const NBA_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba";
const NHL_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/hockey/nhl";

export const espnNBAClient = new ESPNSportClient(NBA_BASE, "basketball");
export const espnNHLClient = new ESPNSportClient(NHL_BASE, "hockey");
