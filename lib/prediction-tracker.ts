/**
 * Prediction Tracker
 *
 * Tracks all predictions with their actual outcomes for validation and feedback.
 * Persists: score, spread, total, win probability, key factors, value bets,
 * favorable bets, and odds snapshot so the feedback loop can evaluate accuracy.
 */

import { MatchupPrediction, PredictionTrace } from "./advanced-analytics";
import type { Prisma } from "@/generated/prisma-client/client";
import { prisma } from "./prisma";
import { logPredictionCreated, logPredictionValidated, type PredictionSnapshot } from "./prediction-history";

/** Serializable favorable-bet summary for storage (feedback loop). */
export interface StoredFavorableBet {
  type: "moneyline" | "spread" | "total";
  team?: "away" | "home";
  recommendation: string;
  bookmaker: string;
  edge: number;
  confidence: number;
  valueRating: string;
  ourProbability: number;
  impliedProbability: number;
}

/** Minimal odds snapshot at prediction time for feedback. */
export interface OddsSnapshot {
  spread?: number;
  total?: number;
  moneyline?: { away?: number; home?: number };
}

export interface TrackPredictionOptions {
  sport?: string;
  keyFactors?: string[];
  valueBets?: MatchupPrediction["valueBets"];
  favorableBets?: StoredFavorableBet[] | null;
  oddsSnapshot?: OddsSnapshot | null;
  predictionTrace?: PredictionTrace | null;
}

export interface TrackedPrediction {
  id: string;
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  sport?: string | null;
  predictedAt: number;
  prediction: MatchupPrediction;
  favorableBets?: StoredFavorableBet[] | null;
  actualOutcome?: {
    homeScore: number;
    awayScore: number;
    winner: "home" | "away";
    recordedAt: number;
  };
  validated: boolean;
  // Market lines for ATS/O-U calculations
  closingSpread?: number | null;
  closingTotal?: number | null;
  predictedTotal?: number | null;
}

/**
 * Track a prediction (before game is played). Stores all aspects for the feedback loop.
 * Deduplication: if an unvalidated prediction already exists for this gameId, skips insert
 * and returns the existing id (avoids duplicates from cron + client both tracking).
 */
