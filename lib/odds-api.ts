import { OddsGame } from "@/types";

const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

export async function getUpcomingGames(
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
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch odds: ${response.statusText}`);
    }

    const data = await response.json();
    return data as OddsGame[];
  } catch (error) {
    console.error("Error fetching odds:", error);
    throw error;
  }
}

export async function getGameOdds(gameId: string): Promise<OddsGame | null> {
  // The Odds API v4 doesn't support fetching a single game by ID
  // Instead, we fetch all games and find the matching one
  try {
    const games = await getUpcomingGames();
    const game = games.find((g) => g.id === gameId);
    return game || null;
  } catch (error) {
    console.error("Error fetching game odds:", error);
    return null;
  }
}

