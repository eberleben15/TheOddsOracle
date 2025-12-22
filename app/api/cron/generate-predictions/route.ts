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
import { calculateTeamAnalytics, predictMatchup } from "@/lib/advanced-analytics";
import { trackPrediction } from "@/lib/prediction-tracker";
import { prisma } from "@/lib/prisma";

// Verify request is from cron service (optional, for security)
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, require it
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }
  
  // Otherwise, allow (not recommended for production)
  return true;
}

export async function GET(request: NextRequest) {
  // For cron services that use GET
  return POST(request);
}

export async function POST(request: NextRequest) {
  // Verify this is a legitimate cron request (optional)
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  console.log("\n🚀 Starting prediction generation job...\n");

  try {
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

        // Generate prediction
        const prediction = predictMatchup(
          awayAnalytics,
          homeAnalytics,
          awayStats,
          homeStats
        );

        // Track prediction in database
        await trackPrediction(
          game.id,
          game.commence_time,
          game.home_team,
          game.away_team,
          prediction
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

    // Log job execution to database (optional)
    try {
      await prisma.$executeRaw`
        INSERT INTO oddsoracle.job_executions (id, "jobName", status, "startedAt", "completedAt", metadata)
        VALUES (gen_random_uuid()::text, 'generate-predictions', 'success', ${new Date(startTime)}, ${new Date()}, ${JSON.stringify({
          totalGames: upcomingGames.length,
          successCount,
          errorCount,
        })}::jsonb)
      `;
    } catch (dbError) {
      // Job execution log table might not exist yet, that's okay
      console.warn("Could not log job execution:", dbError);
    }

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

