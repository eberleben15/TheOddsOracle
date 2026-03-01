/**
 * ESPN Player API for NBA
 * 
 * Fetches player rosters, season stats, and game logs from ESPN's public API.
 * No API key required.
 */

import type {
  NBAPlayer,
  PlayerSeasonStats,
  PlayerGameLog,
  PlayerStatus,
  ESPNRosterResponse,
  ESPNPlayerResponse,
} from "./player-types";

const NBA_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const NBA_CORE_BASE = "https://sports.core.api.espn.com/v2/sports/basketball/leagues/nba";

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
    next: { revalidate: 300 },
  });
}

function parsePlayerStatus(player: ESPNPlayerResponse): PlayerStatus {
  if (!player.injuries || player.injuries.length === 0) {
    return "active";
  }
  const injury = player.injuries[0];
  const status = injury.status?.toLowerCase() ?? "";
  if (status.includes("out")) return "out";
  if (status.includes("day-to-day") || status.includes("questionable") || status.includes("doubtful")) {
    return "day-to-day";
  }
  if (status.includes("injured") || status.includes("ir")) return "injured";
  return "active";
}

function parseESPNPlayer(player: ESPNPlayerResponse, teamName: string, teamId: string): NBAPlayer {
  return {
    id: player.id,
    name: player.displayName || player.fullName || `${player.firstName} ${player.lastName}`,
    firstName: player.firstName || "",
    lastName: player.lastName || "",
    team: teamName,
    teamId: teamId,
    position: player.position?.abbreviation || player.position?.name || "N/A",
    jersey: parseInt(player.jersey || "0", 10),
    headshotUrl: player.headshot?.href,
    status: parsePlayerStatus(player),
  };
}

// ============================================================================
// Team Roster
// ============================================================================

export async function getNBATeamRoster(teamId: string): Promise<NBAPlayer[]> {
  try {
    const url = `${NBA_BASE}/teams/${teamId}/roster`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) {
      console.error(`ESPN roster fetch failed: ${res.status}`);
      return [];
    }
    const data = await res.json() as ESPNRosterResponse;
    const teamName = data.team?.name || "";
    const athletes = data.athletes || [];
    
    return athletes.map((athlete) => parseESPNPlayer(athlete, teamName, teamId));
  } catch (error) {
    console.error("Error fetching NBA team roster:", error);
    return [];
  }
}

export async function findNBATeamId(teamName: string): Promise<string | null> {
  try {
    const url = `${NBA_BASE}/teams`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) return null;
    
    interface TeamsResponse {
      sports?: Array<{
        leagues?: Array<{
          teams?: Array<{
            team: {
              id: string;
              displayName?: string;
              shortDisplayName?: string;
              name?: string;
              location?: string;
              abbreviation?: string;
            };
          }>;
        }>;
      }>;
    }
    
    const data = await res.json() as TeamsResponse;
    const teams = data.sports?.[0]?.leagues?.[0]?.teams ?? [];
    const normalized = teamName.toLowerCase().trim();
    
    for (const { team } of teams) {
      const names = [
        team.displayName,
        team.shortDisplayName,
        team.name,
        team.location,
        team.abbreviation,
        `${team.location} ${team.name}`,
      ].filter(Boolean).map((n) => n!.toLowerCase());
      
      if (names.some((n) => n.includes(normalized) || normalized.includes(n))) {
        return team.id;
      }
    }
    return null;
  } catch (error) {
    console.error("Error finding NBA team ID:", error);
    return null;
  }
}

// ============================================================================
// Player Season Stats
// ============================================================================

interface ESPNAthleteStatsResponse {
  athlete?: ESPNPlayerResponse;
  statistics?: Array<{
    season?: { year: number; type?: number };
    splits?: {
      categories?: Array<{
        name: string;
        stats?: Array<{
          name: string;
          value: number;
          displayValue?: string;
        }>;
      }>;
    };
  }>;
}

