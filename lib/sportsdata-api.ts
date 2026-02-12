/**
 * CBB Stats API - ESPN-backed (replaces SportsData.io)
 *
 * All NCAA basketball data now comes from ESPN's public API (free, no key).
 * This module keeps the same export surface for compatibility with existing
 * routes and cron jobs. Types are preserved for consumers that expect
 * SportsDataGame, SportsDataTeam, etc.
 */

import { TeamStats, GameResult } from "@/types";
import { freeStatsAggregator } from "./free-stats-aggregator";
import { espnClient } from "./api-clients/espn-client";

// --- Types (preserved for compatibility) ---
export interface SportsDataStadium {
  StadiumID: number;
  Active: boolean;
  Name: string;
  City: string;
  State: string;
  Country: string;
  Capacity: number;
  GeoLat: number | null;
  GeoLong: number | null;
}

export interface SportsDataTeam {
  TeamID: number;
  Key: string;
  Active: boolean;
  School: string;
  Name: string;
  ApRank: number | null;
  Wins: number;
  Losses: number;
  ConferenceWins: number;
  ConferenceLosses: number;
  GlobalTeamID: number;
  ConferenceID: number;
  Conference: string;
  ConferenceName: string;
  TeamLogoUrl: string;
  ShortDisplayName: string;
  Stadium: SportsDataStadium | null;
}

export interface SportsDataGame {
  GameID: number;
  Season: number;
  SeasonType: number;
  Status: string;
  Day: string;
  DateTime: string;
  AwayTeam: string;
  HomeTeam: string;
  AwayTeamID: number;
  HomeTeamID: number;
  AwayTeamScore: number | null;
  HomeTeamScore: number | null;
  Updated: string;
  Period: string | null;
  TimeRemainingMinutes: number | null;
  TimeRemainingSeconds: number | null;
  PointSpread: number | null;
  OverUnder: number | null;
  AwayTeamMoneyLine: number | null;
  HomeTeamMoneyLine: number | null;
  GlobalGameID: number;
  GlobalAwayTeamID: number;
  GlobalHomeTeamID: number;
  TournamentID: number | null;
  Bracket: string | null;
  Round: number | null;
  AwayTeamSeed: number | null;
  HomeTeamSeed: number | null;
  Stadium: SportsDataStadium | null;
  IsClosed: boolean;
}

export interface SportsDataPlayer {
  PlayerID: number;
  FirstName: string;
  LastName: string;
  Team: string;
  TeamID: number;
  Jersey: number;
  Position: string;
  Class: string;
  Height: number;
  Weight: number;
  BirthCity: string;
  BirthState: string;
  HighSchool: string;
  GlobalTeamID: number;
}

export interface SportsDataPlayerSeason {
  StatID: number;
  TeamID: number;
  PlayerID: number;
  Season: number;
  Name: string;
  Team: string;
  Position: string;
  Games: number;
  Minutes: number;
  Points: number;
  FieldGoalsMade: number;
  FieldGoalsAttempted: number;
  FieldGoalsPercentage: number;
  ThreePointersMade: number;
  ThreePointersAttempted: number;
  ThreePointersPercentage: number;
  FreeThrowsMade: number;
  FreeThrowsAttempted: number;
  FreeThrowsPercentage: number;
  Rebounds: number;
  OffensiveRebounds: number;
  DefensiveRebounds: number;
  Assists: number;
  Steals: number;
  BlockedShots: number;
  Turnovers: number;
  PersonalFouls: number;
}

export interface SportsDataPlayerGame {
  StatID: number;
  TeamID: number;
  PlayerID: number;
  Season: number;
  Name: string;
  Position: string;
  Minutes: number;
  Points: number;
  FieldGoalsMade: number;
  FieldGoalsAttempted: number;
  ThreePointersMade: number;
  ThreePointersAttempted: number;
  FreeThrowsMade: number;
  FreeThrowsAttempted: number;
  Rebounds: number;
  Assists: number;
  Steals: number;
  BlockedShots: number;
  Turnovers: number;
}

export interface SportsDataTeamGame {
  StatID: number;
  TeamID: number;
  Season: number;
  Games: number;
  Points: number;
  FieldGoalsMade: number;
  FieldGoalsAttempted: number;
  ThreePointersMade: number;
  ThreePointersAttempted: number;
  FreeThrowsMade: number;
  FreeThrowsAttempted: number;
  Rebounds: number;
  Assists: number;
  Turnovers: number;
}

