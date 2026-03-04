/**
 * Cron: Validate Player Prop Predictions
 * 
 * This cron job runs after NBA games complete to:
 * 1. Find pending (unsettled) player prop predictions
 * 2. Fetch box score data for completed games
 * 3. Validate predictions against actual performance
 * 4. Update hit/miss outcomes in the database
 * 
 * Schedule: runs every 2 hours during NBA season
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGameBoxScore } from "@/lib/player-props/espn-player-api";
import { validatePropPredictionsFromBoxScore } from "@/lib/player-props/player-props-db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ValidationResult {
  gameId: string;
  predictionsValidated: number;
  hits: number;
  misses: number;
  errors: string[];
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // Skip auth check in development
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: ValidationResult[] = [];
  let totalValidated = 0;
  let totalHits = 0;
  let totalMisses = 0;
  const errors: string[] = [];

  try {
    // Find all distinct gameIds with pending predictions
    const pendingGameIds = await prisma.playerPropPrediction.findMany({
      where: {
        hit: null,
        recommendation: { not: "pass" },
        // Only look at predictions from the last 3 days
        createdAt: {
          gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      },
      distinct: ["gameId"],
      select: { gameId: true },
    });

    if (pendingGameIds.length === 0) {
      return NextResponse.json({
        message: "No pending predictions to validate",
        duration: Date.now() - startTime,
      });
    }

    console.log(`[validate-player-props] Found ${pendingGameIds.length} games with pending predictions`);

    // Process each game
    for (const { gameId } of pendingGameIds) {
      const gameResult: ValidationResult = {
        gameId,
        predictionsValidated: 0,
        hits: 0,
        misses: 0,
        errors: [],
      };

      try {
        // Try to map the Odds API gameId to an ESPN game ID
        // The Odds API gameId format is typically: {away_team}_{home_team}_{date}
        // For now, we need to fetch box scores using ESPN's format
        
        // Fetch pending predictions for this game to get player info
        const gamePredictions = await prisma.playerPropPrediction.findMany({
          where: { gameId, hit: null },
          include: { player: true },
        });

        if (gamePredictions.length === 0) continue;

        // Resolve ESPN game ID. TrackedGame has externalId (Odds API) but no espnEventId.
        // Try gameId directly; ESPN API expects event ID format. Add espnEventId to
        // TrackedGame for proper Odds API → ESPN mapping when needed.
        const boxScoreStats = await getGameBoxScore(gameId);
        
        if (!boxScoreStats || boxScoreStats.length === 0) {
          // Game might not be finished, or Odds API gameId doesn't map to ESPN event ID
          gameResult.errors.push(`No box score available for game ${gameId} (may need ESPN ID mapping)`);
          results.push(gameResult);
          continue;
        }

        // Validate predictions
        const validated = await validatePropPredictionsFromBoxScore(gameId, boxScoreStats);
        
        gameResult.predictionsValidated = validated.length;
        gameResult.hits = validated.filter((p) => p.hit === true).length;
        gameResult.misses = validated.filter((p) => p.hit === false).length;

        totalValidated += gameResult.predictionsValidated;
        totalHits += gameResult.hits;
        totalMisses += gameResult.misses;

        console.log(
          `[validate-player-props] Game ${gameId}: ${gameResult.predictionsValidated} validated, ` +
          `${gameResult.hits} hits, ${gameResult.misses} misses`
        );

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        gameResult.errors.push(errorMessage);
        errors.push(`Game ${gameId}: ${errorMessage}`);
      }

      results.push(gameResult);
    }

    // Log summary to feedback system if we have results
    if (totalValidated > 0) {
      await logToFeedbackHistory({
        totalValidated,
        totalHits,
        totalMisses,
        hitRate: totalHits / (totalHits + totalMisses),
        gamesProcessed: results.length,
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        gamesProcessed: pendingGameIds.length,
        predictionsValidated: totalValidated,
        hits: totalHits,
        misses: totalMisses,
        hitRate: totalValidated > 0 ? (totalHits / (totalHits + totalMisses) * 100).toFixed(1) + "%" : "N/A",
      },
      results,
      errors: errors.length > 0 ? errors : undefined,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    console.error("[validate-player-props] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to validate player props", 
        message: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

async function logToFeedbackHistory(stats: {
  totalValidated: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  gamesProcessed: number;
}) {
  try {
    // Log to FeedbackHistory for integration with existing feedback system
    await prisma.feedbackHistory.create({
      data: {
        configVersion: 1,
        sport: "basketball_nba_player_props",
        overall: {
          sampleCount: stats.totalValidated,
          wins: stats.totalHits,
          losses: stats.totalMisses,
          winRate: stats.hitRate,
          netUnits: 0, // Player props don't track units yet
          gamesProcessed: stats.gamesProcessed,
          type: "player_props",
        },
        bySport: {
          basketball_nba: {
            sampleCount: stats.totalValidated,
            wins: stats.totalHits,
            losses: stats.totalMisses,
            winRate: stats.hitRate,
          },
        },
        topFeatures: [],
      },
    });
  } catch (error) {
    console.warn("[validate-player-props] Failed to log to feedback history:", error);
  }
}
