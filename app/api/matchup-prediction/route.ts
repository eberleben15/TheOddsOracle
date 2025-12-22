/**
 * Matchup Prediction API Route
 * 
 * GET /api/matchup-prediction?awayTeam=Wisconsin&homeTeam=Duke&sport=cbb
 */

import { NextResponse } from "next/server";
import { getTeamSeasonStats } from "@/lib/sports/unified-sports-api";
import { calculateTeamAnalytics, predictMatchup } from "@/lib/advanced-analytics";
import { Sport } from "@/lib/sports/sport-config";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const awayTeam = searchParams.get("awayTeam");
    const homeTeam = searchParams.get("homeTeam");
    const sport = (searchParams.get("sport") || "cbb") as Sport;

    if (!awayTeam || !homeTeam) {
      return NextResponse.json(
        { error: "Missing 'awayTeam' and/or 'homeTeam' parameters" },
        { status: 400 }
      );
    }

    // Get team stats
    const [awayStats, homeStats] = await Promise.all([
      getTeamSeasonStats(sport, awayTeam),
      getTeamSeasonStats(sport, homeTeam),
    ]);

    if (!awayStats || !homeStats) {
      return NextResponse.json(
        {
          error: `Could not find stats for ${!awayStats ? awayTeam : homeTeam}`,
          awayTeamFound: !!awayStats,
          homeTeamFound: !!homeStats,
        },
        { status: 404 }
      );
    }

    // Calculate analytics
    const awayAnalytics = calculateTeamAnalytics(
      awayStats,
      awayStats.recentGames || [],
      false
    );
    const homeAnalytics = calculateTeamAnalytics(
      homeStats,
      homeStats.recentGames || [],
      true
    );

    // Get prediction
    const prediction = predictMatchup(
      awayAnalytics,
      homeAnalytics,
      awayStats,
      homeStats
    );

    return NextResponse.json({
      success: true,
      matchup: {
        awayTeam,
        homeTeam,
        sport,
      },
      prediction,
      teamStats: {
        away: awayStats,
        home: homeStats,
      },
    });
  } catch (error) {
    console.error("Error in matchup prediction API route:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate prediction",
      },
      { status: 500 }
    );
  }
}

