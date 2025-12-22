/**
 * SportsData.io API Integration for NCAA Basketball
 * Documentation: https://sportsdata.io/developers/api-documentation/cbb
 * 
 * This is the ONLY stats API for the application.
 * All NCAA basketball statistics come from SportsData.io.
 */

import { TeamStats, GameResult } from "@/types";
import { apiTracker } from "./api-tracker";

const BASE_URL = "https://api.sportsdata.io/v3/cbb";
const API_KEY = process.env.SPORTSDATA_API_KEY;

/**
 * Calculate current NCAA basketball season
 * SportsData uses the ending year of the season (e.g., "2026" for the 2025-2026 season)
 * NCAA basketball season runs November to April:
 * - Nov 2025 - Apr 2026 = season "2026"
 * - Nov 2024 - Apr 2025 = season "2025"
 */
function calculateCurrentSeason(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11 (0=Jan, 10=Nov, 11=Dec)
  
  // If November (10) or December (11), we're in the season that ends next year
  // If January (0) through October (9), we're in the season that ends this year
  if (month >= 10) {
    // November or December - season ends next year
    return String(year + 1);
  } else {
    // January through October - season ends this year
    return String(year);
  }
}

// Current season (format: "2026" for 2025-26 season)
const CURRENT_SEASON = calculateCurrentSeason();
console.log(`[SportsData.io] Using season: ${CURRENT_SEASON} (${parseInt(CURRENT_SEASON) - 1}-${CURRENT_SEASON.slice(2)} season)`);

// Cache for team mappings (SportsData team key -> full data)
const teamCache = new Map<string, any>();
let allTeamsCache: SportsDataTeam[] | null = null;
let teamsCacheExpiry = 0;
let allStatsCache: SportsDataTeamSeason[] | null = null;
let statsCacheExpiry = 0;
let allGamesCache: Map<string, SportsDataGame[]> = new Map();

/**
 * SportsData.io Response Types
 */
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
  
  // Basic scoring
  Points: number;
  PointsPerGame: number;
  OpponentPoints: number;
  OpponentPointsPerGame: number;
  
  // Shooting
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
  
  // Rebounds
  Rebounds: number;
  OffensiveRebounds: number;
  DefensiveRebounds: number;
  
  // Other stats
  Assists: number;
  Turnovers: number;
  Steals: number;
  BlockedShots: number;
  PersonalFouls: number;
  
  // Four Factors (Dean Oliver's metrics)
  EffectiveFieldGoalsPercentage: number;
  TurnOversPercentage: number;
  OffensiveReboundsPercentage: number;
  FreeThrowAttemptRate: number;
  
  // Advanced metrics
  Possessions: number;
  OffensiveRating: number;
  DefensiveRating: number;
  
  // Additional metrics
  TrueShootingPercentage: number;
  AssistRatio: number;
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

export interface SportsDataBoxScore {
  Game: SportsDataGame;
  PlayerGames: SportsDataPlayerGame[];
  TeamGames: SportsDataTeamGame[];
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

export interface SportsDataConference {
  ConferenceID: number;
  Name: string;
  Teams: SportsDataTeam[];
}

/**
 * Helper to track API calls
 */
function logApiCall(endpoint: string, duration: number, cached: boolean, resultCount?: number) {
  const statusEmoji = cached ? "⚡ CACHED" : "🌐 API CALL";
  const countMsg = resultCount !== undefined ? ` (${resultCount} results)` : "";
  console.log(`[${statusEmoji}] SportsData.io - ${endpoint} (${duration}ms)${countMsg}`);
  apiTracker.log(`sportsdata/${endpoint}`, duration, cached);
}

/**
 * Normalize percentage values - handles null, 0-1 format, and 0-100 format
 */
function normalizePercentage(value: number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  // If value is between 0 and 1, it's likely a decimal - convert to percentage
  if (value > 0 && value < 1) {
    return value * 100;
  }
  return value;
}

/**
 * Check if API key is configured
 */
export function isConfigured(): boolean {
  return !!API_KEY;
}

/**
 * Get current season
 */
export function getCurrentSeason(): string {
  return CURRENT_SEASON;
}

/**
 * Get all NCAA teams (cached for 24 hours)
 */
export async function getAllTeams(): Promise<SportsDataTeam[]> {
  const now = Date.now();
  
  // Return cache if valid
  if (allTeamsCache && now < teamsCacheExpiry) {
    return allTeamsCache;
  }
  
  if (!API_KEY) {
    console.warn("SPORTSDATA_API_KEY not configured");
    return [];
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `${BASE_URL}/scores/json/Teams?key=${API_KEY}`,
      {
        next: { revalidate: 86400, tags: ["sportsdata-teams"] }, // 24 hour cache
      }
    );
    
    if (!response.ok) {
      throw new Error(`SportsData.io API error: ${response.status}`);
    }
    
    const data: SportsDataTeam[] = await response.json();
    
    logApiCall("Teams", Date.now() - startTime, false, data.length);
    
    allTeamsCache = data;
    teamsCacheExpiry = now + 86400000; // 24 hours
    
    return data;
  } catch (error) {
    console.error("Error fetching teams from SportsData.io:", error);
    return [];
  }
}

