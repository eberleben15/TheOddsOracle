/**
 * Cron Job: Capture Odds Snapshots
 * 
 * Runs every 2 hours to capture odds for all tracked sports.
 * Stores historical odds for CLV (Closing Line Value) analysis.
 * 
 * Schedule: "0 *​/2 * * *" (every 2 hours)
 */

import { NextRequest, NextResponse } from "next/server";
import { captureAllOdds, markClosingLines, cleanupOldOddsHistory } from "@/lib/odds-history";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60; // Allow up to 60 seconds

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

  console.log("[CRON capture-odds] Starting odds capture...");

  try {
    // 1. Capture odds for all sports
    const captureResult = await captureAllOdds();
    
    // 2. Mark closing lines for games that have started
    const closingLinesMarked = await markClosingLines();
    
    // 3. Clean up old data (once per day, check if needed)
    let cleanedUp = 0;
    const lastCleanup = await prisma.modelConfig.findUnique({
      where: { key: "odds_history_last_cleanup" },
    });
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    if (!lastCleanup || new Date(lastCleanup.updatedAt) < oneDayAgo) {
      cleanedUp = await cleanupOldOddsHistory(30);
      await prisma.modelConfig.upsert({
        where: { key: "odds_history_last_cleanup" },
        create: { key: "odds_history_last_cleanup", value: { timestamp: new Date().toISOString() } },
        update: { value: { timestamp: new Date().toISOString() } },
      });
    }

    // Log execution
    await prisma.jobExecution.create({
      data: {
        jobName: "capture-odds",
        status: captureResult.totalErrors === 0 ? "success" : "partial",
        completedAt: new Date(),
        metadata: {
          ...captureResult,
          closingLinesMarked,
          cleanedUp,
        },
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[CRON capture-odds] Completed in ${duration}ms: ${captureResult.totalSnapshots} snapshots, ${captureResult.totalErrors} errors`);

    return NextResponse.json({
      success: true,
      duration,
      snapshots: captureResult.totalSnapshots,
      errors: captureResult.totalErrors,
      closingLinesMarked,
      cleanedUp,
      details: captureResult.results,
    });
  } catch (error) {
    console.error("[CRON capture-odds] Error:", error);
    
    await prisma.jobExecution.create({
      data: {
        jobName: "capture-odds",
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