export async function getNBAPlayerSeasonStats(playerId: string): Promise<PlayerSeasonStats | null> {
  try {
    const currentYear = new Date().getFullYear();
    const season = currentYear;
    const url = `${NBA_CORE_BASE}/seasons/${season}/types/2/athletes/${playerId}/statistics`;
    
    const res = await rateLimitedFetch(url);
    if (!res.ok) {
      console.error(`ESPN player stats fetch failed: ${res.status}`);
      return null;
    }
    
    const data = await res.json() as ESPNAthleteStatsResponse;
    const splits = data.statistics?.[0]?.splits;
    if (!splits?.categories) return null;
    
    const statMap = new Map<string, number>();
    for (const category of splits.categories) {
      for (const stat of category.stats || []) {
        statMap.set(stat.name.toLowerCase(), stat.value);
      }
    }
    
    const athleteRes = await rateLimitedFetch(`${NBA_BASE}/athletes/${playerId}`);
    let playerName = `Player ${playerId}`;
    let team = "";
    if (athleteRes.ok) {
      const athleteData = await athleteRes.json() as { athlete?: ESPNPlayerResponse; team?: { displayName?: string } };
      playerName = athleteData.athlete?.displayName || playerName;
      team = athleteData.team?.displayName || "";
    }
    
    return {
      playerId,
      playerName,
      team,
      season: `${season}`,
      gamesPlayed: statMap.get("gamesplayed") ?? statMap.get("gp") ?? 0,
      gamesStarted: statMap.get("gamesstarted") ?? statMap.get("gs") ?? 0,
      minutesPerGame: statMap.get("avgminutes") ?? statMap.get("mins") ?? 0,
      pointsPerGame: statMap.get("avgpoints") ?? statMap.get("pts") ?? 0,
      reboundsPerGame: statMap.get("avgrebounds") ?? statMap.get("reb") ?? 0,
      offensiveReboundsPerGame: statMap.get("avgoffensiverebounds") ?? statMap.get("oreb") ?? 0,
      defensiveReboundsPerGame: statMap.get("avgdefensiverebounds") ?? statMap.get("dreb") ?? 0,
      assistsPerGame: statMap.get("avgassists") ?? statMap.get("ast") ?? 0,
      stealsPerGame: statMap.get("avgsteals") ?? statMap.get("stl") ?? 0,
      blocksPerGame: statMap.get("avgblocks") ?? statMap.get("blk") ?? 0,
      turnoversPerGame: statMap.get("avgturnovers") ?? statMap.get("to") ?? 0,
      foulsPerGame: statMap.get("avgfouls") ?? statMap.get("pf") ?? 0,
      threesPerGame: statMap.get("avgthreepointfieldgoalsmade") ?? statMap.get("3pm") ?? 0,
      threeAttemptsPerGame: statMap.get("avgthreepointfieldgoalsattempted") ?? statMap.get("3pa") ?? 0,
      fieldGoalsPerGame: statMap.get("avgfieldgoalsmade") ?? statMap.get("fgm") ?? 0,
      fieldGoalAttemptsPerGame: statMap.get("avgfieldgoalsattempted") ?? statMap.get("fga") ?? 0,
      freeThrowsPerGame: statMap.get("avgfreethrowsmade") ?? statMap.get("ftm") ?? 0,
      freeThrowAttemptsPerGame: statMap.get("avgfreethrowsattempted") ?? statMap.get("fta") ?? 0,
      fieldGoalPct: statMap.get("fieldgoalspct") ?? statMap.get("fgpct") ?? 0,
      threePointPct: statMap.get("threepointfieldgoalspct") ?? statMap.get("3ppct") ?? 0,
      freeThrowPct: statMap.get("freethrowspct") ?? statMap.get("ftpct") ?? 0,
      plusMinusPerGame: statMap.get("plusminus") ?? undefined,
    };
  } catch (error) {
    console.error("Error fetching NBA player season stats:", error);
    return null;
  }
}

// ============================================================================
// Player Game Log
// ============================================================================

interface ESPNGameLogResponse {
  events?: Array<{
    id: string;
    date: string;
    atVs: string;
    opponent: {
      id: string;
      displayName: string;
      abbreviation: string;
    };
    gameResult: string;
    stats: Array<{
      name: string;
      value: string;
    }>;
  }>;
}

export async function getNBAPlayerGameLog(playerId: string, limit: number = 10): Promise<PlayerGameLog[]> {
  try {
    const currentYear = new Date().getFullYear();
    const url = `${NBA_BASE}/athletes/${playerId}/gamelog?season=${currentYear}`;
    
    const res = await rateLimitedFetch(url);
    if (!res.ok) {
      console.error(`ESPN game log fetch failed: ${res.status}`);
      return [];
    }
    
    const data = await res.json() as ESPNGameLogResponse;
    const events = data.events || [];
    const gameLogs: PlayerGameLog[] = [];
    
    for (const event of events.slice(0, limit)) {
      const statMap = new Map<string, number>();
      for (const stat of event.stats || []) {
        const val = parseFloat(stat.value);
        if (!isNaN(val)) {
          statMap.set(stat.name.toLowerCase(), val);
        }
      }
      
      const isHome = event.atVs?.toLowerCase() === "vs";
      const result = event.gameResult?.startsWith("W") ? "W" : "L";
      
      gameLogs.push({
        gameId: event.id,
        date: event.date,
        opponent: event.opponent?.displayName || "Unknown",
        opponentId: event.opponent?.id,
        isHome,
        result,
        minutes: statMap.get("min") ?? statMap.get("mins") ?? 0,
        points: statMap.get("pts") ?? 0,
        rebounds: statMap.get("reb") ?? 0,
        offensiveRebounds: statMap.get("oreb") ?? 0,
        defensiveRebounds: statMap.get("dreb") ?? 0,
        assists: statMap.get("ast") ?? 0,
        steals: statMap.get("stl") ?? 0,
        blocks: statMap.get("blk") ?? 0,
        turnovers: statMap.get("to") ?? 0,
        fouls: statMap.get("pf") ?? 0,
        threes: statMap.get("3pm") ?? 0,
        threeAttempts: statMap.get("3pa") ?? 0,
        fieldGoals: statMap.get("fgm") ?? 0,
        fieldGoalAttempts: statMap.get("fga") ?? 0,
        freeThrows: statMap.get("ftm") ?? 0,
        freeThrowAttempts: statMap.get("fta") ?? 0,
        plusMinus: statMap.get("+/-") ?? statMap.get("plusminus") ?? undefined,
      });
    }
    
    return gameLogs;
  } catch (error) {
    console.error("Error fetching NBA player game log:", error);
    return [];
  }
}

