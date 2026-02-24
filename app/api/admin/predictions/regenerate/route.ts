/**
 * Admin API: Regenerate Predictions
 * 
 * Re-runs predictions for existing games. Useful when the model is updated.
 * 
 * POST - Regenerate predictions
 * GET - Preview what would be regenerated
 * 
 * Options:
 * - sports: Array of sport keys to regenerate (default: all)
 * - filter: "all" | "pending" | "validated" (default: "pending")
 * - limit: Max number to regenerate (default: 100)
 * - dateFrom: Only regenerate games after this date (ISO string)
 * - dateTo: Only regenerate games before this date (ISO string)
 * - gameIds: Specific game IDs to regenerate (overrides other filters)
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";
import { getUpcomingGames } from "@/lib/odds-api";
import { generatePredictionForGame } from "@/lib/prediction-generator";
import { TRACKED_SPORTS } from "@/lib/game-sync";
import { logJobExecution } from "@/lib/job-logger";
import { logPredictionRegenerated, type PredictionSnapshot } from "@/lib/prediction-history";
import type { OddsGame } from "@/types";

interface RegenerateOptions {
  sports?: string[];
  filter?: "all" | "pending" | "validated";
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  gameIds?: string[];
}

async function buildQuery(options: RegenerateOptions) {
  const where: any = {};

  if (options.gameIds?.length) {
    where.gameId = { in: options.gameIds };
  } else {
    if (options.sports?.length) {
      where.sport = { in: options.sports };
    }

    if (options.filter === "pending") {
      where.validated = false;
    } else if (options.filter === "validated") {
      where.validated = true;
    }

    if (options.dateFrom) {
      where.date = { ...where.date, gte: new Date(options.dateFrom) };
    }
    if (options.dateTo) {
      where.date = { ...where.date, lte: new Date(options.dateTo) };
    }

    // Only include future games by default (past games can't be re-predicted meaningfully)
    if (!options.dateFrom && options.filter !== "validated") {
      where.date = { ...where.date, gte: new Date() };
    }
  }

  return where;
}

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const options: RegenerateOptions = {
    sports: searchParams.get("sports")?.split(","),
    filter: (searchParams.get("filter") as "all" | "pending" | "validated") || "pending",
    limit: parseInt(searchParams.get("limit") || "100", 10),
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
    gameIds: searchParams.get("gameIds")?.split(","),
  };

  try {
    const where = await buildQuery(options);
    
    const [total, predictions] = await Promise.all([
      prisma.prediction.count({ where }),
      prisma.prediction.findMany({
        where,
        take: Math.min(options.limit || 100, 20), // Preview only shows 20
        orderBy: { date: "asc" },
        select: {
          id: true,
          gameId: true,
          homeTeam: true,
          awayTeam: true,
          sport: true,
          date: true,
          validated: true,
        },
      }),
    ]);

    // Group by sport
    const bySport = await prisma.prediction.groupBy({
      by: ["sport"],
      where,
      _count: true,
    });

    return NextResponse.json({
      preview: true,
      total,
      limit: options.limit,
      willRegenerate: Math.min(total, options.limit || 100),
      bySport: bySport.reduce(
        (acc, row) => ({ ...acc, [row.sport ?? "unknown"]: row._count }),
        {} as Record<string, number>
      ),
      samplePredictions: predictions.map(p => ({
        id: p.id,
        gameId: p.gameId,
        matchup: `${p.awayTeam} @ ${p.homeTeam}`,
        sport: p.sport,
        date: p.date.toISOString(),
        validated: p.validated,
      })),
      hint: "POST to this endpoint with the same parameters to regenerate",
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

  let options: RegenerateOptions = {
    filter: "pending",
    limit: 100,
  };
  
  try {
    const body = await request.json();
    options = { ...options, ...body };
  } catch {
    // Use defaults
  }

  console.log("\n🔄 Starting prediction regeneration...\n");
  console.log("Options:", JSON.stringify(options, null, 2));

  try {
    const where = await buildQuery(options);
    
    const predictions = await prisma.prediction.findMany({
      where,
      take: options.limit,
      orderBy: { date: "asc" },
      select: {
        id: true,
        gameId: true,
        homeTeam: true,
        awayTeam: true,
        sport: true,
        date: true,
        predictedScore: true,
        predictedSpread: true,
        predictedTotal: true,
        winProbability: true,
        confidence: true,
      },
    });

    console.log(`Found ${predictions.length} predictions to regenerate`);

    // Fetch fresh game data from Odds API for each sport
    const gameCache = new Map<string, OddsGame>();
    const uniqueSports = [...new Set(predictions.map(p => p.sport).filter(Boolean))];
    
    for (const sport of uniqueSports) {
      try {
        const games = await getUpcomingGames(sport!, "us", "h2h,spreads,totals");
        for (const game of games) {
          gameCache.set(game.id, game);
        }
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.warn(`Failed to fetch games for ${sport}:`, err);
      }
    }

    let regenerated = 0;
    let skipped = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (const pred of predictions) {
      const game = gameCache.get(pred.gameId);
      
      if (!game) {
        // Game not in API anymore - skip
        skipped++;
        console.log(`  ⏭️ ${pred.awayTeam} @ ${pred.homeTeam} (game not found in API)`);
        continue;
      }

      try {
        // Capture old values for history
        const previousValues: PredictionSnapshot = {
          predictedScore: pred.predictedScore as { home: number; away: number },
          predictedSpread: pred.predictedSpread,
          predictedTotal: pred.predictedTotal ?? undefined,
          winProbability: pred.winProbability as { home: number; away: number },
          confidence: pred.confidence,
        };

        // Delete the old prediction
        await prisma.prediction.delete({ where: { id: pred.id } });

        // Generate new prediction
        const result = await generatePredictionForGame(game);
        
        if (result.success && result.predictionId) {
          regenerated++;
          console.log(`  ✅ ${pred.awayTeam} @ ${pred.homeTeam}`);

          // Get new values for history logging
          const newPrediction = await prisma.prediction.findUnique({
            where: { id: result.predictionId },
            select: {
              predictedScore: true,
              predictedSpread: true,
              predictedTotal: true,
              winProbability: true,
              confidence: true,
            },
          });

          if (newPrediction) {
            const newValues: PredictionSnapshot = {
              predictedScore: newPrediction.predictedScore as { home: number; away: number },
              predictedSpread: newPrediction.predictedSpread,
              predictedTotal: newPrediction.predictedTotal ?? undefined,
              winProbability: newPrediction.winProbability as { home: number; away: number },
              confidence: newPrediction.confidence,
            };

            await logPredictionRegenerated(
              result.predictionId,
              pred.gameId,
              previousValues,
              newValues,
              "Manual regeneration from admin",
              "admin"
            );
          }

          // Update tracked game if exists
          await prisma.trackedGame.updateMany({
            where: { externalId: pred.gameId },
            data: {
              predictionId: result.predictionId,
              predictedAt: new Date(),
              status: "predicted",
            },
          });
        } else if (result.skipped) {
          skipped++;
          console.log(`  ⏭️ ${pred.awayTeam} @ ${pred.homeTeam} (${result.skipReason})`);
        } else {
          errors++;
          errorMessages.push(`${pred.awayTeam} @ ${pred.homeTeam}: ${result.error}`);
          console.log(`  ❌ ${pred.awayTeam} @ ${pred.homeTeam}: ${result.error}`);
        }
      } catch (err) {
        errors++;
        errorMessages.push(`${pred.awayTeam} @ ${pred.homeTeam}: ${err instanceof Error ? err.message : String(err)}`);
      }

      await new Promise(r => setTimeout(r, 100));
    }

    const duration = Date.now() - startTime;

    await logJobExecution({
      jobName: "regenerate-predictions",
      status: errors === 0 ? "success" : "failed",
      startedAt: new Date(startTime),
      completedAt: new Date(),
      metadata: {
        options,
        regenerated,
        skipped,
        errors,
      },
    });

    console.log(`\n✅ Regeneration complete: ${regenerated} regenerated, ${skipped} skipped, ${errors} errors in ${duration}ms\n`);

    return NextResponse.json({
      success: true,
      regenerated,
      skipped,
      errors,
      duration,
      errorMessages: errorMessages.slice(0, 10),
    });
  } catch (error) {
    console.error("❌ Regeneration failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
