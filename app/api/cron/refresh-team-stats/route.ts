/**
 * Cron Job: Refresh Team Stats
 * 
 * Scheduled to run daily at 6:30 AM (after games complete)
 * Fetches updated team stats for all active teams
 * 
 * This job should run before generate-predictions to ensure
 * predictions use the latest data.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUpcomingGames } from "@/lib/odds-api";
import { getTeamSeasonStats, findTeamByName } from "@/lib/sportsdata-api";
import { getAllTeamRatings } from "@/lib/team-ratings-cache";

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
  console.log("\n🔄 Starting team stats refresh job...\n");

  try {
    // Step 1: Get all upcoming games to identify active teams
    console.log("📅 Identifying active teams from upcoming games...");
    const games = await getUpcomingGames("basketball_ncaab", "us", "h2h,spreads");
    
    // Get unique team names
    const teamNames = new Set<string>();
    games.forEach(game => {
      teamNames.add(game.home_team);
      teamNames.add(game.away_team);
    });

    console.log(`Found ${teamNames.size} unique teams\n`);

    // Step 2: Pre-load team ratings cache (includes fetching all team stats)
    console.log("📊 Refreshing team ratings cache...");
    const ratingsCache = await getAllTeamRatings();
    console.log(`✅ Cached ${ratingsCache.size / 3} team ratings\n`);

    // Step 3: Fetch stats for each team (this populates cache)
    let successCount = 0;
    let errorCount = 0;

    for (const teamName of teamNames) {
      try {
        await getTeamSeasonStats(teamName);
        successCount++;
      } catch (error) {
        errorCount++;
        console.warn(`⚠️  Failed to refresh stats for ${teamName}:`, error);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ Job complete: ${successCount} teams refreshed, ${errorCount} errors in ${duration}ms\n`);

    return NextResponse.json({
      success: true,
      teamsRefreshed: successCount,
      errors: errorCount,
      totalTeams: teamNames.size,
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

