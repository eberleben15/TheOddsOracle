/**
 * ESPN CBB API Client
 *
 * Uses ESPN's public site API for men's college basketball (no API key).
 * Base: https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball
 *
 * Provides: teams, scoreboard, team schedule (for stats & recent games), head-to-head.
 */

import { TeamStats, GameResult, HeadToHead } from "@/types";
import { apiUsageTracker } from "@/lib/api-usage-tracker";

const BASE_URL = "https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";
const RATE_LIMIT_MS = 150; // ~6-7 requests per second max to be polite
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

// --- ESPN response types (minimal) ---
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

/** Team statistics endpoint: categories[].stats[] with name/value */
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

function getTeamLogoUrl(team: ESPNTeamRef): string | undefined {
  if (team.logo) return team.logo;
  const href = team.logos?.[0]?.href;
  if (href) return href;
  if (team.id) return `https://a.espncdn.com/i/teamlogos/ncaa/500/${team.id}.png`;
  return undefined;
}

export class ESPNClient {
  private teamsCache: { team: ESPNTeamRef }[] | null = null;
  private teamsCacheTime = 0;
  private readonly TEAMS_CACHE_MS = 1000 * 60 * 60; // 1 hour

  isConfigured(): boolean {
    return true; // No API key required
  }

  /** Fetch all teams (cached). */
  async getAllTeams(): Promise<{ team: ESPNTeamRef }[]> {
    if (this.teamsCache && Date.now() - this.teamsCacheTime < this.TEAMS_CACHE_MS) {
      return this.teamsCache;
    }
    const url = `${BASE_URL}/teams?limit=400`;
    const res = await rateLimitedFetch(url);
    apiUsageTracker.record("ESPN", "getAllTeams", res.ok, false);
    if (!res.ok) return [];
    const data: ESPNTeamsResponse = await res.json();
    const teams =
      data.sports?.[0]?.leagues?.[0]?.teams?.filter((t) => t.team?.id) ?? [];
    this.teamsCache = teams;
    this.teamsCacheTime = Date.now();
    return teams;
  }

  /** Find team by name (flexible match). */
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

  /** Get team by ID (from schedule or scoreboard). */
  async getTeamById(teamId: string): Promise<ESPNTeamRef | null> {
    const teams = await this.getAllTeams();
    const t = teams.find((x) => x.team.id === teamId);
    return t?.team ?? null;
  }

  /** Find team by key (ESPN id or abbreviation, e.g. "61" or "UGA"). */
  async findTeamByKey(teamKey: string): Promise<ESPNTeamRef | null> {
    const teams = await this.getAllTeams();
    const key = teamKey.trim();
    const byId = teams.find((x) => x.team.id === key);
    if (byId) return byId.team;
    const byAbbr = teams.find(
      (x) => (x.team.abbreviation || "").toUpperCase() === key.toUpperCase()
    );
    return byAbbr?.team ?? null;
  }

  /** Get logo URL for a team by name (for use in cards, etc.). */
  async getTeamLogoUrl(teamName: string): Promise<string | undefined> {
    const team = await this.findTeamByName(teamName);
    return team ? getTeamLogoUrl(team) : undefined;
  }

  /** Get scoreboard for a date (YYYYMMDD or YYYY-MM-DD). */
  async getScoreboard(dateStr?: string): Promise<ESPNEvent[]> {
    const date = (dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, "");
    const url = `${BASE_URL}/scoreboard?dates=${date}`;
    const res = await rateLimitedFetch(url);
    apiUsageTracker.record("ESPN", "getScoreboard", res.ok, false);
    if (!res.ok) return [];
    const data: ESPNScoreboardResponse = await res.json();
    return data.events ?? [];
  }

  /** Get team schedule (includes completed games with scores). */
  async getTeamSchedule(teamId: string): Promise<ESPNScheduleResponse | null> {
    const url = `${BASE_URL}/teams/${teamId}/schedule`;
    const res = await rateLimitedFetch(url);
    apiUsageTracker.record("ESPN", "getTeamSchedule", res.ok, false);
    if (!res.ok) return null;
    return res.json();
  }

  /** Get team statistics (FG%, 3P%, FT%, REB, AST, TO, etc.). */
  async getTeamStatistics(teamId: string): Promise<Map<string, number> | null> {
    const url = `${BASE_URL}/teams/${teamId}/statistics`;
    const res = await rateLimitedFetch(url);
    apiUsageTracker.record("ESPN", "getTeamStatistics", res.ok, false);
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

  /** Get game summary (for one event). Optional; used for box score details. */
  async getSummary(_eventId: string): Promise<ESPNEvent | null> {
    return null;
  }

  /** Map ESPN event to GameResult (teamId is the perspective team for winnerKey). */
  eventToGameResult(ev: ESPNEvent, perspectiveTeamId?: string): GameResult | null {
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
    const winnerKey =
      homeScore > awayScore
        ? home.team.abbreviation || home.team.id
        : away.team.abbreviation || away.team.id;
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
      homeTeamLogo: home.team.logo,
      awayTeamLogo: away.team.logo,
    };
  }