/**
 * Find a team by name (handles various name formats)
 */
export async function findTeamByName(teamName: string): Promise<SportsDataTeam | null> {
  const teams = await getAllTeams();
  
  if (!teamName) return null;
  
  const normalized = teamName.toLowerCase().trim();
  
  // Try exact match on Key (e.g., "WIS" for Wisconsin)
  let match = teams.find(t => t.Key.toLowerCase() === normalized);
  if (match) return match;
  
  // Try exact match on School (e.g., "Wisconsin")
  match = teams.find(t => t.School.toLowerCase() === normalized);
  if (match) return match;
  
  // Try exact match on Name (e.g., "Badgers")
  match = teams.find(t => t.Name.toLowerCase() === normalized);
  if (match) return match;
  
  // Try full team name (e.g., "Wisconsin Badgers")
  match = teams.find(t => 
    `${t.School} ${t.Name}`.toLowerCase() === normalized
  );
  if (match) return match;
  
  // Try exact match on "School Name" format (e.g., "Northern Colorado Bears")
  match = teams.find(t => 
    `${t.School} ${t.Name}`.toLowerCase() === normalized
  );
  if (match) return match;
  
  // Try partial match - be strict to avoid false matches
  // Prefer matches where the search term is LONGER or EQUAL to avoid "Colorado" matching "Northern Colorado"
  match = teams.find(t => {
    const schoolLower = t.School.toLowerCase();
    const fullNameLower = `${t.School} ${t.Name}`.toLowerCase();
    
    // Only match if normalized starts with full name OR full name starts with normalized
    // This means "Northern Colorado" can match "Northern Colorado Bears"
    // but "Colorado" will NOT match "Northern Colorado" (because "Northern Colorado" doesn't start with "Colorado")
    const normalizedIsPrefix = fullNameLower.startsWith(normalized);
    const fullNameIsPrefix = normalized.startsWith(fullNameLower);
    
    if (normalizedIsPrefix || fullNameIsPrefix) {
      return true;
    }
    
    // Also check word-by-word: if all words in normalized are found as words in the team name
    const searchWords = normalized.split(/\s+/).filter(w => w.length > 0);
    const teamWords = fullNameLower.split(/\s+/);
    
    // Only match if ALL search words appear as complete words in the team name
    if (searchWords.length > 0 && searchWords.every(sw => teamWords.some(tw => tw === sw || tw.startsWith(sw)))) {
      // But reject if search term is a single word that's a substring of a longer word
      // (e.g., "Colorado" is a word in "Northern Colorado Bears" - this is OK)
      // (e.g., "Colorado" as substring of "NorthernColorado" - this should NOT match)
      if (searchWords.length === 1) {
        const searchWord = searchWords[0];
        // Check if it appears as a complete word in team name
        if (teamWords.includes(searchWord)) {
          return true;
        }
        // Check if it's part of a compound word that we should match
        // (e.g., "Northern Colorado" contains "Colorado" as a word, so match)
        if (fullNameLower.includes(` ${searchWord} `) || fullNameLower.endsWith(` ${searchWord}`) || fullNameLower.startsWith(`${searchWord} `)) {
          return true;
        }
      } else {
        // Multiple words - all must be present
        return true;
      }
    }
    
    return false;
  });
  
  return match || null;
}

/**
 * Get team season statistics with Four Factors
 */
