import { NextResponse } from "next/server";
import { getRecommendedBets } from "@/lib/recommended-bets-aggregator";
import { Sport, SPORT_CONFIGS } from "@/lib/sports/sport-config";

// Cache for 5 minutes (matches the recommended bets cache TTL)
export const revalidate = 300; // 5 minutes

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sportParam = searchParams.get("sport") as Sport | null;
    const sport: Sport = sportParam && sportParam in SPORT_CONFIGS ? sportParam : "cbb";
    
    const bets = await getRecommendedBets(sport, 10);
    
    return NextResponse.json(
      { bets },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching recommended bets:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommended bets", bets: [] },
      { status: 500 }
    );
  }
}