  /** Get team stats from ESPN (schedule + scoreboard for record and PPG). */
  async getTeamStats(teamName: string): Promise<TeamStats | null> {
    const team = await this.findTeamByName(teamName);
    if (!team) return null;
    const schedule = await this.getTeamSchedule(team.id);
    if (!schedule?.events?.length) {
      const record = parseRecord(schedule?.team?.recordSummary ?? "0-0");
      const base: TeamStats = {
        id: parseInt(team.id, 10) || 0,
        name: team.displayName || team.shortDisplayName || teamName,
        code: team.abbreviation || team.id,
        logo: getTeamLogoUrl(team),
        wins: record.wins,
        losses: record.losses,
        pointsPerGame: 0,
        pointsAllowedPerGame: 0,
        recentGames: [],
      };
      const statMap = await this.getTeamStatistics(team.id);
      if (statMap) {
        base.fieldGoalPercentage = statMap.get("fieldGoalPct");
        base.threePointPercentage = statMap.get("threePointFieldGoalPct");
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
          base.offensiveReboundRate =
            Math.round((orb / (orb + drb)) * 10000) / 100;
        }
      }
      return base;
    }
    const completed = schedule.events.filter((ev) => {
      const state = ev.competitions?.[0]?.status?.state;
      return state === "post" || ev.competitions?.[0]?.competitors?.every((c) => c.score != null);
    });
    // Most recent first for recentGames
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
    const gamesCount = completed.length;
    const record = parseRecord(schedule.team?.recordSummary ?? "");
    const winsFinal = record.wins !== 0 || record.losses !== 0 ? record.wins : wins;
    const lossesFinal = record.wins !== 0 || record.losses !== 0 ? record.losses : losses;
    const ppg = gamesCount > 0 ? Math.round((totalPoints / gamesCount) * 100) / 100 : 0;
    const papg = gamesCount > 0 ? Math.round((totalOppPoints / gamesCount) * 100) / 100 : 0;

    const base: TeamStats = {
      id: parseInt(team.id, 10) || 0,
      name: team.displayName || team.shortDisplayName || teamName,
      code: team.abbreviation || team.id,
      logo: getTeamLogoUrl(team),
      wins: winsFinal,
      losses: lossesFinal,
      pointsPerGame: ppg,
      pointsAllowedPerGame: papg,
      recentGames: recentGames.slice(0, 10),
    };

    const statMap = await this.getTeamStatistics(team.id);
    if (statMap) {
      base.fieldGoalPercentage = statMap.get("fieldGoalPct");
      base.threePointPercentage = statMap.get("threePointFieldGoalPct");
      base.freeThrowPercentage = statMap.get("freeThrowPct");
      base.reboundsPerGame = statMap.get("avgRebounds");
      base.assistsPerGame = statMap.get("avgAssists");
      base.turnoversPerGame = statMap.get("avgTurnovers");
      base.stealsPerGame = statMap.get("avgSteals");
      base.blocksPerGame = statMap.get("avgBlocks");
      base.assistTurnoverRatio = statMap.get("assistTurnoverRatio");

      const fgm = statMap.get("fieldGoalsMade");
      const fga = statMap.get("fieldGoalsAttempted");
      const threeMade = statMap.get("threePointFieldGoalsMade");
      const tov = statMap.get("turnovers");
      const fta = statMap.get("freeThrowsAttempted");
      const orb = statMap.get("offensiveRebounds");
      const pts = statMap.get("points");
      const gamesPlayed = statMap.get("gamesPlayed") ?? gamesCount;

      if (fga != null && fga > 0 && fgm != null && threeMade != null) {
        base.effectiveFieldGoalPercentage =
          Math.round(((fgm + 0.5 * threeMade) / fga) * 10000) / 100;
      }
      if (tov != null && fga != null && fta != null) {
        const den = fga + 0.44 * fta + tov;
        if (den > 0) base.turnoverRate = Math.round((tov / den) * 10000) / 100;
      }
      if (fga != null && fga > 0 && fta != null) {
        base.freeThrowRate = Math.round((fta / fga) * 10000) / 100;
      }
      if (
        pts != null &&
        fga != null &&
        fta != null &&
        tov != null &&
        orb != null &&
        gamesPlayed != null &&
        gamesPlayed > 0
      ) {
        const poss = fga + 0.44 * fta + tov - orb;
        if (poss > 0) {
          base.offensiveEfficiency = Math.round((pts / poss) * 10000) / 100;
          base.pace = Math.round((poss / gamesPlayed) * 100) / 100;
        }
      }
      if (
        totalOppPoints != null &&
        fga != null &&
        fta != null &&
        tov != null &&
        orb != null &&
        gamesPlayed != null &&
        gamesPlayed > 0
      ) {
        const poss = fga + 0.44 * fta + tov - orb;
        if (poss > 0) {
          base.defensiveEfficiency =
            Math.round((totalOppPoints / poss) * 10000) / 100;
        }
      }
      const drb = statMap.get("defensiveRebounds");
      if (orb != null && drb != null && orb + drb > 0) {
        base.offensiveReboundRate =
          Math.round((orb / (orb + drb)) * 10000) / 100;
      }
    }

