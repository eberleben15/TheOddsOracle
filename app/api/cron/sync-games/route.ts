/**
 * Cron Job: Sync Games & Generate Predictions
 * 
 * Runs every 2 hours to:
 * 1. Discover new games from the Odds API
 * 2. Generate predictions for games that don't have one
 * 
 * This is the primary prediction pipeline - ensures every game
 * gets a prediction as soon as it's discovered.
 */

import { NextRequest, NextResponse } from "next/server";
import { syncGames, getSyncStats } from "@/lib/game-sync";
import { logJobExecution } from "@/lib/job-logger";

function verifyCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Set CRON_SECRET and send Bearer token." },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  console.log("\n🚀 Starting game sync cron job...\n");

  try {
    const result = await syncGames();
    
    // Get current stats
    const stats = await getSyncStats();

    await logJobExecution({
      jobName: "sync-games",
      status: result.success ? "success" : "failed",
      startedAt: new Date(startTime),
      completedAt: new Date(),
      metadata: {
        gamesDiscovered: result.gamesDiscovered,
        newGames: result.newGames,
        predictionsGenerated: result.predictionsGenerated,
        sportBreakdown: result.sportBreakdown,
        currentStats: stats,
        errorCount: result.errors.length,
      },
    });

    return NextResponse.json({
      success: true,
      gamesDiscovered: result.gamesDiscovered,
      newGames: result.newGames,
      predictionsGenerated: result.predictionsGenerated,
      sportBreakdown: result.sportBreakdown,
      currentStats: stats,
      duration: result.duration,
      errors: result.errors.slice(0, 10),
    });
  } catch (error) {
    console.error("❌ Game sync failed:", error);
    
    await logJobExecution({
      jobName: "sync-games",
      status: "failed",
      startedAt: new Date(startTime),
      completedAt: new Date(),
      error: error instanceof Error ? error.message : String(error),
    });

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
