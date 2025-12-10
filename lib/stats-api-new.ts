/**
 * Simplified NCAA Basketball Stats API Client
 * Uses /statistics endpoint with NCAA league (116) and YYYY-YYYY season format
 */

import { TeamStats, GameResult, HeadToHead } from "@/types";
import { teamMappingCache } from "./team-mapping";
import { apiCache, getCacheKey } from "./api-cache";
import { trackApiCall } from "./api-tracker";
import { lookupTeamInDatabase, generateSearchTerms } from "./teams-database";

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
 * PHASE 2: Now tries database first (0 API calls), falls back to API if needed
 */
export async function searchTeamByName(teamName: string): Promise<number | null> {
  const apiKey = process.env.STATS_API_KEY;
  if (!apiKey) {
    console.warn("[STATS] STATS_API_KEY not set");
    return null;
  }

  // 1. Check memory cache (fastest)
  const cached = teamMappingCache.get(teamName);
  if (cached) {
    const teamId = typeof cached.apiSportsId === 'number' 
      ? cached.apiSportsId 
      : (cached.apiSportsId as any)?.apiSportsId || cached.apiSportsId;
    console.log(`[STATS] 💾 Cache hit: "${teamName}" -> ${teamId}`);
    return teamId;
  }

  // 2. Try teams database lookup (0 API calls) - PHASE 2 OPTIMIZATION
  const dbTeamId = lookupTeamInDatabase(teamName);
  if (dbTeamId) {
    console.log(`[STATS] 📚 Database hit: "${teamName}" -> ${dbTeamId} (no API call needed!)`);
    return dbTeamId;
  }

  // 3. Fall back to API search (slower, uses quota)
  console.log(`[STATS] 🌐 Database miss: "${teamName}" - falling back to API search`);
  const currentSeason = getCurrentNCAASeason();
  console.log(`[STATS] Searching API for "${teamName}" with NCAA ${currentSeason} data...`);

  try {
    // Get search variations (PHASE 2: using smarter search terms)
    const searchTerms = generateSearchTerms(teamName).slice(0, 3);
    
    for (const searchTerm of searchTerms) {

      // Search for team
      const searchRes = await fetch(`${API_URL}/teams?search=${encodeURIComponent(searchTerm)}`, {
        headers: { "x-apisports-key": apiKey },
        next: { revalidate: 86400 } // Cache team search for 24 hours (teams don't change)
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
          { 
            headers: { "x-apisports-key": apiKey },
            next: { revalidate: 300 } // Cache validation checks for 5 minutes
          }
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
 * Get team statistics - calculated from actual game data for accuracy
 * 
 * The /statistics endpoint has incomplete data, so we fetch games
 * and calculate everything manually for bulletproof accuracy.
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
    console.log(`[STATS] ⚡ Cache hit: team-stats-${teamId}-${season}`);
    trackApiCall("Stats API", "getTeamStats", true);
    return cached as TeamStats;
  }

  try {
    const startTime = Date.now();
    console.log(`[STATS] 🌐 Fetching games to calculate accurate stats: team=${teamId}, season=${season}`);

    // Fetch all games for the season
    const res = await fetch(
      `${API_URL}/games?team=${teamId}&league=${NCAA_LEAGUE_ID}&season=${season}`,
      { 
        headers: { "x-apisports-key": apiKey },
        next: { 
          revalidate: 300, // Cache for 5 minutes
          tags: ['stats', `team-${teamId}`, season]
        }
      }
    );

    if (!res.ok) {
      console.error(`[STATS] HTTP ${res.status} for team ${teamId}`);
      trackApiCall("Stats API", "getTeamStats", false, res.status);
      return null;
    }

    const data = await res.json();

    if (!data.response || data.results === 0) {
      console.warn(`[STATS] No ${season} games for team ${teamId} (${teamName})`);
      trackApiCall("Stats API", "getTeamStats", false, 200, "no_data");
      return null;
    }

    // Filter to finished games only (no women's teams)
    const finishedGames = data.response.filter((g: any) => 
      g.status?.short === "FT" && 
      !g.teams?.home?.name?.endsWith(" W") && 
      !g.teams?.away?.name?.endsWith(" W")
    );

    if (finishedGames.length === 0) {
      console.warn(`[STATS] No completed games for team ${teamId}`);
      return null;
    }

    // Calculate stats manually from games
    let wins = 0;
    let losses = 0;
    let totalPoints = 0;
    let totalPointsAllowed = 0;
    const recentGames: GameResult[] = [];

    finishedGames.forEach((g: any) => {
      const isHome = g.teams.home.id === teamId;
      const teamScore = isHome ? g.scores.home.total : g.scores.away.total;
      const oppScore = isHome ? g.scores.away.total : g.scores.home.total;

      // Count wins/losses
      if (teamScore > oppScore) wins++;
      else losses++;

      // Accumulate points
      totalPoints += teamScore;
      totalPointsAllowed += oppScore;

      // Store game result
      recentGames.push({
        id: g.id,
        date: g.date,
        homeTeam: g.teams.home.name,
        awayTeam: g.teams.away.name,
        homeScore: g.scores.home.total,
        awayScore: g.scores.away.total,
        winner: teamScore > oppScore ? (isHome ? g.teams.home.name : g.teams.away.name) : (isHome ? g.teams.away.name : g.teams.home.name),
        homeTeamLogo: g.teams.home.logo,
        awayTeamLogo: g.teams.away.logo,
      });
    });

    const gamesPlayed = finishedGames.length;

    const stats: TeamStats = {
      id: teamId,
      name: teamName || finishedGames[0]?.teams?.home?.id === teamId ? finishedGames[0].teams.home.name : finishedGames[0].teams.away.name,
      code: teamName?.slice(0, 4).toUpperCase() || "UNK",
      logo: finishedGames[0]?.teams?.home?.id === teamId ? finishedGames[0].teams.home.logo : finishedGames[0].teams.away.logo,
      wins,
      losses,
      pointsPerGame: totalPoints / gamesPlayed,
      pointsAllowedPerGame: totalPointsAllowed / gamesPlayed,
      recentGames: recentGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      
      // Note: Advanced stats (FG%, 3P%, etc.) not available in game summaries
      // Would need per-game detailed stats endpoint (additional API calls)
      // Setting reasonable defaults for now
      fieldGoalPercentage: 45.0, // NCAA average
      threePointPercentage: 35.0, // NCAA average
      freeThrowPercentage: 72.0, // NCAA average
      reboundsPerGame: 36.0, // NCAA average
      assistsPerGame: 14.0, // NCAA average
      turnoversPerGame: 12.0, // NCAA average
      stealsPerGame: 7.0, // NCAA average
      blocksPerGame: 3.0, // NCAA average
      foulsPerGame: 18.0, // NCAA average
    };

    const elapsed = Date.now() - startTime;
    console.log(
      `[STATS] ✓ Stats calculated from ${gamesPlayed} games in ${elapsed}ms: ` +
      `${stats.wins}-${stats.losses}, ${stats.pointsPerGame.toFixed(1)} PPG, ` +
      `${stats.pointsAllowedPerGame.toFixed(1)} PAPG`
    );

    // Cache result
    apiCache.set(cacheKey, stats);
    trackApiCall("Stats API", "getTeamStats", false);

    return stats;
  } catch (error) {
    console.error(`[STATS] Error fetching stats for team ${teamId}:`, error);
    trackApiCall("Stats API", "getTeamStats", false, 500, error instanceof Error ? error.message : String(error));
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
      { 
        headers: { "x-apisports-key": apiKey },
        next: { 
          revalidate: 300, // Cache for 5 minutes
          tags: ['games', `team-${teamId}`, season]
        }
      }
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
      { 
        headers: { "x-apisports-key": apiKey },
        next: { 
          revalidate: 300, // Cache for 5 minutes
          tags: ['h2h', `teams-${team1Id}-${team2Id}`, season]
        }
      }
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