    return base;
  }

  /** Get recent games for a team (most recent first, from ESPN schedule). */
  async getRecentGames(teamName: string, limit: number = 10): Promise<GameResult[]> {
    const team = await this.findTeamByName(teamName);
    if (!team) return [];
    const schedule = await this.getTeamSchedule(team.id);
    if (!schedule?.events?.length) return [];
    const completed = schedule.events.filter((ev) => {
      const state = ev.competitions?.[0]?.status?.state;
      return state === "post" || ev.competitions?.[0]?.competitors?.every((c) => c.score != null);
    });
    // ESPN order is not guaranteed; sort by date descending (most recent first)
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

  /** Get head-to-head between two teams (by name or id). */
  async getHeadToHead(team1NameOrId: string, team2NameOrId: string, limit: number = 10): Promise<HeadToHead | null> {
    const id1 = /^\d+$/.test(team1NameOrId) ? team1NameOrId : (await this.findTeamByName(team1NameOrId))?.id;
    const id2 = /^\d+$/.test(team2NameOrId) ? team2NameOrId : (await this.findTeamByName(team2NameOrId))?.id;
    if (!id1 || !id2) return null;
    const s1 = await this.getTeamSchedule(id1);
    const events1 = s1?.events ?? [];
    const h2hEvents = events1.filter((ev) => {
      const comp = ev.competitions?.[0]?.competitors ?? [];
      const ids = new Set(comp.map((c) => c.team?.id).filter(Boolean));
      return ids.has(id1) && ids.has(id2);
    });
    const completed = h2hEvents.filter((ev) => {
      const state = ev.competitions?.[0]?.status?.state;
      return state === "post" || ev.competitions?.[0]?.competitors?.every((c) => c.score != null);
    });
    const games: GameResult[] = [];
    let team1Wins = 0;
    let team2Wins = 0;
    for (const ev of completed.slice(0, limit)) {
      const gr = this.eventToGameResult(ev);
      if (!gr) continue;
      games.push(gr);
      const comp = ev.competitions?.[0]?.competitors ?? [];
      const home = comp.find((c) => c.homeAway === "home");
      const away = comp.find((c) => c.homeAway === "away");
      if (!home || !away) continue;
      const hScore = parseScore(home.score);
      const aScore = parseScore(away.score);
      if (hScore === 0 && aScore === 0) continue;
      if (home.team.id === id1 && hScore > aScore) team1Wins++;
      else if (away.team.id === id1 && aScore > hScore) team1Wins++;
      else if (home.team.id === id2 && hScore > aScore) team2Wins++;
      else if (away.team.id === id2 && aScore > hScore) team2Wins++;
    }
    return {
      games,
      team1Wins,
      team2Wins,
      awayTeamWins: team1Wins,
      homeTeamWins: team2Wins,
    };
  }

  /** Get head-to-head by team IDs (for use from matchup page with ESPN Key). */
  async getHeadToHeadByKey(team1Key: string, team2Key: string, limit: number = 5): Promise<HeadToHead | null> {
    const team1 = await this.getTeamById(team1Key);
    const team2 = await this.getTeamById(team2Key);
    if (!team1 || !team2) return null;
    return this.getHeadToHead(team1.id, team2.id, limit);
  }

  /** Get schedule for a date (list of games). */
  async getSchedule(dateStr?: string): Promise<ESPNEvent[]> {
    return this.getScoreboard(dateStr);
  }

  /** Get live/upcoming games (today's scoreboard). */
  async getLiveScores(): Promise<ESPNEvent[]> {
    return this.getScoreboard();
  }
}

export const espnClient = new ESPNClient();
