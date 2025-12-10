/**
 * Simplified NCAA Basketball Stats API Client
 * Uses /statistics endpoint with NCAA league (116) and YYYY-YYYY season format
 */

import { TeamStats, GameResult, HeadToHead } from "@/types";
import { teamMappingCache } from "./team-mapping";
import { normalizeTeamName } from "./team-data";
import { apiCache, getCacheKey } from "./api-cache";

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

/**
 * Get current NCAA season in YYYY-YYYY format
 * Example: December 2025 = "2025-2026"
 */
function getCurrentNCAASeason(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-11
  
  // NCAA season runs Nov-Apr
  // Nov-Dec of year X = season X-(X+1)
  // Jan-Apr of year X = season (X-1)-X
  const seasonStartYear = month >= 10 ? year : year - 1;
  return `${seasonStartYear}-${seasonStartYear + 1}`;
}

/**
 * Search for NCAA team by name and verify it has current season data
 */
export async function searchTeamByName(teamName: string): Promise<number | null> {
  const apiKey = process.env.STATS_API_KEY;
  if (!apiKey) {
    console.warn("[STATS] STATS_API_KEY not set");
    return null;
  }

  // Check cache
  const cached = teamMappingCache.get(teamName);
  if (cached) {
    // Handle both number and nested object (in case of double nesting bug)
    const teamId = typeof cached.apiSportsId === 'number' 
      ? cached.apiSportsId 
      : (cached.apiSportsId as any)?.apiSportsId || cached.apiSportsId;
    console.log(`[STATS] Cache hit: "${teamName}" -> ${teamId}`);
    return teamId;
  }

  const currentSeason = getCurrentNCAASeason();
  console.log(`[STATS] Searching for "${teamName}" with NCAA ${currentSeason} data...`);

  try {
    // Get search variations (e.g., "BYU Cougars" -> ["BYU", "Brigham Young"])
    const searchTerms = normalizeTeamName(teamName).slice(0, 3);
    
    for (const searchTerm of searchTerms) {

      // Search for team
      const searchRes = await fetch(`${API_URL}/teams?search=${encodeURIComponent(searchTerm)}`, {
        headers: { "x-apisports-key": apiKey },
      });

      if (!searchRes.ok) continue;

      const searchData = await searchRes.json();
      const usaMensTeams = searchData.response?.filter((t: any) => 
        t.country?.name === "USA" && !t.name?.endsWith(" W")
      ) || [];

      console.log(`[STATS] Found ${usaMensTeams.length} USA men's teams for "${searchTerm}"`);

      // Prioritize teams that match the ORIGINAL teamName better
      const originalLower = teamName.toLowerCase();
      const teamsToTest = usaMensTeams.sort((a: any, b: any) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        // Exact match to original name first
        if (aName === originalLower) return -1;
        if (bName === originalLower) return 1;
        
        // Match to original name (check if team contains multiple words from original)
        const originalWords = originalLower.split(' ').filter(w => w.length > 3);
        const aMatches = originalWords.filter(w => aName.includes(w)).length;
        const bMatches = originalWords.filter(w => bName.includes(w)).length;
        
        if (aMatches !== bMatches) return bMatches - aMatches;
        
        // Exact match to search term
        if (aName === searchLower) return -1;
        if (bName === searchLower) return 1;
        
        // Starts with search term
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
        if (bName.startsWith(searchLower) && !aName.startsWith(searchLower)) return 1;
        
        return 0;
      });

      // Test each team for current season NCAA statistics ONLY
      for (const team of teamsToTest) {
        const statsRes = await fetch(
          `${API_URL}/statistics?team=${team.id}&league=${NCAA_LEAGUE_ID}&season=${currentSeason}`,
          { headers: { "x-apisports-key": apiKey } }
        );

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const hasData = statsData.results > 0 && statsData.response?.games?.played?.all > 0;

          if (hasData) {
            console.log(`[STATS] ✓ Found: "${team.name}" (ID: ${team.id}, ${statsData.response.games.played.all} games)`);
            
            // Cache result
            teamMappingCache.set(teamName, {
              apiSportsId: team.id,
              apiSportsName: team.name,
              confidence: "exact",
              oddsApiName: teamName,
              cachedAt: Date.now(),
            });

            return team.id;
          }
        }

        await new Promise(r => setTimeout(r, 150)); // Rate limiting
      }
    }

    console.warn(`[STATS] ✗ No NCAA ${currentSeason} data found for "${teamName}"`);
    return null;
  } catch (error) {
    console.error(`[STATS] Error searching for "${teamName}":`, error);
    return null;
  }
}