export async function getTeamSeasonStats(teamName: string): Promise<TeamStats | null> {
  if (!API_KEY) {
    console.warn("SPORTSDATA_API_KEY not configured");
    return null;
  }
  
  // Find the team
  const team = await findTeamByName(teamName);
  if (!team) {
    console.warn(`Team not found in SportsData.io: ${teamName}`);
    return null;
  }
  
  const startTime = Date.now();
  
  try {
    // Fetch all team season stats
    const response = await fetch(
      `${BASE_URL}/stats/json/TeamSeasonStats/${CURRENT_SEASON}?key=${API_KEY}`,
      {
        next: { revalidate: 300, tags: [`sportsdata-stats-${CURRENT_SEASON}`] }, // 5 min cache
      }
    );
    
    if (!response.ok) {
      throw new Error(`SportsData.io API error: ${response.status}`);
    }
    
    const allStats: SportsDataTeamSeason[] = await response.json();
    
    // Find this team's stats
    const teamStats = allStats.find(s => s.TeamID === team.TeamID);
    
    if (!teamStats) {
      console.warn(`No stats found for team ${team.School}`);
      return null;
    }
    
    logApiCall("TeamSeasonStats", Date.now() - startTime, false);
    
    // DEBUG: Log what we're getting from the API
    console.log(`[SPORTSDATA] Raw stats for ${team.School}:`, {
      TeamID: teamStats.TeamID,
      Team: teamStats.Team,
      Games: teamStats.Games,
      Wins: teamStats.Wins,
      Losses: teamStats.Losses,
      PointsPerGame: teamStats.PointsPerGame,
      OpponentPointsPerGame: teamStats.OpponentPointsPerGame,
      FieldGoalsPercentage: teamStats.FieldGoalsPercentage,
      ThreePointersPercentage: teamStats.ThreePointersPercentage,
      // Four Factors
      EffectiveFieldGoalsPercentage: teamStats.EffectiveFieldGoalsPercentage,
      TurnOversPercentage: teamStats.TurnOversPercentage,
      OffensiveReboundsPercentage: teamStats.OffensiveReboundsPercentage,
      FreeThrowAttemptRate: teamStats.FreeThrowAttemptRate,
      // Advanced
      OffensiveRating: teamStats.OffensiveRating,
      DefensiveRating: teamStats.DefensiveRating,
      Possessions: teamStats.Possessions,
    });
    
    // Fetch recent games
    const recentGames = await getTeamRecentGames(team.Key, 5);
    
    // Calculate per-game stats (API may return totals or per-game, handle both)
    const games = teamStats.Games || 1;
    
    // Extract raw values for calculations
    const points = teamStats.Points || 0;
    const oppPoints = teamStats.OpponentPoints || 0;
    const fga = teamStats.FieldGoalsAttempted || 0;
    const fgm = teamStats.FieldGoalsMade || 0;
    const tpm = teamStats.ThreePointersMade || 0;
    const fta = teamStats.FreeThrowsAttempted || 0;
    const ftm = teamStats.FreeThrowsMade || 0;
    const turnovers = teamStats.Turnovers || 0;
    const offReb = teamStats.OffensiveRebounds || 0;
    const defReb = teamStats.DefensiveRebounds || 0;
    const possessions = teamStats.Possessions || (fga + 0.44 * fta + turnovers - offReb);
    
    // Points per game - use PointsPerGame if available, otherwise calculate from recent games
    let ppg = teamStats.PointsPerGame;
    if (!ppg || ppg === 0 || ppg > 100) {
      // If PointsPerGame is missing, invalid, or suspiciously high, calculate from recent games
      if (recentGames.length >= 3) {
        // Calculate from recent games (most accurate fallback)
        const teamScores = recentGames.map(g => {
          const isHome = g.homeTeamKey === team.Key;
          return isHome ? g.homeScore : g.awayScore;
        }).filter(score => score > 0 && score < 150); // Filter out invalid scores
        
        if (teamScores.length >= 3) {
          ppg = teamScores.reduce((a, b) => a + b, 0) / teamScores.length;
        }
      }
      
      // If still no valid ppg, try points / games but validate
      if ((!ppg || ppg === 0 || ppg > 100) && points > 0 && games > 0) {
        const calculatedPpg = points / games;
        // Only use if it's in a reasonable range (40-100 for college basketball)
        if (calculatedPpg >= 40 && calculatedPpg <= 100) {
          ppg = calculatedPpg;
        }
      }
      
      // Final fallback
      if (!ppg || ppg === 0 || ppg > 100) {
        ppg = 72; // League average fallback if no valid data
        console.warn(`[SPORTSDATA] Using league average PPG (72) for ${team.School} - calculated values were invalid`);
      }
    }
    
    // Cap PPG at reasonable maximum (100) for college basketball
    ppg = Math.min(ppg, 100);
    
    // Opponent PPG - calculate from recent games if not available from API
    let oppPpg = teamStats.OpponentPointsPerGame;
    if (!oppPpg || oppPpg === 0 || oppPpg > 100) {
      if (recentGames.length >= 3) {
        // Calculate from recent games (most accurate fallback)
        const oppScores = recentGames.map(g => {
          const isHome = g.homeTeamKey === team.Key;
          return isHome ? g.awayScore : g.homeScore;
        }).filter(score => score > 0 && score < 150); // Filter out invalid scores
        
        if (oppScores.length >= 3) {
          oppPpg = oppScores.reduce((a, b) => a + b, 0) / oppScores.length;
        }
      }
      
      // If still no valid oppPpg, try oppPoints / games but validate
      if ((!oppPpg || oppPpg === 0 || oppPpg > 100) && oppPoints > 0 && games > 0) {
        const calculatedOppPpg = oppPoints / games;
        // Only use if it's in a reasonable range (40-100 for college basketball)
        if (calculatedOppPpg >= 40 && calculatedOppPpg <= 100) {
          oppPpg = calculatedOppPpg;
        }
      }
      
      // Final fallback
      if (!oppPpg || oppPpg === 0 || oppPpg > 100) {
        oppPpg = 72; // League average fallback if no valid data
      }
    }
    
    // Cap OppPpg at reasonable maximum (100) for college basketball
    oppPpg = Math.min(oppPpg, 100);
    
    // === CALCULATE FOUR FACTORS ===
    // 1. eFG% = (FGM + 0.5 * 3PM) / FGA * 100
    const eFGpct = teamStats.EffectiveFieldGoalsPercentage || 
      (fga > 0 ? ((fgm + 0.5 * tpm) / fga * 100) : undefined);
    
    // 2. TOV% = Turnovers / (FGA + 0.44 * FTA + Turnovers) * 100
    const tovPossessions = fga + 0.44 * fta + turnovers;
    const tovRate = teamStats.TurnOversPercentage ?? 
      (tovPossessions > 0 ? (turnovers / tovPossessions * 100) : undefined);
    
    // 3. ORB% = Offensive Rebounds / Total Rebounds * 100 (approximation)
    const totalReb = offReb + defReb;
    const orbRate = teamStats.OffensiveReboundsPercentage ?? 
      (totalReb > 0 ? (offReb / totalReb * 100) : undefined);
    
    // 4. FTR (Free Throw Rate) = FTA / FGA
    const ftr = teamStats.FreeThrowAttemptRate ?? 
      (fga > 0 ? (fta / fga * 100) : undefined);
    
    // === CALCULATE ADVANCED METRICS ===
    // Offensive Rating = Points / Possessions * 100
    const offRtg = teamStats.OffensiveRating ?? 
      (possessions > 0 ? (points / possessions * 100) : ppg * 1.05);
    
    // Defensive Rating = Opponent Points / Possessions * 100
    const defRtg = teamStats.DefensiveRating ?? 
      (possessions > 0 && oppPoints > 0 ? (oppPoints / possessions * 100) : oppPpg * 1.05);
    
    // Pace = Possessions / Games
    const pace = possessions / games || 70;
    
    // Transform to our TeamStats interface
    const stats: TeamStats = {
      id: team.TeamID,
      name: team.School,
      code: team.Key,
      logo: team.TeamLogoUrl,
      wins: teamStats.Wins || 0,
      losses: teamStats.Losses || 0,
      pointsPerGame: ppg,
      pointsAllowedPerGame: oppPpg,
      recentGames,
      
      // Basic stats - handle both percentage formats (0-1 or 0-100)
      fieldGoalPercentage: normalizePercentage(teamStats.FieldGoalsPercentage),
      threePointPercentage: normalizePercentage(teamStats.ThreePointersPercentage),
      freeThrowPercentage: normalizePercentage(teamStats.FreeThrowsPercentage),
      reboundsPerGame: (teamStats.Rebounds || 0) / games,
      assistsPerGame: (teamStats.Assists || 0) / games,
      turnoversPerGame: turnovers / games,
      stealsPerGame: (teamStats.Steals || 0) / games,
      blocksPerGame: (teamStats.BlockedShots || 0) / games,
      foulsPerGame: (teamStats.PersonalFouls || 0) / games,
      
      // Four Factors ⭐ - calculated from raw data
      effectiveFieldGoalPercentage: eFGpct,
      turnoverRate: tovRate,
      offensiveReboundRate: orbRate,
      freeThrowRate: ftr,
      
      // Advanced metrics ⭐ - calculated from raw data
      offensiveEfficiency: offRtg,
      defensiveEfficiency: defRtg,
      pace: pace,
      assistTurnoverRatio: (teamStats.Assists || 0) / Math.max(turnovers, 1),
    };
    
    // DEBUG: Log what we're returning (all values)
    console.log(`[SPORTSDATA] Transformed stats for ${team.School}:`, {
      record: `${stats.wins}-${stats.losses}`,
      scoring: {
        ppg: stats.pointsPerGame?.toFixed(1),
        oppPpg: stats.pointsAllowedPerGame?.toFixed(1),
      },
      shooting: {
        fg: stats.fieldGoalPercentage?.toFixed(1),
        tp: stats.threePointPercentage?.toFixed(1),
        ft: stats.freeThrowPercentage?.toFixed(1),
      },
      fourFactors: {
        eFG: stats.effectiveFieldGoalPercentage?.toFixed(1),
        TOV: stats.turnoverRate?.toFixed(1),
        ORB: stats.offensiveReboundRate?.toFixed(1),
        FTR: stats.freeThrowRate?.toFixed(1),
      },
      advanced: {
        ORtg: stats.offensiveEfficiency?.toFixed(1),
        DRtg: stats.defensiveEfficiency?.toFixed(1),
        pace: stats.pace?.toFixed(1),
      },
      recentGamesCount: stats.recentGames.length,
    });
    
    return stats;
  } catch (error) {
    console.error(`Error fetching team stats for ${teamName}:`, error);
    return null;
  }
}