export interface SportsDataBoxScore {
  Game: SportsDataGame;
  PlayerGames: SportsDataPlayerGame[];
  TeamGames: SportsDataTeamGame[];
}

export interface SportsDataTeamSeason {
  StatID: number;
  TeamID: number;
  Team: string;
  Season: number;
  Name: string;
  Games: number;
  Wins: number;
  Losses: number;
  ConferenceWins: number;
  ConferenceLosses: number;
  Points: number;
  PointsPerGame: number;
  OpponentPoints: number;
  OpponentPointsPerGame: number;
  FieldGoalsMade: number;
  FieldGoalsAttempted: number;
  FieldGoalsPercentage: number;
  TwoPointersMade: number;
  TwoPointersAttempted: number;
  TwoPointersPercentage: number;
  ThreePointersMade: number;
  ThreePointersAttempted: number;
  ThreePointersPercentage: number;
  FreeThrowsMade: number;
  FreeThrowsAttempted: number;
  FreeThrowsPercentage: number;
  Rebounds: number;
  OffensiveRebounds: number;
  DefensiveRebounds: number;
  Assists: number;
  Turnovers: number;
  Steals: number;
  BlockedShots: number;
  PersonalFouls: number;
  EffectiveFieldGoalsPercentage: number;
  TurnOversPercentage: number;
  OffensiveReboundsPercentage: number;
  FreeThrowAttemptRate: number;
  Possessions: number;
  OffensiveRating: number;
  DefensiveRating: number;
  TrueShootingPercentage: number;
  AssistRatio: number;
}

export interface SportsDataConference {
  ConferenceID: number;
  Name: string;
  Teams: SportsDataTeam[];
}

function currentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 10 ? String(year + 1) : String(year);
}

const CURRENT_SEASON = currentSeason();

/** Map ESPN event (from scoreboard/schedule) to SportsDataGame for compatibility. */
function mapESPNEventToSportsDataGame(ev: {
  id: string;
  date: string;
  name?: string;
  competitions?: Array<{
    competitors?: Array<{
      homeAway: string;
      team: { id: string; displayName?: string };
      score?: string | number | { value?: number; displayValue?: string };
    }>;
    status?: { state?: string };
  }>;
}): SportsDataGame {
  const comp = ev.competitions?.[0];
  const competitors = comp?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  const parseScore = (s: unknown): number => {
    if (s == null) return 0;
    if (typeof s === "number") return s;
    if (typeof s === "string") return parseInt(s, 10) || 0;
    if (typeof s === "object" && s !== null && "value" in s) return Number((s as { value?: number }).value) || 0;
    if (typeof s === "object" && s !== null && "displayValue" in s) return parseInt(String((s as { displayValue?: string }).displayValue), 10) || 0;
    return 0;
  };
  const homeScore = home ? parseScore(home.score) : 0;
  const awayScore = away ? parseScore(away.score) : 0;
  const state = comp?.status?.state ?? "";
  const isClosed = state === "post";
  return {
    GameID: parseInt(ev.id, 10) || 0,
    Season: parseInt(CURRENT_SEASON, 10),
    SeasonType: 2,
    Status: isClosed ? "Final" : "Scheduled",
    Day: ev.date?.slice(0, 10) ?? "",
    DateTime: ev.date ?? "",
    HomeTeam: home?.team?.displayName ?? "",
    AwayTeam: away?.team?.displayName ?? "",
    HomeTeamID: parseInt(home?.team?.id ?? "0", 10),
    AwayTeamID: parseInt(away?.team?.id ?? "0", 10),
    HomeTeamScore: isClosed ? homeScore : null,
    AwayTeamScore: isClosed ? awayScore : null,
    Updated: ev.date ?? "",
    Period: null,
    TimeRemainingMinutes: null,
    TimeRemainingSeconds: null,
    PointSpread: null,
    OverUnder: null,
    AwayTeamMoneyLine: null,
    HomeTeamMoneyLine: null,
    GlobalGameID: 0,
    GlobalAwayTeamID: 0,
    GlobalHomeTeamID: 0,
    TournamentID: null,
    Bracket: null,
    Round: null,
    AwayTeamSeed: null,
    HomeTeamSeed: null,
    Stadium: null,
    IsClosed: isClosed,
  };
}

export function isConfigured(): boolean {
  return true;
}