export async function trackPrediction(
  gameId: string,
  date: string,
  homeTeam: string,
  awayTeam: string,
  prediction: MatchupPrediction,
  options?: TrackPredictionOptions
): Promise<string> {
  try {
    // Deduplication: one prediction per game (cron + client can both call)
    const existing = await prisma.prediction.findFirst({
      where: { gameId, validated: false },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return existing.id;

    const gameDate = new Date(date);
    const predictedTotal =
      prediction.predictedScore.home + prediction.predictedScore.away;

    const dbPrediction = await prisma.prediction.create({
      data: {
        gameId,
        date: gameDate,
        homeTeam,
        awayTeam,
        sport: options?.sport ?? null,
        predictedScore: {
          home: prediction.predictedScore.home,
          away: prediction.predictedScore.away,
        },
        predictedSpread: prediction.predictedSpread,
        alternateSpread: prediction.alternateSpread 
          ? (prediction.alternateSpread as unknown as Prisma.InputJsonValue)
          : undefined,
        predictedTotal,
        winProbability: {
          home: prediction.winProbability.home,
          away: prediction.winProbability.away,
        },
        confidence: prediction.confidence,
        keyFactors: (options?.keyFactors ?? undefined) as Prisma.InputJsonValue | undefined,
        valueBets: (options?.valueBets ?? undefined) as Prisma.InputJsonValue | undefined,
        favorableBets: (options?.favorableBets ?? undefined) as Prisma.InputJsonValue | undefined,
        oddsSnapshot: (options?.oddsSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
        predictionTrace: (options?.predictionTrace ?? undefined) as Prisma.InputJsonValue | undefined,
        validated: false,
      },
    });

    // Log to prediction history
    await logPredictionCreated(dbPrediction.id, gameId, {
      predictedScore: prediction.predictedScore,
      predictedSpread: prediction.predictedSpread,
      predictedTotal,
      winProbability: prediction.winProbability,
      confidence: prediction.confidence,
      keyFactors: options?.keyFactors,
    }, "system");

    return dbPrediction.id;
  } catch (error) {
    console.error("Error tracking prediction to database:", error);
    return `${gameId}-${Date.now()}`;
  }
}

/**
 * Enrich an existing (unvalidated) prediction with favorable bets and odds snapshot.
 * Call when client has finished computing favorableBetAnalysis.
 */
export async function enrichPrediction(
  gameId: string,
  favorableBets: StoredFavorableBet[] | null,
  oddsSnapshot: OddsSnapshot | null
): Promise<boolean> {
  try {
    const prediction = await prisma.prediction.findFirst({
      where: { gameId, validated: false },
      orderBy: { createdAt: "desc" },
    });
    if (!prediction) return false;

    await prisma.prediction.update({
      where: { id: prediction.id },
      data: {
        favorableBets: (favorableBets ?? undefined) as Prisma.InputJsonValue | undefined,
        oddsSnapshot: (oddsSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    return true;
  } catch (error) {
    console.error("Error enriching prediction:", error);
    return false;
  }
}

/**
 * Record actual outcome for a tracked prediction - updates database.
 * Also calculates CLV (Closing Line Value) if odds history is available.
 */
export async function recordOutcome(
  predictionId: string,
  homeScore: number,
  awayScore: number
): Promise<boolean> {
  try {
    const actualWinner = homeScore > awayScore ? 'home' : 'away';
    const actualTotal = homeScore + awayScore;
    
    // Fetch the prediction to get gameId and predicted values
    const prediction = await prisma.prediction.findUnique({
      where: { id: predictionId },
      select: { 
        gameId: true, 
        predictedSpread: true, 
        predictedTotal: true,
        predictedScore: true,
        winProbability: true,
        confidence: true,
        validated: true,
      },
    });
    
    if (!prediction) {
      console.error("Prediction not found:", predictionId);
      return false;
    }

    // Try to get opening and closing lines for CLV calculation
    let openingSpread: number | null = null;
    let closingSpread: number | null = null;
    let openingTotal: number | null = null;
    let closingTotal: number | null = null;
    let clvSpread: number | null = null;
    let clvTotal: number | null = null;
    let lineMovement: number | null = null;

    try {
      // Import dynamically to avoid circular dependency
      const { getOpeningLine, getClosingLine } = await import("./odds-history");
      
      const [opening, closing] = await Promise.all([
        getOpeningLine(prediction.gameId),
        getClosingLine(prediction.gameId),
      ]);

      if (opening) {
        openingSpread = opening.spread;
        openingTotal = opening.total;
      }

      if (closing) {
        closingSpread = closing.spread;
        closingTotal = closing.total;
      }

      // Calculate CLV (Closing Line Value)
      // Odds API uses negative spread for favorite (American convention). Our model uses positive = home favored.
      // Normalize: predictedInOddsFormat = -predictedSpread (convert to Odds API convention).
      // Positive CLV = we got a better line than the close. E.g. we predicted home -5, close home -7: we got -5 (better), CLV = (-5) - (-7) = +2.
      if (closingSpread !== null && prediction.predictedSpread !== null) {
        const predictedInOddsFormat = -prediction.predictedSpread;
        clvSpread = predictedInOddsFormat - closingSpread;
      }

      if (closingTotal !== null && prediction.predictedTotal !== null) {
        clvTotal = closingTotal - prediction.predictedTotal;
      }

      // Line movement = how much the line moved from open to close
      if (openingSpread !== null && closingSpread !== null) {
        lineMovement = closingSpread - openingSpread;
      }
    } catch (err) {
      // CLV calculation failed, continue without it
      console.warn("CLV calculation skipped:", err instanceof Error ? err.message : String(err));
    }

    await prisma.prediction.update({
      where: { id: predictionId },
      data: {
        actualHomeScore: homeScore,
        actualAwayScore: awayScore,
        actualWinner,
        actualTotal,
        validated: true,
        validatedAt: new Date(),
        // CLV fields
        openingSpread,
        closingSpread,
        openingTotal,
        closingTotal,
        clvSpread,
        clvTotal,
        lineMovement,
      },
    });

    // Log validation to history
    const prevSnapshot: PredictionSnapshot = {
      predictedScore: prediction.predictedScore as { home: number; away: number },
      predictedSpread: prediction.predictedSpread,
      predictedTotal: prediction.predictedTotal,
      winProbability: prediction.winProbability as { home: number; away: number },
      confidence: prediction.confidence,
      validated: prediction.validated,
    };

    const newSnapshot: PredictionSnapshot = {
      ...prevSnapshot,
      actualHomeScore: homeScore,
      actualAwayScore: awayScore,
      actualWinner,
      validated: true,
    };

    await logPredictionValidated(predictionId, prediction.gameId, prevSnapshot, newSnapshot, "system");
    
    return true;
  } catch (error) {
    console.error("Error recording outcome:", error);
    return false;
  }
}

/**
 * Record outcome by game ID (finds most recent unvalidated prediction)
 * Note: Predictions use Odds API game IDs (UUID), while SportsData/ESPN use numeric GameIDs.
 * Use recordOutcomeByMatchup when matching completed games from ESPN/SportsData to predictions.
 */
export async function recordOutcomeByGameId(
  gameId: string,
  homeScore: number,
  awayScore: number
): Promise<boolean> {
  try {
    // Find most recent unvalidated prediction for this game
    const prediction = await prisma.prediction.findFirst({
      where: {
        gameId,
        validated: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    if (!prediction) {
      return false;
    }
    
    return await recordOutcome(prediction.id, homeScore, awayScore);
  } catch (error) {
    console.error("Error recording outcome by game ID:", error);
    return false;
  }
}

/**
 * Normalize team name for fuzzy matching between Odds API and ESPN/SportsData.
 * Odds API: "Wisconsin Badgers", "Michigan State Spartans"
 * ESPN: "Wisconsin", "Michigan State"
 */
function normalizeTeamForMatch(name: string): string {
  return (name || "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Teams that share a first word and need disambiguation.
 * Each entry maps a "base" name to identifiers for each variant. Names with different
 * suffixes (e.g. "(OH)" vs none) are different teams and must not match.
 */
const TEAM_NAME_DISAMBIGUATION: Record<string, { ohio: string[]; other: string[] }> = {
  miami: {
    ohio: ["(oh)", "ohio", "redhawks"],
    other: ["hurricanes", "florida"],
  },
};

function resolveConflictVariant(name: string, variants: { ohio: string[]; other: string[] }): "ohio" | "other" | null {
  for (const suffix of variants.ohio) {
    if (name.includes(suffix)) return "ohio";
  }
  for (const suffix of variants.other) {
    if (name.includes(suffix)) return "other";
  }
  return null; // Unqualified (e.g. "miami" alone) - ambiguous
}

/**
 * Check if two team names refer to the same team (handles Odds API vs ESPN naming).
 * Uses disambiguation config for ambiguous names like Miami vs Miami (OH).
 */
function teamsMatch(predName: string, resultName: string): boolean {
  const p = normalizeTeamForMatch(predName);
  const r = normalizeTeamForMatch(resultName);
  if (!p || !r) return false;
  if (p === r) return true;

  const pFirst = p.split(" ")[0];
  const rFirst = r.split(" ")[0];

  // Disambiguation: Miami vs Miami (OH) - require same variant when both qualified
  const variants = pFirst && TEAM_NAME_DISAMBIGUATION[pFirst];
  if (variants && rFirst === pFirst) {
    const pVariant = resolveConflictVariant(p, variants);
    const rVariant = resolveConflictVariant(r, variants);
    if (pVariant != null && rVariant != null && pVariant !== rVariant) return false;
    // If one is qualified as Ohio and the other is unqualified, don't match - "miami" alone likely means Florida
    if (pVariant === "ohio" && rVariant === null) return false;
    if (rVariant === "ohio" && pVariant === null) return false;
  }

  // One contains the other (e.g. "Michigan State" in "Michigan State Spartans")
  if (p.includes(r) || r.includes(p)) return true;
  // "Wisconsin Badgers" vs "Wisconsin" - first word matches (no conflict)
  if (pFirst && rFirst && pFirst === rFirst) return true;
  // School name match: "North Carolina" vs "North Carolina Tar Heels"
  const pWords = p.split(" ");
  const rWords = r.split(" ");
  const minLen = Math.min(pWords.length, rWords.length);
  if (minLen >= 2) {
    const pSchool = pWords.slice(0, 2).join(" ");
    const rSchool = rWords.slice(0, 2).join(" ");
    if (pSchool === rSchool) return true;
  }
  return false;
}

/**
 * Record outcome by matchup (homeTeam, awayTeam, date).
 * Use this when matching completed games from ESPN/SportsData to predictions
 * that were tracked with Odds API game IDs (different ID schemes).
 *
 * @param homeTeam - Home team name from completed game (e.g. ESPN displayName)
 * @param awayTeam - Away team name from completed game
 * @param gameDate - Game date (ISO string or Date) - matched by calendar day
 * @param homeScore - Actual home score
 * @param awayScore - Actual away score
 */
export async function recordOutcomeByMatchup(
  homeTeam: string,
  awayTeam: string,
  gameDate: string | Date,
  homeScore: number,
  awayScore: number
): Promise<boolean> {
  try {
    const targetDate = new Date(gameDate);
    const targetDayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const targetDayEnd = new Date(targetDayStart);
    targetDayEnd.setDate(targetDayEnd.getDate() + 1);

    // Find unvalidated predictions within a 3-day window (handles timezone/date boundary issues)
    const windowStart = new Date(targetDayStart);
    windowStart.setDate(windowStart.getDate() - 1);
    const windowEnd = new Date(targetDayEnd);
    windowEnd.setDate(windowEnd.getDate() + 1);

    const candidates = await prisma.prediction.findMany({
      where: {
        validated: false,
        date: {
          gte: windowStart,
          lt: windowEnd,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const prediction of candidates) {
      const predDate = new Date(prediction.date);
      const sameDay =
        predDate.getFullYear() === targetDate.getFullYear() &&
        predDate.getMonth() === targetDate.getMonth() &&
        predDate.getDate() === targetDate.getDate();

      if (
        sameDay &&
        teamsMatch(prediction.homeTeam, homeTeam) &&
        teamsMatch(prediction.awayTeam, awayTeam)
      ) {
        return await recordOutcome(prediction.id, homeScore, awayScore);
      }
    }

    return false;
  } catch (error) {
    console.error("Error recording outcome by matchup:", error);
    return false;
  }
}

/**
 * Get all validated predictions (for analysis) - from database
 */
export async function getValidatedPredictions(sport?: string): Promise<TrackedPrediction[]> {
  try {
    const where: Record<string, unknown> = {
      validated: true,
      actualHomeScore: { not: null },
      actualAwayScore: { not: null },
    };
    
    if (sport) {
      where.sport = sport;
    }
    
    const dbPredictions = await prisma.prediction.findMany({
      where,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return dbPredictions.map(convertDbToTracked);
  } catch (error) {
    console.error("Error getting validated predictions:", error);
    return [];
  }
}

/**
 * Get predictions for a specific game - from database
 */
export async function getPredictionsForGame(gameId: string): Promise<TrackedPrediction[]> {
  try {
    const dbPredictions = await prisma.prediction.findMany({
      where: { gameId },
      orderBy: { createdAt: 'desc' },
    });
    
    return dbPredictions.map(convertDbToTracked);
  } catch (error) {
    console.error("Error getting predictions for game:", error);
    return [];
  }
}

/**
 * Get recent predictions (last N predictions) - from database
 */
export async function getRecentPredictions(limit: number = 100): Promise<TrackedPrediction[]> {
  try {
    const dbPredictions = await prisma.prediction.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
    
    return dbPredictions.map(convertDbToTracked);
  } catch (error) {
    console.error("Error getting recent predictions:", error);
    return [];
  }
}

/**
 * Get unvalidated predictions (predictions waiting for outcomes) - from database
 */
export async function getUnvalidatedPredictions(): Promise<TrackedPrediction[]> {
  try {
    const dbPredictions = await prisma.prediction.findMany({
      where: { validated: false },
      orderBy: { createdAt: 'asc' },
    });
    
    return dbPredictions.map(convertDbToTracked);
  } catch (error) {
    console.error("Error getting unvalidated predictions:", error);
    return [];
  }
}

/**
 * Clear old validated predictions (keep only recent ones) - from database
 */
export async function clearOldPredictions(daysToKeep: number = 30): Promise<number> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    
    const result = await prisma.prediction.deleteMany({
      where: {
        validated: true,
        createdAt: {
          lt: cutoff,
        },
      },
    });
    
    return result.count;
  } catch (error) {
    console.error("Error clearing old predictions:", error);
    return 0;
  }
}

/**
 * Get statistics about tracked predictions - from database
 */
export async function getTrackingStats(): Promise<{
  total: number;
  validated: number;
  unvalidated: number;
  oldestPrediction: number | null;
  newestPrediction: number | null;
}> {
  try {
    const [total, validated, oldest, newest] = await Promise.all([
      prisma.prediction.count(),
      prisma.prediction.count({ where: { validated: true } }),
      prisma.prediction.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      prisma.prediction.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    ]);
    
    return {
      total,
      validated,
      unvalidated: total - validated,
      oldestPrediction: oldest?.createdAt.getTime() || null,
      newestPrediction: newest?.createdAt.getTime() || null,
    };
  } catch (error) {
    console.error("Error getting tracking stats:", error);
    return {
      total: 0,
      validated: 0,
      unvalidated: 0,
      oldestPrediction: null,
      newestPrediction: null,
    };
  }
}

/**
 * Convert database prediction to TrackedPrediction format
 */
function convertDbToTracked(dbPrediction: any): TrackedPrediction {
  return {
    id: dbPrediction.id,
    gameId: dbPrediction.gameId,
    date: dbPrediction.date.toISOString(),
    homeTeam: dbPrediction.homeTeam,
    awayTeam: dbPrediction.awayTeam,
    sport: dbPrediction.sport ?? undefined,
    predictedAt: dbPrediction.createdAt.getTime(),
    prediction: {
      predictedScore: {
        home: (dbPrediction.predictedScore as any).home,
        away: (dbPrediction.predictedScore as any).away,
      },
      predictedSpread: dbPrediction.predictedSpread,
      winProbability: {
        home: (dbPrediction.winProbability as any).home,
        away: (dbPrediction.winProbability as any).away,
      },
      confidence: dbPrediction.confidence,
      keyFactors: Array.isArray(dbPrediction.keyFactors) ? dbPrediction.keyFactors : [],
      valueBets: Array.isArray(dbPrediction.valueBets) ? dbPrediction.valueBets : [],
    },
    favorableBets: Array.isArray(dbPrediction.favorableBets) ? dbPrediction.favorableBets : undefined,
    actualOutcome: dbPrediction.actualHomeScore !== null ? {
      homeScore: dbPrediction.actualHomeScore!,
      awayScore: dbPrediction.actualAwayScore!,
      winner: dbPrediction.actualWinner as 'home' | 'away',
      recordedAt: dbPrediction.validatedAt?.getTime() || Date.now(),
    } : undefined,
    validated: dbPrediction.validated,
    // Market lines for ATS/O-U calculations
    closingSpread: dbPrediction.closingSpread ?? null,
    closingTotal: dbPrediction.closingTotal ?? null,
    predictedTotal: dbPrediction.predictedTotal ?? null,
  };
}

/**
 * Clear all predictions (useful for testing)
 */
export async function clearAllPredictions(): Promise<void> {
  try {
    await prisma.prediction.deleteMany();
  } catch (error) {
    console.error("Error clearing all predictions:", error);
  }
}