/**
 * Get team statistics from NCAA /statistics endpoint
 */
export async function getTeamStats(teamId: number, teamName?: string): Promise<TeamStats | null> {
  const apiKey = process.env.STATS_API_KEY;
  if (!apiKey) {
    throw new Error("STATS_API_KEY is not set");
  }

  const season = getCurrentNCAASeason();
  const cacheKey = getCacheKey('stats', teamId, season);
  
  // Check cache
  const cached = apiCache.get(cacheKey);
  if (cached !== null) {
    console.log(`[STATS] Cache hit: team-stats-${teamId}-${season}`);
    return cached as TeamStats;
  }

  try {
    const startTime = Date.now();
    console.log(`[STATS] Fetching stats: team=${teamId}, season=${season}`);

    const res = await fetch(
      `${API_URL}/statistics?team=${teamId}&league=${NCAA_LEAGUE_ID}&season=${season}`,
      { headers: { "x-apisports-key": apiKey } }
    );

    if (!res.ok) {
      console.error(`[STATS] HTTP ${res.status} for team ${teamId}`);
      return null;
    }

    const data = await res.json();

    if (!data.response || data.results === 0) {
      console.warn(`[STATS] No ${season} data for team ${teamId} (${teamName})`);
      return null;
    }

    const r = data.response;
    const stats: TeamStats = {
      id: teamId,
      name: teamName || r.team?.name || "Unknown",
      code: r.team?.code || teamName?.slice(0, 4).toUpperCase() || "UNK",
      logo: r.team?.logo || undefined, // Use API logo
      wins: r.games?.wins?.all?.total || 0,
      losses: r.games?.loses?.all?.total || 0,
      pointsPerGame: parseFloat(r.points?.for?.average?.all || "0"),
      pointsAllowedPerGame: parseFloat(r.points?.against?.average?.all || "0"),
      recentGames: [],
    };

    const elapsed = Date.now() - startTime;
    console.log(`[STATS] ✓ Stats fetched in ${elapsed}ms: ${stats.wins}-${stats.losses}, ${stats.pointsPerGame} PPG`);

    // Cache result
    apiCache.set(cacheKey, stats);

    return stats;
  } catch (error) {
    console.error(`[STATS] Error fetching stats for team ${teamId}:`, error);
    return null;
  }
}

/**
 * Get recent games for current season ONLY
 */