export function getCurrentSeason(): string {
  return CURRENT_SEASON;
}

export async function getAllTeams(): Promise<SportsDataTeam[]> {
  if (!espnClient.isConfigured()) return [];
  const teams = await espnClient.getAllTeams();
  return teams.map(({ team }) => ({
    TeamID: parseInt(team.id, 10) || 0,
    Key: team.id,
    Active: true,
    School: team.displayName ?? team.shortDisplayName ?? "",
    Name: team.name ?? "",
    ApRank: null,
    Wins: 0,
    Losses: 0,
    ConferenceWins: 0,
    ConferenceLosses: 0,
    GlobalTeamID: 0,
    ConferenceID: 0,
    Conference: "",
    ConferenceName: "",
    TeamLogoUrl: team.logo ?? "",
    ShortDisplayName: team.shortDisplayName ?? "",
    Stadium: null,
  }));
}

export async function findTeamByName(teamName: string): Promise<SportsDataTeam | null> {
  const team = await espnClient.findTeamByName(teamName);
  if (!team) return null;
  return {
    TeamID: parseInt(team.id, 10) || 0,
    Key: team.id,
    Active: true,
    School: team.displayName ?? team.shortDisplayName ?? "",
    Name: team.name ?? "",
    ApRank: null,
    Wins: 0,
    Losses: 0,
    ConferenceWins: 0,
    ConferenceLosses: 0,
    GlobalTeamID: 0,
    ConferenceID: 0,
    Conference: "",
    ConferenceName: "",
    TeamLogoUrl: team.logo ?? "",
    ShortDisplayName: team.shortDisplayName ?? "",
    Stadium: null,
  };
}

export async function getTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  return freeStatsAggregator.getTeamStats(teamName);
}

export async function getTeamRecentGames(teamKey: string, limit: number = 5): Promise<GameResult[]> {
  const team = await espnClient.findTeamByKey(teamKey);
  if (!team) return [];
  return freeStatsAggregator.getRecentGames(team.displayName ?? team.shortDisplayName ?? teamKey, limit);
}

export async function getHeadToHead(
  team1Key: string,
  team2Key: string,
  limit: number = 5
): Promise<GameResult[]> {
  const h2h = await freeStatsAggregator.getHeadToHeadByKey(team1Key, team2Key, limit);
  return h2h?.games ?? [];
}

export async function getGamesByDate(date: string): Promise<SportsDataGame[]> {
  const dateNorm = date.replace(/-/g, "");
  const events = await espnClient.getScoreboard(dateNorm);
  return events.map((ev) => mapESPNEventToSportsDataGame(ev));
}

export async function getLiveGames(): Promise<SportsDataGame[]> {
  const events = await espnClient.getScoreboard();
  return events.map((ev) => mapESPNEventToSportsDataGame(ev));
}

export async function getUpcomingGames(days: number = 7): Promise<SportsDataGame[]> {
  const games: SportsDataGame[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
    const events = await espnClient.getScoreboard(dateStr);
    games.push(...events.map((ev) => mapESPNEventToSportsDataGame(ev)));
  }
  games.sort((a, b) => new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime());
  return games;
}

export async function getTeamSchedule(teamKey: string): Promise<SportsDataGame[]> {
  const schedule = await espnClient.getTeamSchedule(teamKey);
  if (!schedule?.events?.length) return [];
  return schedule.events.map((ev) => mapESPNEventToSportsDataGame(ev));
}

export async function getBoxScore(_gameId: number): Promise<SportsDataBoxScore | null> {
  return null;
}

export async function getAllPlayerSeasonStats(): Promise<SportsDataPlayerSeason[]> {
  return [];
}

export async function getTeamPlayerStats(_teamKey: string): Promise<SportsDataPlayerSeason[]> {
  return [];
}

export async function getAllTeamSeasonStats(): Promise<SportsDataTeamSeason[]> {
  return [];
}

export async function getConferenceStandings(_conference: string): Promise<SportsDataTeam[]> {
  return [];
}

export async function getAllConferences(): Promise<SportsDataConference[]> {
  return [];
}

export async function testConnection(): Promise<{
  connected: boolean;
  teamsCount?: number;
  error?: string;
}> {
  try {
    const teams = await getAllTeams();
    return { connected: true, teamsCount: teams.length };
  } catch (e) {
    return { connected: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function clearCache(): void {
  // Optional: clear free-stats cache if it exposes a clear method
}
