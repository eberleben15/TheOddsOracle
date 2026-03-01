/**
 * Cron Job: Line Movement Re-prediction
 * 
 * Monitors betting lines for significant movement and automatically
 * regenerates predictions when thresholds are exceeded.
 * 
 * Schedule: every 15 minutes
 */

import { NextRequest, NextResponse } from "next/server";
import { runLineMovementReprediction } from "@/lib/line-movement-reprediction";
import { prisma } from "@/lib/prisma";

export const maxDuration = 120; // Allow up to 2 minutes

const SPORTS = [
  'basketball_ncaab',
  'basketball_nba', 
  'icehockey_nhl',
  'baseball_mlb',
  'americanfootball_nfl',
  'americanfootball_ncaaf',
];

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (process.env.NODE_ENV === "production") {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("[CRON line-movement] Starting line movement monitoring...");

  try {
    const result = await runLineMovementReprediction(SPORTS);
    
    // Log execution
    await prisma.jobExecution.create({
      data: {
        jobName: "line-movement",
        status: result.repredictionsFailed === 0 ? "success" : "partial",
        completedAt: new Date(),
        metadata: JSON.parse(JSON.stringify({
          movementsDetected: result.movementsDetected,
          repredictionsAttempted: result.repredictionsAttempted,
          repredictionsSucceeded: result.repredictionsSucceeded,
          repredictionsFailed: result.repredictionsFailed,
          materialChanges: result.materialChanges,
          duration: result.duration,
          errors: result.errors,
        })),
      },
    });

    const totalDuration = Date.now() - startTime;
    console.log(
      `[CRON line-movement] Completed in ${totalDuration}ms: ` +
      `${result.movementsDetected} movements, ${result.materialChanges} material changes`
    );

    return NextResponse.json({
      success: true,
      totalDuration,
      ...result,
    });
  } catch (error) {
    console.error("[CRON line-movement] Error:", error);
    
    await prisma.jobExecution.create({
      data: {
        jobName: "line-movement",
        status: "failed",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
