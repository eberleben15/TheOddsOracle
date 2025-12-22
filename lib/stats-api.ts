import { TeamStats, GameResult, HeadToHead } from "@/types";
import { teamMappingCache, MatchConfidence, loadManualMappingsFromFile } from "./team-mapping";
import { normalizeTeamName } from "./team-data";
import { apiCache, getCacheKey } from "./api-cache";

// Load manual mappings on module initialization (if available)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const manualMappings = require("./team-mappings.json");
  loadManualMappingsFromFile(manualMappings);
} catch (error) {
  // File doesn't exist or can't be loaded - that's okay, cache will work without it
  // Manual mappings are optional
}

// API Basketball base URLs
// Direct API-Sports.io API (primary)
const API_BASKETBALL_DIRECT_URL = "https://v1.basketball.api-sports.io";
// RapidAPI wrapper (fallback)
const API_BASKETBALL_RAPIDAPI_URL = "https://api-basketball.p.rapidapi.com";

// Use direct API-Sports.io by default
const API_BASKETBALL_BASE_URL = API_BASKETBALL_DIRECT_URL;

// Note: This is a placeholder implementation
// You'll need to sign up for API Basketball at https://www.api-basketball.com/
// and configure the API key in your .env.local file

/**
 * Test API subscription status
 * Returns subscription info including plan, active status, and request limits
 */
