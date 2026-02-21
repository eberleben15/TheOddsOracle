/**
 * Admin API: Backfill Predictions
 * 
 * Fetches all games and generates predictions for any that don't have one.
 * 
 * POST - Run backfill
 * GET - Preview what would be backfilled
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";
import { getUpcomingGames } from "@/lib/odds-api";
import { generatePredictionForGame } from "@/lib/prediction-generator";
import { TRACKED_SPORTS } from "@/lib/game-sync";
import { logJobExecution } from "@/lib/job-logger";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const sports = searchParams.get("sports")?.split(",") || [...TRACKED_SPORTS];

  try {
    const preview: Record<string, { total: number; needsPrediction: number; games: string[] }> = {};
    
    for (const sport of sports) {
      const games = await getUpcomingGames(sport, "us", "h2h,spreads");
      
      // Check which games already have predictions
      const gameIds = games.map(g => g.id);
      const existingPredictions = await prisma.prediction.findMany({
        where: { gameId: { in: gameIds } },
        select: { gameId: true },
      });
      const existingIds = new Set(existingPredictions.map(p => p.gameId));
      
      const needsPrediction = games.filter(g => !existingIds.has(g.id));
      
      preview[sport] = {
        total: games.length,
        needsPrediction: needsPrediction.length,
        games: needsPrediction.slice(0, 5).map(g => `${g.away_team} @ ${g.home_team}`),
      };
      
      await new Promise(r => setTimeout(r, 100));
    }

    const totalGames = Object.values(preview).reduce((sum, s) => sum + s.total, 0);
    const totalNeedsPrediction = Object.values(preview).reduce((sum, s) => sum + s.needsPrediction, 0);

    return NextResponse.json({
      preview: true,
      totalGames,
      totalNeedsPrediction,
      bySport: preview,
      hint: "POST to this endpoint to run the backfill",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  
  let body: { sports?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // No body provided, use defaults
  }

  const sports = body.sports || [...TRACKED_SPORTS];

  console.log("\n🔄 Starting prediction backfill...\n");

  try {
    const results: Record<string, { total: number; generated: number; skipped: number; errors: number }> = {};
    let totalGenerated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    const errorMessages: string[] = [];

    for (const sport of sports) {
      console.log(`📊 Processing ${sport}...`);
      const sportResult = { total: 0, generated: 0, skipped: 0, errors: 0 };

      try {
        const games = await getUpcomingGames(sport, "us", "h2h,spreads");
        sportResult.total = games.length;

        // Check which games already have predictions
        const gameIds = games.map(g => g.id);
        const existingPredictions = await prisma.prediction.findMany({
          where: { gameId: { in: gameIds } },
          select: { gameId: true },
        });
        const existingIds = new Set(existingPredictions.map(p => p.gameId));

        for (const game of games) {
          if (existingIds.has(game.id)) {
            sportResult.skipped++;
            continue;
          }

          const result = await generatePredictionForGame(game);
          
          if (result.success) {
            sportResult.generated++;
            console.log(`  ✅ ${game.away_team} @ ${game.home_team}`);
          } else if (result.skipped) {
            sportResult.skipped++;
          } else {
            sportResult.errors++;
            if (result.error) {
              errorMessages.push(`${game.away_team} @ ${game.home_team}: ${result.error}`);
            }
          }

          await new Promise(r => setTimeout(r, 100));
        }

        // Also ensure games are tracked
        for (const game of games) {
          const exists = await prisma.trackedGame.findUnique({
            where: { externalId: game.id },
          });
          if (!exists) {
            await prisma.trackedGame.create({
              data: {
                externalId: game.id,
                sport: game.sport_key,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: new Date(game.commence_time),
                status: existingIds.has(game.id) || sportResult.generated > 0 ? "predicted" : "pending",
              },
            });
          }
        }
      } catch (err) {
        console.error(`  ❌ Error processing ${sport}:`, err);
        errorMessages.push(`${sport}: ${err instanceof Error ? err.message : String(err)}`);
      }

      results[sport] = sportResult;
      totalGenerated += sportResult.generated;
      totalSkipped += sportResult.skipped;
      totalErrors += sportResult.errors;

      await new Promise(r => setTimeout(r, 200));
    }

    const duration = Date.now() - startTime;

    await logJobExecution({
      jobName: "backfill-predictions",
      status: totalErrors === 0 ? "success" : "partial",
      startedAt: new Date(startTime),
      completedAt: new Date(),
      metadata: {
        totalGenerated,
        totalSkipped,
        totalErrors,
        bySport: results,
      },
    });

    console.log(`\n✅ Backfill complete: ${totalGenerated} generated, ${totalSkipped} skipped in ${duration}ms\n`);

    return NextResponse.json({
      success: true,
      totalGenerated,
      totalSkipped,
      totalErrors,
      bySport: results,
      duration,
      errors: errorMessages.slice(0, 10),
    });
  } catch (error) {
    console.error("❌ Backfill failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
