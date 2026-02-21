/**
 * Prediction Generator Service
 * 
 * Generates predictions for individual games using the unified sports API.
 * This is the single source of truth for prediction generation.
 */

import { OddsGame } from "@/types";
import { getSportFromGame } from "./sports/sport-detection";
import {
  getTeamSeasonStats,
  findTeamByName,
} from "./sports/unified-sports-api";
import { calculateTeamAnalytics, predictMatchup } from "./advanced-analytics";
import { trackPrediction } from "./prediction-tracker";
import { loadRecalibrationFromDb } from "./prediction-feedback-batch";

export interface PredictionGenerationResult {
  success: boolean;
  predictionId?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

// Cache for recalibration params loading
let recalibrationLoaded = false;

/**
 * Generate a prediction for a single game
 */
export async function generatePredictionForGame(
  game: OddsGame
): Promise<PredictionGenerationResult> {
  try {
    // Ensure recalibration params are loaded (once per process)
    if (!recalibrationLoaded) {
      await loadRecalibrationFromDb();
      recalibrationLoaded = true;
    }

    const sport = getSportFromGame(game);

    // Find teams using unified API
    const [awayTeam, homeTeam] = await Promise.all([
      findTeamByName(sport, game.away_team),
      findTeamByName(sport, game.home_team),
    ]);

    if (!awayTeam || !homeTeam) {
      return {
        success: false,
        skipped: true,
        skipReason: `Team not found: ${!awayTeam ? game.away_team : game.home_team}`,
      };
    }

    // Fetch team stats using unified API
    const [awayStats, homeStats] = await Promise.all([
      getTeamSeasonStats(sport, game.away_team),
      getTeamSeasonStats(sport, game.home_team),
    ]);

    if (!awayStats || !homeStats) {
      return {
        success: false,
        skipped: true,
        skipReason: `Stats not available for: ${!awayStats ? game.away_team : game.home_team}`,
      };
    }

    // Calculate analytics
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

    // Generate prediction
    const prediction = predictMatchup(
      awayAnalytics,
      homeAnalytics,
      awayStats,
      homeStats,
      sport
    );

    // Extract odds snapshot for tracking
    const oddsSnapshot = extractOddsFromGame(game);

    // Track prediction in database
    const predictionId = await trackPrediction(
      game.id,
      game.commence_time,
      game.home_team,
      game.away_team,
      prediction,
      {
        sport: game.sport_key,
        keyFactors: prediction.keyFactors?.length ? prediction.keyFactors : undefined,
        valueBets: prediction.valueBets?.length ? prediction.valueBets : undefined,
        oddsSnapshot,
        predictionTrace: prediction.trace ?? undefined,
      }
    );

    return {
      success: true,
      predictionId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract odds snapshot from game data
 */
function extractOddsFromGame(game: OddsGame): Record<string, unknown> | null {
  if (!game.bookmakers?.length) return null;

  const bookmaker = game.bookmakers[0];
  const snapshot: Record<string, unknown> = {};

  for (const market of bookmaker.markets || []) {
    if (market.key === "spreads" && market.outcomes?.length >= 2) {
      const homeOutcome = market.outcomes.find((o) => o.name === game.home_team);
      if (homeOutcome?.point != null) {
        snapshot.spread = homeOutcome.point;
      }
    }
    if (market.key === "totals" && market.outcomes?.length >= 1) {
      const overOutcome = market.outcomes.find((o) => o.name === "Over");
      if (overOutcome?.point != null) {
        snapshot.total = overOutcome.point;
      }
    }
    if (market.key === "h2h" && market.outcomes?.length >= 2) {
      const homeOutcome = market.outcomes.find((o) => o.name === game.home_team);
      const awayOutcome = market.outcomes.find((o) => o.name === game.away_team);
      if (homeOutcome?.price != null && awayOutcome?.price != null) {
        snapshot.moneyline = {
          home: homeOutcome.price,
          away: awayOutcome.price,
        };
      }
    }
  }

  return Object.keys(snapshot).length > 0 ? snapshot : null;
}

/**
 * Generate predictions for multiple games in batch
 */
export async function generatePredictionsForGames(
  games: OddsGame[]
): Promise<{
  success: number;
  skipped: number;
  errors: number;
  results: PredictionGenerationResult[];
}> {
  // Ensure recalibration params are loaded once
  if (!recalibrationLoaded) {
    await loadRecalibrationFromDb();
    recalibrationLoaded = true;
  }

  const results: PredictionGenerationResult[] = [];
  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (const game of games) {
    const result = await generatePredictionForGame(game);
    results.push(result);

    if (result.success) {
      success++;
    } else if (result.skipped) {
      skipped++;
    } else {
      errors++;
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 100));
  }

  return { success, skipped, errors, results };
}