/**
 * Get team's recent games
 * Returns games with full team names resolved from keys
 */
export async function getTeamRecentGames(
  teamKey: string,
  limit: number = 5
): Promise<GameResult[]> {
  if (!API_KEY) return [];
  
  try {
    // Get all teams to resolve keys to names
    const teams = await getAllTeams();
    const teamMap = new Map(teams.map(t => [t.Key, t]));
    
      // Disable caching for large game lists (over 2MB limit)
      const response = await fetch(
        `${BASE_URL}/scores/json/Games/${CURRENT_SEASON}?key=${API_KEY}`,
        {
          cache: 'no-store', // Large responses can't be cached by Next.js
        }
      );
    
    if (!response.ok) {
      throw new Error(`SportsData.io API error: ${response.status}`);
    }
    
    const allGames: SportsDataGame[] = await response.json();
    
    // Filter games for this team that are finished
    const teamGames = allGames
      .filter(g => 
        (g.HomeTeam === teamKey || g.AwayTeam === teamKey) &&
        g.Status === "Final"
      )
      .sort((a, b) => new Date(b.DateTime).getTime() - new Date(a.DateTime).getTime())
      .slice(0, limit);
    
    // Transform to GameResult format with FULL TEAM NAMES
    const games: GameResult[] = teamGames.map(game => {
      const homeTeamData = teamMap.get(game.HomeTeam);
      const awayTeamData = teamMap.get(game.AwayTeam);
      const homeWon = (game.HomeTeamScore || 0) > (game.AwayTeamScore || 0);
      const winnerKey = homeWon ? game.HomeTeam : game.AwayTeam;
      const winnerData = homeWon ? homeTeamData : awayTeamData;
      
      return {
        id: game.GameID,
        date: new Date(game.DateTime).toLocaleDateString(),
        // Full team names
        homeTeam: homeTeamData?.School || game.HomeTeam,
        awayTeam: awayTeamData?.School || game.AwayTeam,
        // Also keep the keys for matching
        homeTeamKey: game.HomeTeam,
        awayTeamKey: game.AwayTeam,
        homeScore: game.HomeTeamScore || 0,
        awayScore: game.AwayTeamScore || 0,
        // Winner - both name and key
        winner: winnerData?.School || winnerKey,
        winnerKey: winnerKey,
        // Logos
        homeTeamLogo: homeTeamData?.TeamLogoUrl,
        awayTeamLogo: awayTeamData?.TeamLogoUrl,
      };
    });
    
    return games;
  } catch (error) {
    console.error(`Error fetching recent games for ${teamKey}:`, error);
    return [];
  }
}

