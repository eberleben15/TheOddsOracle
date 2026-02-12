import { NextResponse } from "next/server";
import { getUpcomingGames } from "@/lib/odds-api";
import { getSportConfig, Sport } from "@/lib/sports/sport-config";

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
    const regions = searchParams.get("regions") || "us";
    const markets = searchParams.get("markets") || "h2h,spreads";

    const games = await getUpcomingGames(sport, regions, markets);
    return NextResponse.json(games);
  } catch (error) {
    console.error("Error in odds API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch odds", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

