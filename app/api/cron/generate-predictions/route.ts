/**
 * DEPRECATED: This endpoint is replaced by /api/cron/sync-games
 * 
 * Keeping for backwards compatibility - redirects to the new endpoint.
 * The sync-games endpoint handles both game discovery AND prediction generation.
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
  console.log("\n🔄 [DEPRECATED] generate-predictions redirecting to sync-games...\n");

  try {
    // Use the new unified sync-games pipeline
    const result = await syncGames();
    const stats = await getSyncStats();

    await logJobExecution({
      jobName: "generate-predictions",
      status: result.success ? "success" : "failed",
      startedAt: new Date(startTime),
      completedAt: new Date(),
      metadata: {
        redirectedTo: "sync-games",
        gamesDiscovered: result.gamesDiscovered,
        newGames: result.newGames,
        predictionsGenerated: result.predictionsGenerated,
        sportBreakdown: result.sportBreakdown,
        currentStats: stats,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Redirected to sync-games pipeline",
      predictionsGenerated: result.predictionsGenerated,
      gamesDiscovered: result.gamesDiscovered,
      newGames: result.newGames,
      sportBreakdown: result.sportBreakdown,
      duration: result.duration,
    });
  } catch (error) {
    console.error("❌ Job failed:", error);
    
    await logJobExecution({
      jobName: "generate-predictions",
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