/**
 * Get live/in-progress games
 */
export async function getLiveGames(): Promise<SportsDataGame[]> {
  if (!API_KEY) return [];
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `${BASE_URL}/scores/json/AreAnyGamesInProgress?key=${API_KEY}`,
      {
        next: { revalidate: 30, tags: ["sportsdata-live-check"] }, // 30 sec cache
      }
    );
    
    if (!response.ok) {
      throw new Error(`SportsData.io API error: ${response.status}`);
    }
    
    const inProgress = await response.json();
    
    if (!inProgress) {
      logApiCall("AreAnyGamesInProgress", Date.now() - startTime, false, 0);
      return [];
    }
    
    // Get today's games
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const gamesResponse = await fetch(
      `${BASE_URL}/scores/json/GamesByDate/${today}?key=${API_KEY}`,
      {
        next: { revalidate: 30, tags: [`sportsdata-games-${today}`] },
      }
    );
    
    if (!gamesResponse.ok) {
      return [];
    }
    
    const todayGames: SportsDataGame[] = await gamesResponse.json();
    
    // Filter for in-progress games
    const liveGames = todayGames.filter(g => 
      g.Status === "InProgress" || g.Status === "Halftime"
    );
    
    logApiCall("LiveGames", Date.now() - startTime, false, liveGames.length);
    
    return liveGames;
  } catch (error) {
    console.error("Error fetching live games:", error);
    return [];
  }
}