export async function getRecentGames(
  teamId: number,
  limit: number = 10,
  teamName?: string
): Promise<GameResult[]> {
  const apiKey = process.env.STATS_API_KEY;
  if (!apiKey) {
    throw new Error("STATS_API_KEY is not set");
  }

  const season = getCurrentNCAASeason();
  const cacheKey = getCacheKey('games', teamId, season);
  
  // Check cache
  const cached = apiCache.get(cacheKey);
  if (cached !== null) {
    console.log(`[STATS] Cache hit: recent-games-${teamId}-${season}`);
    return (cached as GameResult[]).slice(0, limit);
  }

  try {
    const startTime = Date.now();
    console.log(`[STATS] Fetching recent games: team=${teamId}, season=${season}`);

    const res = await fetch(
      `${API_URL}/games?team=${teamId}&league=${NCAA_LEAGUE_ID}&season=${season}`,
      { headers: { "x-apisports-key": apiKey } }
    );

    if (!res.ok) {
      console.error(`[STATS] HTTP ${res.status} for team ${teamId}`);
      return [];
    }

    const data = await res.json();

    if (!data.response || data.results === 0) {
      console.warn(`[STATS] No ${season} games for team ${teamId} (${teamName})`);
      return [];
    }

    const games: GameResult[] = data.response
      .filter((g: any) => 
        g.status?.short === "FT" && 
        !g.teams?.home?.name?.endsWith(" W") && 
        !g.teams?.away?.name?.endsWith(" W")
      )
      .map((g: any) => {
        const homeScore = g.scores?.home?.total || 0;
        const awayScore = g.scores?.away?.total || 0;
        const winner = homeScore > awayScore ? g.teams.home.name : g.teams.away.name;

        return {
          id: g.id,
          date: g.date,
          homeTeam: g.teams.home.name,
          awayTeam: g.teams.away.name,
          homeScore,
          awayScore,
          winner,
          homeTeamLogo: g.teams.home.logo,
          awayTeamLogo: g.teams.away.logo,
        };
      })
      .sort((a: GameResult, b: GameResult) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

    const elapsed = Date.now() - startTime;
    console.log(`[STATS] ✓ Recent games fetched in ${elapsed}ms: ${games.length} games`);

    // Cache all games
    apiCache.set(cacheKey, games);

    return games.slice(0, limit);
  } catch (error) {
    console.error(`[STATS] Error fetching games for team ${teamId}:`, error);
    return [];
  }
}

/**
 * Get head-to-head for current season ONLY
 */
export async function getHeadToHead(
  team1Id: number,
  team2Id: number,
  team1Name: string = "Team 1",
  team2Name: string = "Team 2"
): Promise<HeadToHead | null> {
  const apiKey = process.env.STATS_API_KEY;
  if (!apiKey) {
    throw new Error("STATS_API_KEY is not set");
  }

  const season = getCurrentNCAASeason();
  const h2hKey = `${Math.min(team1Id, team2Id)}-${Math.max(team1Id, team2Id)}`;
  const cacheKey = getCacheKey('h2h', h2hKey, season);
  
  // Check cache
  const cached = apiCache.get(cacheKey);
  if (cached !== null) {
    console.log(`[STATS] Cache hit: h2h-${h2hKey}-${season}`);
    return cached as HeadToHead;
  }

  try {
    const startTime = Date.now();
    console.log(`[STATS] Fetching H2H: team1=${team1Id}, team2=${team2Id}, season=${season}`);

    const res = await fetch(
      `${API_URL}/games?h2h=${team1Id}-${team2Id}&league=${NCAA_LEAGUE_ID}&season=${season}`,
      { headers: { "x-apisports-key": apiKey } }
    );

    if (!res.ok) {
      console.error(`[STATS] HTTP ${res.status} for H2H`);
      return null;
    }

    const data = await res.json();

    if (!data.response || data.results === 0) {
      console.log(`[STATS] No ${season} H2H data (teams haven't played yet this season)`);
      return null;
    }

    const games: GameResult[] = data.response
      .filter((g: any) => 
        g.status?.short === "FT" && 
        !g.teams?.home?.name?.endsWith(" W") && 
        !g.teams?.away?.name?.endsWith(" W")
      )
      .map((g: any) => {
        const homeScore = g.scores?.home?.total || 0;
        const awayScore = g.scores?.away?.total || 0;
        const winner = homeScore > awayScore ? g.teams.home.name : g.teams.away.name;

        return {
          id: g.id,
          date: g.date,
          homeTeam: g.teams.home.name,
          awayTeam: g.teams.away.name,
          homeScore,
          awayScore,
          winner,
          homeTeamLogo: g.teams.home.logo,
          awayTeamLogo: g.teams.away.logo,
        };
      })
      .sort((a: GameResult, b: GameResult) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const team1Wins = games.filter(g => g.winner === team1Name).length;
    const team2Wins = games.filter(g => g.winner === team2Name).length;

    const h2h: HeadToHead = {
      games,
      team1Wins,
      team2Wins,
    };

    const elapsed = Date.now() - startTime;
    console.log(`[STATS] ✓ H2H fetched in ${elapsed}ms: ${games.length} games (${team1Wins}-${team2Wins})`);

    // Cache result
    apiCache.set(cacheKey, h2h);

    return h2h;
  } catch (error) {
    console.error(`[STATS] Error fetching H2H:`, error);
    return null;
  }
}