// ============================================================================
// Get Players for a Game (both teams)
// ============================================================================

export async function getPlayersForGame(
  homeTeamName: string,
  awayTeamName: string
): Promise<{ homePlayers: NBAPlayer[]; awayPlayers: NBAPlayer[] }> {
  const [homeTeamId, awayTeamId] = await Promise.all([
    findNBATeamId(homeTeamName),
    findNBATeamId(awayTeamName),
  ]);
  
  const [homePlayers, awayPlayers] = await Promise.all([
    homeTeamId ? getNBATeamRoster(homeTeamId) : [],
    awayTeamId ? getNBATeamRoster(awayTeamId) : [],
  ]);
  
  return { homePlayers, awayPlayers };
}

// ============================================================================
// Batch Player Stats
// ============================================================================

export async function getPlayerStatsForRoster(
  players: NBAPlayer[],
  limit?: number
): Promise<Map<string, PlayerSeasonStats>> {
  const statsMap = new Map<string, PlayerSeasonStats>();
  const playersToFetch = limit ? players.slice(0, limit) : players;
  
  // Fetch in batches of 5 to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < playersToFetch.length; i += batchSize) {
    const batch = playersToFetch.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((player) => getNBAPlayerSeasonStats(player.id))
    );
    
    for (let j = 0; j < batch.length; j++) {
      const stats = results[j];
      if (stats) {
        statsMap.set(batch[j].id, stats);
      }
    }
  }
  
  return statsMap;
}

// ============================================================================
// Box Score (for validation)
// ============================================================================

interface ESPNBoxScoreResponse {
  boxscore?: {
    players?: Array<{
      team: {
        id: string;
        displayName: string;
      };
      statistics: Array<{
        athletes: Array<{
          athlete: {
            id: string;
            displayName: string;
          };
          stats: string[];
        }>;
        labels: string[];
      }>;
    }>;
  };
}

export interface BoxScorePlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  team: string;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  threes: number;
}

export async function getGameBoxScore(gameId: string): Promise<BoxScorePlayerStats[]> {
  try {
    const url = `${NBA_BASE}/summary?event=${gameId}`;
    const res = await rateLimitedFetch(url);
    if (!res.ok) {
      console.error(`ESPN box score fetch failed: ${res.status}`);
      return [];
    }
    
    const data = await res.json() as ESPNBoxScoreResponse;
    const players = data.boxscore?.players || [];
    const results: BoxScorePlayerStats[] = [];
    
    for (const teamData of players) {
      const teamId = teamData.team.id;
      const teamName = teamData.team.displayName;
      
      for (const statGroup of teamData.statistics) {
        const labels = statGroup.labels.map((l) => l.toLowerCase());
        
        for (const athlete of statGroup.athletes) {
          const stats = athlete.stats;
          const getStatIndex = (name: string) => {
            const idx = labels.findIndex((l) => l.includes(name));
            return idx >= 0 && stats[idx] ? parseFloat(stats[idx]) || 0 : 0;
          };
          
          results.push({
            playerId: athlete.athlete.id,
            playerName: athlete.athlete.displayName,
            teamId,
            team: teamName,
            minutes: getStatIndex("min"),
            points: getStatIndex("pts"),
            rebounds: getStatIndex("reb"),
            assists: getStatIndex("ast"),
            steals: getStatIndex("stl"),
            blocks: getStatIndex("blk"),
            turnovers: getStatIndex("to"),
            threes: getStatIndex("3pm"),
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error fetching game box score:", error);
    return [];
  }
}