/**
 * Get upcoming games (scheduled games for today and next few days)
 */
export async function getUpcomingGames(days: number = 7): Promise<SportsDataGame[]> {
  if (!API_KEY) return [];
  
  const startTime = Date.now();
  
  try {
    const games: SportsDataGame[] = [];
    
    // Fetch games for the next N days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const response = await fetch(
        `${BASE_URL}/scores/json/GamesByDate/${dateStr}?key=${API_KEY}`,
        {
          next: { revalidate: 300, tags: [`sportsdata-games-${dateStr}`] }, // 5 min cache
        }
      );
      
      if (response.ok) {
        const dayGames: SportsDataGame[] = await response.json();
        
        // Filter for scheduled games only
        const scheduled = dayGames.filter(g => g.Status === "Scheduled");
        games.push(...scheduled);
      }
    }
    
    logApiCall("UpcomingGames", Date.now() - startTime, false, games.length);
    
    // Sort by date
    games.sort((a, b) => 
      new Date(a.DateTime).getTime() - new Date(b.DateTime).getTime()
    );
    
    return games;
  } catch (error) {
    console.error("Error fetching upcoming games:", error);
    return [];
  }
}

/**
 * Get head-to-head history between two teams
 * Returns games with full team names resolved from keys
 */
export async function getHeadToHead(
  team1Key: string,
  team2Key: string,
  limit: number = 5
): Promise<GameResult[]> {
  if (!API_KEY) return [];
  
  try {
    // Get all teams to resolve keys to names
    const teams = await getAllTeams();
    const teamMap = new Map(teams.map(t => [t.Key, t]));
    
    // Fetch all games for current season and previous seasons (dynamic)
    const currentSeasonNum = parseInt(CURRENT_SEASON);
    const seasons = [CURRENT_SEASON, String(currentSeasonNum - 1), String(currentSeasonNum - 2)];
    const h2hGames: GameResult[] = [];
    
    for (const season of seasons) {
      // Disable caching for large game lists (over 2MB limit)
      const response = await fetch(
        `${BASE_URL}/scores/json/Games/${season}?key=${API_KEY}`,
        {
          cache: 'no-store', // Large responses can't be cached by Next.js
        }
      );
      
      if (response.ok) {
        const allGames: SportsDataGame[] = await response.json();
        
        // Find matchups between these two teams
        const matchups = allGames.filter(g => 
          ((g.HomeTeam === team1Key && g.AwayTeam === team2Key) ||
           (g.HomeTeam === team2Key && g.AwayTeam === team1Key)) &&
          g.Status === "Final"
        );
        
        matchups.forEach(game => {
          const homeTeamData = teamMap.get(game.HomeTeam);
          const awayTeamData = teamMap.get(game.AwayTeam);
          const homeWon = (game.HomeTeamScore || 0) > (game.AwayTeamScore || 0);
          const winnerKey = homeWon ? game.HomeTeam : game.AwayTeam;
          const winnerData = homeWon ? homeTeamData : awayTeamData;
          
          h2hGames.push({
            id: game.GameID,
            date: new Date(game.DateTime).toLocaleDateString(),
            // Full team names
            homeTeam: homeTeamData?.School || game.HomeTeam,
            awayTeam: awayTeamData?.School || game.AwayTeam,
            // Also keep the keys for matching
            homeTeamKey: game.HomeTeam,
            awayTeamKey: game.AwayTeam,
            homeScore: game.HomeTeamScore || 0,
            awayScore: game.AwayTeamScore || 0,
            // Winner - both name and key
            winner: winnerData?.School || winnerKey,
            winnerKey: winnerKey,
            // Logos
            homeTeamLogo: homeTeamData?.TeamLogoUrl,
            awayTeamLogo: awayTeamData?.TeamLogoUrl,
          });
        });
      }
      
      if (h2hGames.length >= limit) break;
    }
    
    // Sort by date (most recent first) and limit
    h2hGames.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return h2hGames.slice(0, limit);
  } catch (error) {
    console.error(`Error fetching H2H for ${team1Key} vs ${team2Key}:`, error);
    return [];
  }
}

