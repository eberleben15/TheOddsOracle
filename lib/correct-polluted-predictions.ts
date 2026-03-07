/**
 * Correct Polluted Predictions
 *
 * Polluted predictions were created after the game started, using closing-line
 * odds. This module fetches historical opening/closing lines from The Odds API
 * and updates the Prediction with corrected odds and CLV.
 */

import type { Prisma } from "@/generated/prisma-client/client";
import { prisma } from "./prisma";
import { fetchHistoricalOddsForGame } from "./odds-api";
import { parseOdds, buildBestOddsSnapshot } from "./odds-utils";

const RATE_LIMIT_MS = 200;

export interface PollutedRecord {
  trackedGameId: string;
  externalId: string;
  predictionId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: Date;
  predictedAt: Date;
}

export interface CorrectionResult {
  predictionId: string;
  success: boolean;
  error?: string;
}

/**
 * Find polluted predictions (predicted after game started).
 * @param sport - Optional sport filter (e.g. "basketball_ncaab")
 */
export async function findPollutedPredictions(sport?: string): Promise<PollutedRecord[]> {
  const tracked = await prisma.trackedGame.findMany({
    where: {
      predictedAt: { not: null },
      predictionId: { not: null },
      ...(sport ? { sport } : {}),
    },
  });

  return tracked
    .filter((tg) => {
      const predictedAt = tg.predictedAt;
      const commenceTime = tg.commenceTime;
      if (!predictedAt || !commenceTime) return false;
      return predictedAt > commenceTime;
    })
    .map((tg) => ({
      trackedGameId: tg.id,
      externalId: tg.externalId,
      predictionId: tg.predictionId!,
      sport: tg.sport,
      homeTeam: tg.homeTeam,
      awayTeam: tg.awayTeam,
      commenceTime: tg.commenceTime,
      predictedAt: tg.predictedAt!,
    }));
}

/**
 * Correct a single polluted prediction using historical odds.
 */
export async function correctPollutedPrediction(
  record: PollutedRecord,
  dryRun: boolean = false
): Promise<CorrectionResult> {
  try {
    const { predictionId, externalId: gameId, sport, commenceTime } = record;

    // Opening: 24-48 hours before game
    const openingDate = new Date(commenceTime.getTime() - 36 * 60 * 60 * 1000);
    // Closing: 30 minutes before game
    const closingDate = new Date(commenceTime.getTime() - 30 * 60 * 1000);

    const [openingGame, closingGame] = await Promise.all([
      fetchHistoricalOddsForGame(sport, gameId, openingDate),
      fetchHistoricalOddsForGame(sport, gameId, closingDate),
    ]);

    if (!openingGame && !closingGame) {
      return {
        predictionId,
        success: false,
        error: "No historical odds found for game",
      };
    }

    const openingSnapshot = openingGame
      ? buildBestOddsSnapshot(parseOdds(openingGame))
      : null;
    const closingSnapshot = closingGame
      ? buildBestOddsSnapshot(parseOdds(closingGame))
      : null;

    const openingSpread = openingSnapshot?.spread ?? null;
    const openingTotal = openingSnapshot?.total ?? null;
    const closingSpread = closingSnapshot?.spread ?? null;
    const closingTotal = closingSnapshot?.total ?? null;

    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
      select: { predictedSpread: true, predictedTotal: true },
    });

    if (!prediction) {
      return { predictionId, success: false, error: "Prediction not found" };
    }

    let clvSpread: number | null = null;
    let clvTotal: number | null = null;
    let lineMovement: number | null = null;

    if (closingSpread !== null && prediction.predictedSpread !== null) {
      const predictedInOddsFormat = -prediction.predictedSpread;
      clvSpread = predictedInOddsFormat - closingSpread;
    }
    if (closingTotal !== null && prediction.predictedTotal !== null) {
      clvTotal = closingTotal - prediction.predictedTotal;
    }
    if (openingSpread !== null && closingSpread !== null) {
      lineMovement = closingSpread - openingSpread;
    }

    const oddsSnapshot = (openingSnapshot ?? closingSnapshot) as Record<
      string,
      unknown
    > | null;

    if (!dryRun) {
      await prisma.prediction.update({
        where: { id: predictionId },
        data: {
          oddsSnapshot: (oddsSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
          openingSpread,
          openingTotal,
          closingSpread,
          closingTotal,
          clvSpread,
          clvTotal,
          lineMovement,
        },
      });
    }

    return { predictionId, success: true };
  } catch (error) {
    return {
      predictionId: record.predictionId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Correct all polluted predictions.
 */
export async function correctAllPollutedPredictions(options: {
  dryRun?: boolean;
  limit?: number;
  sport?: string;
}): Promise<{ corrected: number; failed: number; results: CorrectionResult[] }> {
  const { dryRun = false, limit, sport } = options;

  const polluted = await findPollutedPredictions(sport);
  const toProcess = limit ? polluted.slice(0, limit) : polluted;

  const results: CorrectionResult[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    const result = await correctPollutedPrediction(toProcess[i], dryRun);
    results.push(result);

    if (i < toProcess.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
    }
  }

  const corrected = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { corrected, failed, results };
}
