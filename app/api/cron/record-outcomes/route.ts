/**
 * Cron Job: Record Game Outcomes
 * 
 * Scheduled to run daily at 2:00 AM (after games complete)
 * Matches completed games to predictions and records actual scores
 * 
 * This uses the existing validate-daily.ts logic
 */

import { NextRequest, NextResponse } from "next/server";
import { getGamesByDate } from "@/lib/sportsdata-api";
import { recordOutcomeByGameId, getTrackingStats } from "@/lib/prediction-tracker";
import { prisma } from "@/lib/prisma";

function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }
  
  return true;
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("\n📊 Starting outcome recording job...\n");

  try {
    // Get yesterday's date (games that completed)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    console.log(`Checking games from ${dateStr}...`);

    // Get completed games
    const games = await getGamesByDate(dateStr);
    const completedGames = games.filter(
      g => g.IsClosed && g.HomeTeamScore !== null && g.AwayTeamScore !== null
    );

    if (completedGames.length === 0) {
      console.log(`No completed games found for ${dateStr}`);
      return NextResponse.json({
        success: true,
        message: "No completed games found",
        outcomesRecorded: 0,
        duration: Date.now() - startTime,
      });
    }

    console.log(`Found ${completedGames.length} completed games\n`);

    // Record outcomes for tracked predictions
    let outcomesRecorded = 0;
    for (const game of completedGames) {
      const recorded = await recordOutcomeByGameId(
        String(game.GameID),
        game.HomeTeamScore!,
        game.AwayTeamScore!
      );
      if (recorded) {
        outcomesRecorded++;
      }
    }

    const stats = await getTrackingStats();
    const duration = Date.now() - startTime;

    console.log(`✅ Recorded ${outcomesRecorded} outcomes (${stats.validated} total validated predictions)\n`);

    return NextResponse.json({
      success: true,
      outcomesRecorded,
      totalCompletedGames: completedGames.length,
      totalValidatedPredictions: stats.validated,
      duration,
    });
  } catch (error) {
    console.error("❌ Job failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