/**
 * Get team schedule (all games for a team this season)
 */
export async function getTeamSchedule(teamKey: string): Promise<SportsDataGame[]> {
  if (!API_KEY) return [];
  
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cacheKey = `schedule-${teamKey}-${CURRENT_SEASON}`;
    const cached = allGamesCache.get(cacheKey);
    if (cached) {
      logApiCall(`TeamSchedule/${teamKey}`, Date.now() - startTime, true, cached.length);
      return cached;
    }
    
    const response = await fetch(
      `${BASE_URL}/scores/json/TeamSchedule/${CURRENT_SEASON}/${teamKey}?key=${API_KEY}`,
      {
        next: { revalidate: 300, tags: [`sportsdata-schedule-${teamKey}`] },
      }
    );
    
    if (!response.ok) {
      throw new Error(`SportsData.io API error: ${response.status}`);
    }
    
    const games: SportsDataGame[] = await response.json();
    
    logApiCall(`TeamSchedule/${teamKey}`, Date.now() - startTime, false, games.length);
    
    // Cache the result
    allGamesCache.set(cacheKey, games);
    
    return games;
  } catch (error) {
    console.error(`Error fetching schedule for ${teamKey}:`, error);
    return [];
  }
}

/**
 * Get box score for a specific game
 */
export async function getBoxScore(gameId: number): Promise<SportsDataBoxScore | null> {
  if (!API_KEY) return null;
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `${BASE_URL}/stats/json/BoxScore/${gameId}?key=${API_KEY}`,
      {
        next: { revalidate: 60, tags: [`sportsdata-boxscore-${gameId}`] },
      }
    );
    
    if (!response.ok) {
      throw new Error(`SportsData.io API error: ${response.status}`);
    }
    
    const boxScore: SportsDataBoxScore = await response.json();
    
    logApiCall(`BoxScore/${gameId}`, Date.now() - startTime, false);
    
    return boxScore;
  } catch (error) {
    console.error(`Error fetching box score for game ${gameId}:`, error);
    return null;
  }
}

/**
 * Get player season stats for all players
 */
export async function getAllPlayerSeasonStats(): Promise<SportsDataPlayerSeason[]> {
  if (!API_KEY) return [];
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `${BASE_URL}/stats/json/PlayerSeasonStats/${CURRENT_SEASON}?key=${API_KEY}`,
      {
        next: { revalidate: 3600, tags: [`sportsdata-player-stats-${CURRENT_SEASON}`] }, // 1 hour cache
      }
    );
    
    if (!response.ok) {
      throw new Error(`SportsData.io API error: ${response.status}`);
    }
    
    const stats: SportsDataPlayerSeason[] = await response.json();
    
    logApiCall("PlayerSeasonStats", Date.now() - startTime, false, stats.length);
    
    return stats;
  } catch (error) {
    console.error("Error fetching player season stats:", error);
    return [];
  }
}

/**
 * Get player stats for a specific team
 */
export async function getTeamPlayerStats(teamKey: string): Promise<SportsDataPlayerSeason[]> {
  const allStats = await getAllPlayerSeasonStats();
  
  // Find team ID
  const team = await findTeamByName(teamKey);
  if (!team) return [];
  
  return allStats.filter(p => p.TeamID === team.TeamID);
}

