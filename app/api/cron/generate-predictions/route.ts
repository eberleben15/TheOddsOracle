/**
 * Cron Job: Generate Predictions for Upcoming Games
 * 
 * Scheduled to run daily at 7:00 AM
 * Generates predictions for all upcoming games (next 5 days)
 * 
 * Can be triggered via:
 * - Vercel Cron: https://vercel.com/docs/cron-jobs
 * - External cron service (cron-job.org, EasyCron, etc.)
 * - Manual trigger: POST /api/cron/generate-predictions
 */

import { NextRequest, NextResponse } from "next/server";
import { getUpcomingGames } from "@/lib/odds-api";
import { getTeamSeasonStats, findTeamByName } from "@/lib/sportsdata-api";
import { loadRecalibrationFromDb } from "@/lib/prediction-feedback-batch";
import { calculateTeamAnalytics, predictMatchup } from "@/lib/advanced-analytics";
import { trackPrediction } from "@/lib/prediction-tracker";
import { getSportFromGame } from "@/lib/sports/sport-detection";
import { logJobExecution } from "@/lib/job-logger";

function verifyCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false; // CRON_SECRET must be set
  }
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // For cron services that use GET
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
  console.log("\n🚀 Starting prediction generation job...\n");

  try {
    // Load trained recalibration params (if any) for this process
    await loadRecalibrationFromDb();

    // Step 1: Fetch upcoming games (next 5 days)
    console.log("📅 Fetching upcoming games...");
    const games = await getUpcomingGames("basketball_ncaab", "us", "h2h,spreads");
    
    // Filter to games in next 5 days
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
    
    const upcomingGames = games.filter(game => {
      const gameDate = new Date(game.commence_time);
      return gameDate <= fiveDaysFromNow && gameDate >= new Date();
    });

    console.log(`Found ${upcomingGames.length} upcoming games\n`);

    if (upcomingGames.length === 0) {
      await logJobExecution({
        jobName: "generate-predictions",
        status: "success",
        startedAt: new Date(startTime),
        completedAt: new Date(),
        metadata: { totalGames: 0, successCount: 0, errorCount: 0 },
      });
      return NextResponse.json({
        success: true,
        message: "No upcoming games found",
        predictionsGenerated: 0,
        duration: Date.now() - startTime,
      });
    }

    // Step 2: Generate predictions for each game
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const game of upcomingGames) {
      try {
        // Find teams in SportsData.io
        const [awayTeam, homeTeam] = await Promise.all([
          findTeamByName(game.away_team),
          findTeamByName(game.home_team),
        ]);

        if (!awayTeam || !homeTeam) {
          console.warn(`⚠️  Skipping ${game.away_team} vs ${game.home_team}: team not found`);
          errorCount++;
          continue;
        }

        // Fetch team stats
        const [awayStats, homeStats] = await Promise.all([
          getTeamSeasonStats(game.away_team),
          getTeamSeasonStats(game.home_team),
        ]);

        if (!awayStats || !homeStats) {
          console.warn(`⚠️  Skipping ${game.away_team} vs ${game.home_team}: stats not available`);
          errorCount++;
          continue;
        }

        const sport = getSportFromGame(game);

        const awayAnalytics = calculateTeamAnalytics(
          awayStats,
          awayStats.recentGames || [],
          false,
          sport
        );
        const homeAnalytics = calculateTeamAnalytics(
          homeStats,
          homeStats.recentGames || [],
          true,
          sport
        );

        const prediction = predictMatchup(
          awayAnalytics,
          homeAnalytics,
          awayStats,
          homeStats,
          sport
        );

        // Track prediction with full payload for feedback loop (including trace for training)
        await trackPrediction(
          game.id,
          game.commence_time,
          game.home_team,
          game.away_team,
          prediction,
          {
            sport: game.sport_key ?? "basketball_ncaab",
            keyFactors: prediction.keyFactors?.length ? prediction.keyFactors : undefined,
            valueBets: prediction.valueBets?.length ? prediction.valueBets : undefined,
            predictionTrace: prediction.trace ?? undefined,
          }
        );

        successCount++;
        console.log(`✅ Generated prediction for ${game.away_team} vs ${game.home_team}`);
      } catch (error) {
        errorCount++;
        const errorMsg = `Error processing ${game.away_team} vs ${game.home_team}: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }

      // Rate limiting: small delay between games
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const duration = Date.now() - startTime;

    await logJobExecution({
      jobName: "generate-predictions",
      status: "success",
      startedAt: new Date(startTime),
      completedAt: new Date(),
      metadata: { totalGames: upcomingGames.length, successCount, errorCount },
    });

    console.log(`\n✅ Job complete: ${successCount} predictions generated, ${errorCount} errors in ${duration}ms\n`);

    return NextResponse.json({
      success: true,
      predictionsGenerated: successCount,
      errorCount: errorCount,
      totalGames: upcomingGames.length,
      duration,
      errors: errors.slice(0, 10), // Return first 10 errors
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

