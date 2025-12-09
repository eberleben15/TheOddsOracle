import { NextResponse } from "next/server";
import { getUpcomingGames } from "@/lib/odds-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get("sport") || "basketball_ncaab";
    const regions = searchParams.get("regions") || "us";
    const markets = searchParams.get("markets") || "h2h,spreads";

    const games = await getUpcomingGames(sport, regions, markets);
    return NextResponse.json(games);
  } catch (error) {
    console.error("Error in odds API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch odds" },
      { status: 500 }
    );
  }
}