/**
 * Get all season stats (cached)
 */
export async function getAllTeamSeasonStats(): Promise<SportsDataTeamSeason[]> {
  const now = Date.now();
  
  // Return cache if valid
  if (allStatsCache && now < statsCacheExpiry) {
    return allStatsCache;
  }
  
  if (!API_KEY) {
    console.warn("SPORTSDATA_API_KEY not configured");
    return [];
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `${BASE_URL}/stats/json/TeamSeasonStats/${CURRENT_SEASON}?key=${API_KEY}`,
      {
        next: { revalidate: 300, tags: [`sportsdata-stats-${CURRENT_SEASON}`] },
      }
    );
    
    if (!response.ok) {
      throw new Error(`SportsData.io API error: ${response.status}`);
    }
    
    const data: SportsDataTeamSeason[] = await response.json();
    
    logApiCall("TeamSeasonStats", Date.now() - startTime, false, data.length);
    
    allStatsCache = data;
    statsCacheExpiry = now + 300000; // 5 minutes
    
    return data;
  } catch (error) {
    console.error("Error fetching all team season stats:", error);
    return [];
  }
}

/**
 * Get games by date
 */
export async function getGamesByDate(date: string): Promise<SportsDataGame[]> {
  if (!API_KEY) return [];
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `${BASE_URL}/scores/json/GamesByDate/${date}?key=${API_KEY}`,
      {
        next: { revalidate: 60, tags: [`sportsdata-games-${date}`] },
      }
    );
    
    if (!response.ok) {
      throw new Error(`SportsData.io API error: ${response.status}`);
    }
    
    const games: SportsDataGame[] = await response.json();
    
    logApiCall(`GamesByDate/${date}`, Date.now() - startTime, false, games.length);
    
    return games;
  } catch (error) {
    console.error(`Error fetching games for ${date}:`, error);
    return [];
  }
}

/**
 * Get conference standings
 */
export async function getConferenceStandings(conference: string): Promise<SportsDataTeam[]> {
  const teams = await getAllTeams();
  
  // Filter by conference and sort by conference wins
  const conferenceTeams = teams
    .filter(t => 
      t.ConferenceName?.toLowerCase().includes(conference.toLowerCase()) ||
      t.Conference?.toLowerCase().includes(conference.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by conference winning percentage, then overall wins
      const aConfPct = a.ConferenceWins / (a.ConferenceWins + a.ConferenceLosses || 1);
      const bConfPct = b.ConferenceWins / (b.ConferenceWins + b.ConferenceLosses || 1);
      if (bConfPct !== aConfPct) return bConfPct - aConfPct;
      return (b.Wins - b.Losses) - (a.Wins - a.Losses);
    });
  
  return conferenceTeams;
}

/**
 * Get all conferences with teams
 */
export async function getAllConferences(): Promise<SportsDataConference[]> {
  const teams = await getAllTeams();
  
  // Group teams by conference
  const conferenceMap = new Map<number, SportsDataConference>();
  
  teams.forEach(team => {
    if (!conferenceMap.has(team.ConferenceID)) {
      conferenceMap.set(team.ConferenceID, {
        ConferenceID: team.ConferenceID,
        Name: team.ConferenceName || team.Conference || "Unknown",
        Teams: [],
      });
    }
    conferenceMap.get(team.ConferenceID)!.Teams.push(team);
  });
  
  // Sort teams within each conference by wins
  conferenceMap.forEach(conf => {
    conf.Teams.sort((a, b) => (b.Wins - b.Losses) - (a.Wins - a.Losses));
  });
  
  return Array.from(conferenceMap.values()).sort((a, b) => a.Name.localeCompare(b.Name));
}

/**
 * Test API connection and return status
 */
export async function testConnection(): Promise<{
  connected: boolean;
  teamsCount?: number;
  error?: string;
}> {
  if (!API_KEY) {
    return { connected: false, error: "SPORTSDATA_API_KEY not configured" };
  }
  
  try {
    const teams = await getAllTeams();
    return { connected: true, teamsCount: teams.length };
  } catch (error) {
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Clear all caches (useful for testing)
 */
export function clearCache(): void {
  allTeamsCache = null;
  teamsCacheExpiry = 0;
  allStatsCache = null;
  statsCacheExpiry = 0;
  allGamesCache.clear();
  teamCache.clear();
  console.log("[SportsData.io] Cache cleared");
}