export async function testSubscriptionStatus(): Promise<{
  account?: {
    firstname: string;
    lastname: string;
    email: string;
  };
  subscription?: {
    plan: string;
    end: string;
    active: boolean;
  };
  requests?: {
    current: number;
    limit_day: number;
  };
  error?: string;
}> {
  const apiKey = process.env.STATS_API_KEY;

  if (!apiKey) {
    return { error: "STATS_API_KEY is not set in environment variables" };
  }

  try {
    // Try direct API-Sports.io endpoint first (uses x-apisports-key header)
    const directUrl = `${API_BASKETBALL_DIRECT_URL}/status`;
    let response = await fetch(directUrl, {
      headers: {
        "x-apisports-key": apiKey as string,
      },
    });

    // If direct API fails, try RapidAPI wrapper format
    if (!response.ok) {
      const rapidApiUrl = `${API_BASKETBALL_RAPIDAPI_URL}/status`;
      response = await fetch(rapidApiUrl, {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "api-basketball.p.rapidapi.com",
        },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: `Failed to fetch subscription status (${response.status}): ${errorText}`,
      };
    }

    const data = await response.json();
    
    if (data.response) {
      return {
        account: data.response.account,
        subscription: data.response.subscription,
        requests: data.response.requests,
      };
    }

    return { error: "Unexpected response format" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Search for a team by name to get its team ID
 * This is needed because API-Sports.io requires valid team IDs, not names
 * 
 * Multi-strategy search:
 * 1. Check cache first (fast path)
 * 2. Try exact match using normalized names
 * 3. Try partial match (school name only)
 * 4. Try abbreviation match
 * 5. Fallback to API search
 */
export async function searchTeamByName(teamName: string): Promise<number | null> {
  const apiKey = process.env.STATS_API_KEY;

  if (!apiKey) {
    console.warn("STATS_API_KEY is not set. Cannot search for team.");
    return null;
  }

  // Strategy 1: Check cache first
  const cachedMapping = teamMappingCache.get(teamName);
  if (cachedMapping) {
    return cachedMapping.apiSportsId;
  }

  try {
    // Strategy 2: Get normalized search variations
    const searchVariations = normalizeTeamName(teamName);
    console.log(`[SEARCH] Variations:`, searchVariations.slice(0, 3).join(", "));
    
    // Helper function to handle response and extract team ID
    const handleResponse = async (
      response: Response, 
      url: string, 
      searchTerm: string
    ): Promise<{ teamId: number | null; teamName: string; confidence: MatchConfidence }> => {
      if (!response.ok) {
        // Handle rate limits first - don't treat as subscription error
        if (response.status === 429) {
          console.warn(`Rate limited while searching for team "${searchTerm}". Please wait and try again.`);
          return { teamId: null, teamName: searchTerm, confidence: "partial" };
        }
        
        let errorBody = "";
        let errorJson: any = null;
        try {
          const errorData = await response.text();
          errorBody = errorData;
          
          // Only try to parse if there's actual content
          if (errorData && errorData.trim() && errorData.trim() !== "{}") {
            errorJson = JSON.parse(errorData);
            
            // Check for subscription error - only if we have a valid message
            if (errorJson && errorJson.message && typeof errorJson.message === "string" && errorJson.message.includes("not subscribed")) {
              const error = new Error("API_SUBSCRIPTION_REQUIRED");
              (error as any).isSubscriptionError = true;
              throw error;
            }
          }
          
          // Log full error for debugging
          console.error(`Team search API Error (${response.status}):`, {
            status: response.status,
            statusText: response.statusText,
            error: errorJson || errorBody || "Empty response",
            url: url,
            headers: Object.fromEntries(response.headers.entries())
          });
        } catch (e) {
          // Re-throw subscription errors
          if (e instanceof Error && (e as any).isSubscriptionError) {
            throw e;
          }
          // If JSON parse failed, log raw error
          if (!errorJson && errorBody) {
            console.error(`Team search API Error (${response.status}) - Raw response:`, errorBody.substring(0, 500));
          }
        }
        
        // For 403 errors, check if it's actually a subscription issue
        if (response.status === 403) {
          // If we got a clear subscription error message, throw it
          if (errorJson && errorJson.message && typeof errorJson.message === "string" && errorJson.message.includes("not subscribed")) {
            const error = new Error("API_SUBSCRIPTION_REQUIRED");
            (error as any).isSubscriptionError = true;
            throw error;
          }
          // Otherwise, might be wrong endpoint or parameters
          console.warn(`403 Forbidden for "${teamName}" - might be wrong endpoint or parameters`);
        }
        
        // Return null result for other errors (will try fallback)
        return { teamId: null, teamName: searchTerm, confidence: "partial" };
      }

      const data = await response.json();
      console.log(`Team search API response for "${searchTerm}":`, JSON.stringify(data, null, 2));
      
      // Extract team ID from response with confidence scoring
      if (data.response && Array.isArray(data.response) && data.response.length > 0) {
        const searchTermLower = searchTerm.toLowerCase();
        const searchTermNoWomen = searchTermLower.replace(/\s+w$/, "").trim();
        
        // Priority 1: Exact match (excluding women's teams) - HIGHEST CONFIDENCE
        const exactMatch = data.response.find((team: any) => {
          const apiName = (team.name || "").toLowerCase();
          return apiName === searchTermLower && !apiName.endsWith(" w");
        });
        
        if (exactMatch?.id) {
          console.log(`✓ Found EXACT match for "${searchTerm}": ID ${exactMatch.id} (${exactMatch.name})`);
          return { teamId: exactMatch.id, teamName: exactMatch.name, confidence: "exact" };
        }
        
        // Priority 2: Match without " W" suffix (men's team) - HIGH CONFIDENCE
        const mensTeamMatch = data.response.find((team: any) => {
          const apiName = (team.name || "").toLowerCase();
          return apiName === searchTermNoWomen && !apiName.endsWith(" w");
        });
        
        if (mensTeamMatch?.id) {
          console.log(`✓ Found men's team match for "${searchTerm}": ID ${mensTeamMatch.id} (${mensTeamMatch.name})`);
          return { teamId: mensTeamMatch.id, teamName: mensTeamMatch.name, confidence: "exact" };
        }
        
        // Priority 3: Partial match from USA (excluding women's teams) - MEDIUM CONFIDENCE
        const partialMatchUSA = data.response.find((team: any) => {
          const apiName = (team.name || "").toLowerCase();
          const country = team.country?.code || team.country?.name || "";
          return (apiName.includes(searchTermLower) || searchTermLower.includes(apiName)) 
            && !apiName.endsWith(" w")
            && (country === "US" || country === "USA");
        });
        
        if (partialMatchUSA?.id) {
          console.log(`✓ Found PARTIAL match (USA) for "${searchTerm}": ID ${partialMatchUSA.id} (${partialMatchUSA.name})`);
          return { teamId: partialMatchUSA.id, teamName: partialMatchUSA.name, confidence: "partial" };
        }
        
        // Priority 3b: Partial match any country (excluding women's teams) - LOWER CONFIDENCE
        const partialMatch = data.response.find((team: any) => {
          const apiName = (team.name || "").toLowerCase();
          return (apiName.includes(searchTermLower) || searchTermLower.includes(apiName)) && !apiName.endsWith(" w");
        });
        
        if (partialMatch?.id) {
          console.log(`⚠ Found PARTIAL match (non-USA) for "${searchTerm}": ID ${partialMatch.id} (${partialMatch.name})`);
          return { teamId: partialMatch.id, teamName: partialMatch.name, confidence: "partial" };
        }
        
        // Priority 4: First non-women's team from USA - MEDIUM CONFIDENCE
        const firstMensTeamUSA = data.response.find((team: any) => {
          const apiName = (team.name || "").toLowerCase();
          const country = team.country?.code || team.country?.name || "";
          return !apiName.endsWith(" w") && (country === "US" || country === "USA");
        });
        
        if (firstMensTeamUSA?.id) {
          console.log(`✓ Found men's team (USA) for "${searchTerm}": ID ${firstMensTeamUSA.id} (${firstMensTeamUSA.name})`);
          return { teamId: firstMensTeamUSA.id, teamName: firstMensTeamUSA.name, confidence: "partial" };
        }
        
        // Priority 5: First non-women's team (any country) - LOW CONFIDENCE
        const firstMensTeam = data.response.find((team: any) => {
          const apiName = (team.name || "").toLowerCase();
          return !apiName.endsWith(" w");
        });
        
        if (firstMensTeam?.id) {
          console.log(`⚠ Using first men's team result for "${searchTerm}": ID ${firstMensTeam.id} (${firstMensTeam.name})`);
          return { teamId: firstMensTeam.id, teamName: firstMensTeam.name, confidence: "partial" };
        }
        
        // DO NOT use women's teams - return null instead
        console.warn(`Only women's teams found for "${searchTerm}" - skipping`);
        return { teamId: null, teamName: searchTerm, confidence: "partial" };
      } else if (data.response && !Array.isArray(data.response)) {
        // Response might be a single object
        if (data.response.id) {
          console.log(`✓ Found team for "${searchTerm}": ID ${data.response.id}`);
          return { teamId: data.response.id, teamName: data.response.name || searchTerm, confidence: "exact" };
        }
      }
      
      console.warn(`No team ID found in response for "${searchTerm}". Response structure:`, Object.keys(data));
      return { teamId: null, teamName: searchTerm, confidence: "partial" };
    };
    
    // Strategy 3-5: Try each normalized search variation
    for (const searchVariation of searchVariations) {
      try {
        const searchParam = encodeURIComponent(searchVariation);
        const url = `${API_BASKETBALL_DIRECT_URL}/teams?search=${searchParam}`;
        
        console.log(`[Team Search] Trying variation: "${searchVariation}"`);
        const response = await fetch(url, {
          headers: {
            "x-apisports-key": apiKey as string,
          },
        });
        
        const result = await handleResponse(response, url, searchVariation);
        
        if (result.teamId) {
          // Found a match! Store in cache and return
          teamMappingCache.set(
            teamName,
            result.teamId,
            result.teamName,
            result.confidence
          );
          console.log(`✓ Successfully matched "${teamName}" -> "${result.teamName}" (ID: ${result.teamId}, confidence: ${result.confidence})`);
          return result.teamId;
        }
        
        // If we got a subscription error, don't try other variations
        if (response.status === 403) {
          const errorText = await response.text().catch(() => "");
          if (errorText.includes("not subscribed")) {
            break; // Exit loop, error will be handled by handleResponse
          }
        }
        
        // If rate limited, don't try other variations
        if (response.status === 429) {
          console.warn(`Rate limited while searching for "${teamName}"`);
          break;
        }
      } catch (error) {
        // If subscription error, re-throw it
        if (error instanceof Error && (error as any).isSubscriptionError) {
          throw error;
        }
        // Otherwise continue to next variation
        console.log(`[Team Search] Variation "${searchVariation}" failed, trying next...`);
      }
    }
    
    // All strategies failed
    console.warn(`[Team Search] Could not find team ID for "${teamName}" after trying ${searchVariations.length} variations`);
    return null;
  } catch (error) {
    console.error(`Error searching for team "${teamName}":`, error);
    return null;
  }
}

export async function getTeamStats(teamId: number, teamName?: string): Promise<TeamStats | null> {
  const apiKey = process.env.STATS_API_KEY;

  if (!apiKey) {
    throw new Error("STATS_API_KEY is not set in environment variables");
  }

  // Calculate current season for cache key
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentSeason = currentMonth >= 10 ? currentYear : currentYear - 1;

  // Check cache first
  const cacheKey = getCacheKey('stats', teamId, currentSeason);
  const cached = apiCache.get(cacheKey);
  if (cached !== null) {
    console.log(`[CACHE HIT] team-stats-${teamId}-${currentSeason}`);
    return cached as TeamStats;
  }

  try {
    const startTime = Date.now();
    console.log(`[API] Calculating stats: team=${teamId}, season=${currentSeason}`);
    
    // Get games data (this will use cached games if available)
    const games = await getRecentGames(teamId, 30, teamName);
    
    if (games.length === 0) {
      console.warn(`No games found for team ${teamId} (${teamName}) - this may indicate wrong team ID`);
      // Return minimal stats object so UI can still render
      return {
        id: teamId,
        name: teamName || "Unknown",
        code: (teamName || "").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 4),
        logo: undefined,
        wins: 0,
        losses: 0,
        pointsPerGame: 0,
        pointsAllowedPerGame: 0,
        recentGames: [],
      };
    }
    
    // Calculate stats from games
    let wins = 0;
    let losses = 0;
    let totalPoints = 0;
    let totalPointsAllowed = 0;
    let gamesCount = 0;
    
    for (const game of games) {
      // Match team name - try multiple variations
      const teamNameLower = (teamName || "").toLowerCase();
      const gameHomeLower = game.homeTeam.toLowerCase();
      const gameAwayLower = game.awayTeam.toLowerCase();
      
      // Check if this team is home or away
      const isHomeTeam = gameHomeLower === teamNameLower || 
                        gameHomeLower.includes(teamNameLower) ||
                        teamNameLower.includes(gameHomeLower.split(" ")[0]);
      const isAwayTeam = gameAwayLower === teamNameLower ||
                        gameAwayLower.includes(teamNameLower) ||
                        teamNameLower.includes(gameAwayLower.split(" ")[0]);
      
      if (!isHomeTeam && !isAwayTeam) {
        console.warn(`[getTeamStats] Could not match team "${teamName}" in game: ${game.homeTeam} vs ${game.awayTeam}`);
        continue; // Skip this game if we can't identify the team
      }
      
      const teamScore = isHomeTeam ? game.homeScore : game.awayScore;
      const opponentScore = isHomeTeam ? game.awayScore : game.homeScore;
      
      // Determine winner from scores if winner field is not set
      let isWin = false;
      if (game.winner) {
        const winnerLower = game.winner.toLowerCase();
        isWin = winnerLower === teamNameLower || 
                winnerLower.includes(teamNameLower) ||
                teamNameLower.includes(winnerLower.split(" ")[0]);
      } else {
        // No winner field, determine from scores
        isWin = teamScore > opponentScore;
      }
      
      if (isWin) wins++;
      else losses++;
      
      totalPoints += teamScore;
      totalPointsAllowed += opponentScore;
      gamesCount++;
      
      console.log(`[getTeamStats] Game: ${game.homeTeam} ${game.homeScore} - ${game.awayScore} ${game.awayTeam}, Team: ${teamName} (${isHomeTeam ? 'home' : 'away'}), Score: ${teamScore}, Win: ${isWin}`);
    }
    
    console.log(`[getTeamStats] Calculated stats for ${teamName}: ${wins}W-${losses}L, ${totalPoints}pts scored, ${totalPointsAllowed}pts allowed in ${gamesCount} games`);
    
    // Get team info from teams endpoint
    const teamUrl = `${API_BASKETBALL_DIRECT_URL}/teams?id=${teamId}`;
    const teamResponse = await fetch(teamUrl, {
      headers: {
        "x-apisports-key": apiKey as string,
      },
    });
    
    let teamInfo: any = null;
    if (teamResponse.ok) {
      const teamData = await teamResponse.json();
      if (teamData.response && teamData.response.length > 0) {
        teamInfo = teamData.response[0];
      }
    }
    
    return {
      id: teamId,
      name: teamName || teamInfo?.name || "Unknown",
      code: teamInfo?.code || (teamName || "").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 4),
      logo: teamInfo?.logo,
      wins,
      losses,
      pointsPerGame: gamesCount > 0 ? totalPoints / gamesCount : 0,
      pointsAllowedPerGame: gamesCount > 0 ? totalPointsAllowed / gamesCount : 0,
      recentGames: games.slice(0, 10),
    };
  } catch (error) {
    // Re-throw all errors - no mock data fallback
    console.error("Error fetching team stats:", error);
    throw error;
  }
}


export async function getRecentGames(
  teamId: number,
  limit: number = 10,
  teamName?: string
): Promise<GameResult[]> {
  const apiKey = process.env.STATS_API_KEY;

  if (!apiKey) {
    throw new Error("STATS_API_KEY is not set in environment variables");
  }

  // Calculate current season
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11 (0=Jan, 10=Nov, 11=Dec)
  
  // If Nov (10) or Dec (11), season started this year
  // Otherwise (Jan-Oct), season started last year
  const calculatedSeason = currentMonth >= 10 ? currentYear : currentYear - 1;
  
  // Try current season first, but if early in season with no games, fall back to previous season
  const seasonsToTry = [calculatedSeason, calculatedSeason - 1];

  for (const currentSeason of seasonsToTry) {
    // Check cache first
    const cacheKey = getCacheKey('games', teamId, currentSeason);
    const cached = apiCache.get(cacheKey);
    if (cached !== null) {
      console.log(`[CACHE HIT] team-games-${teamId}-${currentSeason}`);
      const games = cached as GameResult[];
      if (games.length > 0) {
        return games.slice(0, limit);
      }
      // Empty cache, try next season
      continue;
    }

    try {
      const startTime = Date.now();
      console.log(`[API] Fetching games: team=${teamId}, season=${currentSeason}`);
      
      // Single API call: current season, all leagues
      const url = `${API_BASKETBALL_DIRECT_URL}/games?team=${teamId}&season=${currentSeason}`;
      const response = await fetch(url, {
        headers: {
          "x-apisports-key": apiKey as string,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error(`[API ERROR] ${response.status}:`, errorData);
        // Try next season on error
        continue;
      }

      const data = await response.json();
      const elapsedTime = Date.now() - startTime;

      // Handle API errors in response - try next season
      if (data.errors && data.errors.length > 0) {
        console.log(`[API] Errors for season ${currentSeason}:`, data.errors);
        continue;
      }

      if (!data.response || data.response.length === 0) {
        console.log(`[API] No games found for team ${teamId} in season ${currentSeason}, trying previous season...`);
        // Cache empty result for this season
        apiCache.set(cacheKey, []);
        continue;
      }

      // Log leagues found
      const leagues = new Set(data.response.map((g: any) => g.league?.id || "unknown"));
      console.log(`[API] Response: ${data.results} games in ${elapsedTime}ms, leagues: ${Array.from(leagues).join(", ")}, season: ${currentSeason}`);

      // Transform results
      const games = transformToGameResults(data);
      
      // Filter out women's teams (teams ending with " W")
      const filteredGames = games.filter(game => {
        const hasWomensTeam = game.homeTeam.endsWith(" W") || game.awayTeam.endsWith(" W");
        if (hasWomensTeam) {
          console.log(`[FILTER] Excluding women's game: ${game.homeTeam} vs ${game.awayTeam}`);
        }
        return !hasWomensTeam;
      });

      console.log(`[API] ✓ Found ${filteredGames.length} games for team ${teamId} in season ${currentSeason} (${games.length - filteredGames.length} filtered out)`);
      
      // Cache the full result
      apiCache.set(cacheKey, filteredGames);
      
      return filteredGames.slice(0, limit);
    } catch (error) {
      console.error(`[API ERROR] Error fetching season ${currentSeason}:`, error);
      // Continue to next season
      continue;
    }
  }

  // No games found in any season
  console.warn(`[API] No games found for team ${teamId} (${teamName}) in any season`);
  return [];
}

export async function getHeadToHead(
  team1Id: number,
  team2Id: number,
  team1Name?: string,
  team2Name?: string
): Promise<HeadToHead | null> {
  const apiKey = process.env.STATS_API_KEY;

  if (!apiKey) {
    throw new Error("STATS_API_KEY is not set in environment variables");
  }

  // Calculate current season
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const calculatedSeason = currentMonth >= 10 ? currentYear : currentYear - 1;
  
  // Try current season first, fall back to previous seasons (up to 3 years back)
  const seasonsToTry = [calculatedSeason, calculatedSeason - 1, calculatedSeason - 2, calculatedSeason - 3].filter(s => s >= 2021);

  for (const currentSeason of seasonsToTry) {
    // Check cache first
    const cacheKey = getCacheKey('h2h', team1Id, team2Id, currentSeason);
    const cached = apiCache.get(cacheKey);
    if (cached !== null) {
      console.log(`[CACHE HIT] h2h-${team1Id}-${team2Id}-${currentSeason}`);
      return cached as HeadToHead;
    }

    try {
      const startTime = Date.now();
      console.log(`[API] Fetching head-to-head: ${team1Id} vs ${team2Id}, season=${currentSeason}`);
      
      // Single API call: current season, all leagues
      const url = `${API_BASKETBALL_DIRECT_URL}/games?h2h=${team1Id}-${team2Id}&season=${currentSeason}`;
      const response = await fetch(url, {
        headers: {
          "x-apisports-key": apiKey as string,
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.log(`[API] H2H failed for season ${currentSeason} (${response.status})`);
        continue;
      }

      const data = await response.json();
      const elapsedTime = Date.now() - startTime;

      // Handle API errors - try next season
      if (data.errors && data.errors.length > 0) {
        console.log(`[API] H2H errors for season ${currentSeason}:`, data.errors);
        continue;
      }

      if (!data.response || data.response.length === 0) {
        console.log(`[API] No head-to-head games in season ${currentSeason}, trying previous season...`);
        continue;
      }

      console.log(`[API] Response: ${data.results} h2h games in ${elapsedTime}ms, season: ${currentSeason}`);

      // Transform games
      const games = transformToGameResults(data);
      
      // Filter out women's teams
      const filteredGames = games.filter(game => {
        return !game.homeTeam.endsWith(" W") && !game.awayTeam.endsWith(" W");
      });
      
      if (filteredGames.length === 0) {
        console.log(`[API] No h2h games after filtering in season ${currentSeason}`);
        continue;
      }

      // Count wins for each team
      const team1Wins = filteredGames.filter((g) => {
        const team1Match = g.winner === team1Name || 
                          (team1Name && g.winner.toLowerCase().includes(team1Name.toLowerCase()));
        return team1Match;
      }).length;
      
      const team2Wins = filteredGames.filter((g) => {
        const team2Match = g.winner === team2Name || 
                          (team2Name && g.winner.toLowerCase().includes(team2Name.toLowerCase()));
        return team2Match;
      }).length;

      const result = {
        games: filteredGames,
        team1Wins: team1Wins,
        team2Wins: team2Wins,
        homeTeamWins: team2Wins, // Assuming team2 is home in current matchup
        awayTeamWins: team1Wins,
      };
      
      console.log(`[API] ✓ Found ${filteredGames.length} h2h games in season ${currentSeason}`);
      
      // Cache the result
      apiCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error(`[API ERROR] Error fetching h2h for season ${currentSeason}:`, error);
      continue;
    }
  }

  // No h2h games found in any season
  console.log(`[API] No head-to-head games found between teams ${team1Id} and ${team2Id} in any season`);
  return null;
}

// List of common college basketball teams for mock data
const MOCK_TEAMS = [
  "Duke Blue Devils",
  "North Carolina Tar Heels",
  "Kentucky Wildcats",
  "Kansas Jayhawks",
  "UCLA Bruins",
  "Michigan State Spartans",
  "Villanova Wildcats",
  "Gonzaga Bulldogs",
  "Arizona Wildcats",
  "Baylor Bears",
  "Virginia Cavaliers",
  "Florida State Seminoles",
  "Louisville Cardinals",
  "Syracuse Orange",
  "Michigan Wolverines",
  "Indiana Hoosiers",
  "Purdue Boilermakers",
  "Ohio State Buckeyes",
  "Texas Longhorns",
  "Oklahoma Sooners",
  "Alabama Crimson Tide",
  "Auburn Tigers",
  "Arkansas Razorbacks",
  "Florida Gators",
  "LSU Tigers",
  "USC Trojans",
  "Oregon Ducks",
  "Connecticut Huskies",
  "Marquette Golden Eagles",
  "Houston Cougars",
];

// Mock data functions for development/testing
export function getMockTeamStats(teamId: number, teamName?: string): TeamStats {
  // Always use the provided team name if available, otherwise fall back to mock teams
  const name = teamName || MOCK_TEAMS[teamId % MOCK_TEAMS.length];
  
  // Generate stats based on team name hash for consistency (same team = same stats)
  const nameHash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = nameHash % 1000;
  
  return {
    id: teamId,
    name: name,
    code: name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 4),
    wins: 10 + (seed % 15), // 10-24 wins
    losses: 5 + ((seed * 2) % 10), // 5-14 losses
    pointsPerGame: 70 + (seed % 20), // 70-89 PPG
    pointsAllowedPerGame: 65 + ((seed * 3) % 15), // 65-79 PAPG
    recentGames: [],
  };
}

export function getMockRecentGames(
  teamId: number,
  limit: number,
  teamName?: string
): GameResult[] {
  // Always use the provided team name if available
  const team = teamName || MOCK_TEAMS[teamId % MOCK_TEAMS.length];
  const games: GameResult[] = [];
  
  // Use team name hash for consistent but unique opponent selection per team
  // Include teamId and multiply by position to ensure very different hashes for different teams
  const nameHash = team.split("").reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1) * 17, teamId * 1000);
  
  // Create a unique opponent pool that excludes the current team
  const opponentPool = MOCK_TEAMS.filter((t) => t !== team);
  
  if (opponentPool.length === 0) {
    return games;
  }
  
  // Generate realistic game schedule - teams play 1-2 times per week
  // Spread games over the past few weeks instead of consecutive days
  let gameIndex = 0;
  let daysAgo = 1;
  
  while (gameIndex < limit && daysAgo < 60) { // Look back up to 60 days
    // Teams typically play 1-2 times per week, so skip 2-5 days between games
    const daysBetweenGames = 2 + ((nameHash + gameIndex * 7) % 4); // 2-5 days
    daysAgo += daysBetweenGames;
    
    // Don't go too far back
    if (daysAgo > 60) break;
    
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    // Avoid scheduling games on unrealistic days (teams rarely play Mon/Tue)
    const dayOfWeek = date.getDay();
    // Most games are Wed-Sun, skip Mon/Tue occasionally
    if (dayOfWeek === 1 || dayOfWeek === 2) {
      // 30% chance to skip Mon/Tue games
      if ((nameHash + gameIndex) % 10 < 3) {
        daysAgo += 1; // Move to next day
        continue;
      }
    }
    
    // Get a unique opponent based on team name hash, teamId, and game index
    // Use large prime multipliers to ensure different teams get very different opponents
    const opponentSeed = (nameHash * 37 + gameIndex * 41 + teamId * 17) % opponentPool.length;
    const opponent = opponentPool[opponentSeed];
    
    // Alternate home/away based on team hash and index
    const isHome = (nameHash + gameIndex * 3) % 2 === 0;
    const homeTeam = isHome ? team : opponent;
    const awayTeam = isHome ? opponent : team;
    
    // Generate consistent but varied scores based on team name, teamId, and game index
    const scoreSeed = (nameHash * 31 + gameIndex * 7 + teamId * 13) % 1000;
    const baseScore = 70;
    const homeScore = baseScore + (scoreSeed % 30);
    const awayScore = baseScore + ((scoreSeed * 5 + gameIndex * 11) % 30);
    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    
    games.push({
      id: nameHash + gameIndex * 1000 + daysAgo, // Generate numeric ID
      date: date.toISOString(),
      homeTeam,
      awayTeam,
      homeTeamKey: homeTeam || "",
      awayTeamKey: awayTeam || "",
      homeScore,
      awayScore,
      winner,
      winnerKey: winner,
    });
    
    gameIndex++;
  }
  
  // Sort games by date (most recent first)
  games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return games;
}

export function getMockHeadToHead(
  team1Id: number,
  team2Id: number,
  team1Name?: string,
  team2Name?: string
): HeadToHead {
  // Always use the provided team names if available
  const team1 = team1Name || MOCK_TEAMS[team1Id % MOCK_TEAMS.length];
  const team2 = team2Name || MOCK_TEAMS[team2Id % MOCK_TEAMS.length];
  
  // Ensure we have valid team names
  if (!team1 || !team2 || team1 === team2) {
    return {
      games: [],
      team1Wins: 0,
      team2Wins: 0,
      homeTeamWins: 0,
      awayTeamWins: 0,
    };
  }
  
  const games: GameResult[] = [];
  const nameHash = (team1 + team2).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Generate realistic H2H schedule - these teams have played over past seasons
  // Space games out over months/years
  let gameIndex = 0;
  let daysAgo = 15; // Start further back for H2H
  
  while (gameIndex < 5 && daysAgo < 365) { // Look back up to a year
    // H2H games are spaced further apart (weeks/months)
    const daysBetweenGames = 30 + ((nameHash + gameIndex * 13) % 60); // 30-90 days apart
    daysAgo += daysBetweenGames;
    
    if (daysAgo > 365) break;
    
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    // Alternate home/away
    const isHome = (nameHash + gameIndex) % 2 === 0;
    const homeTeam = isHome ? team1 : team2;
    const awayTeam = isHome ? team2 : team1;
    
    // Generate consistent scores based on team names and game index
    const scoreSeed = (nameHash + gameIndex * 11) % 1000;
    const homeScore = 60 + (scoreSeed % 40);
    const awayScore = 60 + ((scoreSeed * 5) % 40);
    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    
    games.push({
      id: nameHash + gameIndex * 10000 + team1Id * 100 + team2Id + daysAgo, // Generate numeric ID
      date: date.toISOString(),
      homeTeam,
      awayTeam,
      homeTeamKey: homeTeam || "",
      awayTeamKey: awayTeam || "",
      homeScore,
      awayScore,
      winner,
      winnerKey: winner,
    });
    
    gameIndex++;
  }
  
  // Sort games by date (most recent first)
  games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const team1Wins = games.filter((g) => g.winner === team1).length;
  const team2Wins = games.filter((g) => g.winner === team2).length;
  
  return {
    games,
    team1Wins: team1Wins,
    team2Wins: team2Wins,
    homeTeamWins: team2Wins, // Assuming team2 is home in current matchup
    awayTeamWins: team1Wins,
  };
}

// Transform functions - adjust based on actual API response structure
function transformToTeamStats(data: any): TeamStats {
  // TODO: Implement based on actual API response structure
  // For now, throw error if data structure is unexpected
  if (!data || !data.response) {
    throw new Error("Unexpected API response format for team stats");
  }
  
  // Extract team data from API response
  // Adjust based on actual API-Sports.io response structure
  const teamData = data.response[0] || data.response;
  
  return {
    id: teamData.team?.id || teamData.id,
    name: teamData.team?.name || teamData.name || "Unknown",
    code: teamData.team?.code || teamData.code || "UNK",
    logo: teamData.team?.logo || teamData.logo,
    wins: teamData.games?.wins?.total || teamData.wins || 0,
    losses: teamData.games?.loses?.total || teamData.losses || 0,
    pointsPerGame: teamData.points?.for?.average || teamData.pointsPerGame || 0,
    pointsAllowedPerGame: teamData.points?.against?.average || teamData.pointsAllowedPerGame || 0,
    recentGames: [],
  };
}

function transformToGameResults(data: any): GameResult[] {
  // Handle empty or missing response gracefully
  if (!data || !data.response) {
    console.warn("[transformToGameResults] No response data:", data);
    return [];
  }
  
  const games = Array.isArray(data.response) ? data.response : [];
  
  if (games.length === 0) {
    console.warn("[transformToGameResults] Empty games array in response");
    return [];
  }
  
  console.log(`[transformToGameResults] Transforming ${games.length} games`);
  
  return games.map((game: any, index: number) => {
    // API-Sports.io format: game.teams.home.name, game.scores.home.total, etc.
    const homeTeam = game.teams?.home?.name || game.homeTeam || "Unknown";
    const awayTeam = game.teams?.away?.name || game.awayTeam || "Unknown";
    const homeScore = game.scores?.home?.total ?? game.scores?.home?.points ?? game.homeScore ?? 0;
    const awayScore = game.scores?.away?.total ?? game.scores?.away?.points ?? game.awayScore ?? 0;
    
    // Determine winner
    let winner = "Unknown";
    if (game.teams?.home?.winner === true || game.teams?.home?.winner === 1) {
      winner = homeTeam;
    } else if (game.teams?.away?.winner === true || game.teams?.away?.winner === 1) {
      winner = awayTeam;
    } else if (homeScore > awayScore) {
      winner = homeTeam;
    } else if (awayScore > homeScore) {
      winner = awayTeam;
    }
    
    const result = {
      id: game.id || game.fixture?.id || index,
      date: game.date || game.fixture?.date || game.time?.starting?.date_time || new Date().toISOString(),
      homeTeam,
      awayTeam,
      homeScore: typeof homeScore === 'number' ? homeScore : parseInt(String(homeScore)) || 0,
      awayScore: typeof awayScore === 'number' ? awayScore : parseInt(String(awayScore)) || 0,
      winner,
    };
    
    console.log(`[transformToGameResults] Transformed game ${index + 1}: ${result.homeTeam} ${result.homeScore} - ${result.awayScore} ${result.awayTeam}, Winner: ${result.winner}`);
    
    return result;
  });
}

function transformToHeadToHead(
  data: any,
  team1Id: number,
  team2Id: number
): HeadToHead {
  // TODO: Implement based on actual API response structure
  if (!data || !data.response) {
    throw new Error("Unexpected API response format for head-to-head");
  }
  
  const games = Array.isArray(data.response) ? data.response : [];
  const gameResults = transformToGameResults(data);
  
  // Count wins for each team
  let team1Wins = 0;
  let team2Wins = 0;
  
  // Determine which team is team1 and team2 based on first game
  const firstGame = games[0];
  const team1Name = firstGame?.teams?.home?.name || firstGame?.teams?.away?.name;
  
  gameResults.forEach((game) => {
    // This is simplified - you may need to adjust based on actual team IDs
    if (game.winner === team1Name) {
      team1Wins++;
    } else {
      team2Wins++;
    }
  });
  
  return {
    games: gameResults,
    team1Wins: team1Wins,
    team2Wins: team2Wins,
    homeTeamWins: team2Wins, // Adjust based on which team is home
    awayTeamWins: team1Wins,
  };
}

