import { NextResponse } from "next/server";
import { getLiveGames } from "@/lib/odds-api";

export const runtime = 'nodejs';
export const revalidate = 30; // Revalidate every 30 seconds

/**
 * Map sport code (cbb, nba, etc.) to The Odds API sport key (basketball_ncaab, etc.)
 */
function mapSportToOddsApiKey(sport: string): string {
  // If it's already a The Odds API key format, return as-is
  if (sport.includes("_")) {
    return sport;
  }

  // Map our sport codes to The Odds API keys
  const sportMapping: Record<string, string> = {
    cbb: "basketball_ncaab",
    nba: "basketball_nba",
    nfl: "americanfootball_nfl",
    nhl: "icehockey_nhl",
    mlb: "baseball_mlb",
  };

  return sportMapping[sport.toLowerCase()] || "basketball_ncaab";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sportParam = searchParams.get("sport") || "cbb";
    const sport = mapSportToOddsApiKey(sportParam);

    const games = await getLiveGames(sport);
    return NextResponse.json(games);
  } catch (error) {
    console.error("Error in live games API route:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch live games";
    
    // Check if it's an API key error
    if (errorMessage.includes("THE_ODDS_API_KEY")) {
      return NextResponse.json(
        { 
          error: "API key not configured",
          message: "THE_ODDS_API_KEY is not set in environment variables. Please configure it in .env.local"
        },
        { status: 500 }
      );
    }
    
    // Check if it's a rate limit or API error
    if (errorMessage.includes("Failed to fetch") || errorMessage.includes("status")) {
      return NextResponse.json(
        { 
          error: "API request failed",
          message: "Failed to fetch live games. Please check your API key and rate limits, or try again later."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: "Unknown error",
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

