import { OddsGame, LiveGame } from "@/types";
import { gameOddsCache } from "./game-cache";
import { fetchWithRetry } from "./retry-utils";
import { Sport, getSportConfig, SPORT_CONFIGS } from "@/lib/sports/sport-config";

const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

export async function getLiveGames(
  sport: string = "basketball_ncaab"
): Promise<LiveGame[]> {
  return getLiveGamesBySport(sport);
}

export async function getLiveGamesBySport(
  sport: string = "basketball_ncaab"
): Promise<LiveGame[]> {
  const apiKey = process.env.THE_ODDS_API_KEY;

  if (!apiKey) {
    throw new Error("THE_ODDS_API_KEY is not set in environment variables");
  }

  try {
    const url = `${THE_ODDS_API_BASE_URL}/sports/${sport}/scores/?daysFrom=1&apiKey=${apiKey}`;
    const response = await fetchWithRetry(
      url,
      {
        next: { revalidate: 30 }, // Refresh every 30 seconds
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        retryable: (error) => {
          // Don't retry on 401 (auth errors) or 404 (not found)
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("401") || message.includes("404") || message.includes("403")) {
              return false;
            }
          }
          return true;
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to fetch live scores: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error_code === 'OUT_OF_USAGE_CREDITS') {
            errorMessage = `API quota exceeded: ${errorJson.message}. Please upgrade your plan at https://the-odds-api.com/ or wait for your quota to reset.`;
          } else {
            errorMessage = `API key error: ${errorJson.message || 'Invalid or expired API key'}. Please check THE_ODDS_API_KEY in your .env.local file.`;
          }
        } catch {
          errorMessage += '. This usually means your API key is invalid or expired. Please check THE_ODDS_API_KEY in your .env.local file.';
        }
      }
      
      console.error(`[ODDS API] Error ${response.status}:`, errorText || response.statusText);
      throw new Error(errorMessage);
    }

    const data: LiveGame[] = await response.json();

    // Filter for only in-progress games (not completed, has scores)
    const liveGames = data.filter(
      (game) => !game.completed && game.scores && game.scores.length > 0
    );

    return liveGames;
  } catch (error) {
    console.error("Error fetching live games:", error);
    throw error;
  }
}

export interface CompletedScoresResult {
  games: LiveGame[];
  error?: string;
}

/**
 * Fetch completed games with final scores from Odds API.
 * Use for matching predictions (stored with Odds API game IDs) to outcomes.
 * Returns games + optional error message (surfaced instead of silently failing).
 * @param sport - Odds API sport key (e.g. basketball_ncaab)
 * @param daysFrom - Look back this many days (API max varies by plan; use 1 to avoid 422)
 */
export async function getCompletedScoresBySport(
  sport: string = "basketball_ncaab",
  daysFrom: number = 1
): Promise<CompletedScoresResult> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) {
    return { games: [], error: "THE_ODDS_API_KEY not set" };
  }

  try {
    const url = `${THE_ODDS_API_BASE_URL}/sports/${sport}/scores/?daysFrom=${daysFrom}&apiKey=${apiKey}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const text = await response.text();
      let errMsg = `Odds API ${sport} scores: ${response.status}`;
      try {
        const json = JSON.parse(text);
        if (json.message) errMsg += ` - ${json.message}`;
        else if (json.error) errMsg += ` - ${json.error}`;
      } catch {
        if (text) errMsg += ` - ${text.slice(0, 100)}`;
      }
      return { games: [], error: errMsg };
    }

    const data: LiveGame[] = await response.json();
    const games = data.filter(
      (g) => g.completed && g.scores && g.scores.length >= 2
    );
    return { games };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("Error fetching completed scores:", error);
    return { games: [], error: `Odds API ${sport}: ${msg}` };
  }
}

export async function getUpcomingGames(
  sport: string = "basketball_ncaab",
  regions: string = "us",
  markets: string = "h2h,spreads"
): Promise<OddsGame[]> {
  return getUpcomingGamesBySport(sport, regions, markets);
}

export async function getUpcomingGamesBySport(
  sport: string = "basketball_ncaab",
  regions: string = "us",
  markets: string = "h2h,spreads"
): Promise<OddsGame[]> {
  const apiKey = process.env.THE_ODDS_API_KEY;

  if (!apiKey) {
    throw new Error("THE_ODDS_API_KEY is not set in environment variables");
  }

  try {
    const url = `${THE_ODDS_API_BASE_URL}/sports/${sport}/odds/?regions=${regions}&markets=${markets}&apiKey=${apiKey}`;
    const startTime = Date.now();
    
    const response = await fetchWithRetry(
      url,
      {
        next: { 
          revalidate: 30, // Cache for 30 seconds (odds change frequently)
          tags: ['odds', sport] 
        }
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        retryable: (error) => {
          // Don't retry on 401 (auth errors) or 404 (not found)
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("401") || message.includes("404") || message.includes("403")) {
              return false;
            }
          }
          return true;
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorMessage = `Failed to fetch odds: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error_code === 'OUT_OF_USAGE_CREDITS') {
            errorMessage = `API quota exceeded: ${errorJson.message}. Please upgrade your plan at https://the-odds-api.com/ or wait for your quota to reset.`;
          } else {
            errorMessage = `API key error: ${errorJson.message || 'Invalid or expired API key'}. Please check THE_ODDS_API_KEY in your .env.local file.`;
          }
        } catch {
          errorMessage += '. This usually means your API key is invalid or expired. Please check THE_ODDS_API_KEY in your .env.local file.';
        }
      }
      
      console.error(`[ODDS API] Error ${response.status}:`, errorText || response.statusText);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const elapsed = Date.now() - startTime;
    console.log(`[ODDS API] Fetched ${data.length} games in ${elapsed}ms`);
    
    // Store all games in cache for quick lookup
    const games = data as OddsGame[];
    gameOddsCache.setMany(games);
    
    return games;
  } catch (error) {
    console.error("Error fetching odds:", error);
    throw error;
  }
}

/**
 * Fetch a single game by ID. When sport is provided, fetches that sport's games
 * (required for NHL/NBA etc. since we otherwise only fetch CBB). When omitted,
 * tries cache, then CBB, then other sports until found.
 */
export async function getGameOdds(gameId: string, sport?: Sport): Promise<OddsGame | null> {
  const cachedGame = gameOddsCache.get(gameId);
  if (cachedGame) {
    console.log(`[ODDS API] Cache hit for game ${gameId} - skipping API call`);
    return cachedGame;
  }

  const sportsToTry: Sport[] = sport
    ? [sport]
    : (["cbb", "nba", "nhl", "nfl", "mlb"] as Sport[]);

  for (const s of sportsToTry) {
    try {
      const oddsKey = getSportConfig(s).oddsApiKey;
      console.log(`[ODDS API] Cache miss for game ${gameId} - fetching ${s} (${oddsKey})`);
      const games = await getUpcomingGamesBySport(oddsKey);
      const game = games.find((g) => g.id === gameId);
      if (game) return game;
    } catch (err) {
      console.warn(`[ODDS API] Failed to fetch ${s} games:`, err);
    }
  }
  return null;
}
