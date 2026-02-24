/**
 * Prediction History Service
 * 
 * Tracks all changes to predictions for auditing and analysis.
 * Every create, regenerate, update, and validation is logged.
 */

import { prisma } from "./prisma";

export type ChangeType = "created" | "regenerated" | "validated" | "updated";
export type TriggeredBy = "cron" | "admin" | "system" | "user";

export interface PredictionSnapshot {
  predictedScore?: { home: number; away: number };
  predictedSpread?: number;
  predictedTotal?: number;
  winProbability?: { home: number; away: number };
  confidence?: number;
  alternateSpread?: unknown;
  keyFactors?: string[];
  actualHomeScore?: number | null;
  actualAwayScore?: number | null;
  actualWinner?: string | null;
  validated?: boolean;
}

export interface LogHistoryOptions {
  predictionId: string;
  gameId: string;
  changeType: ChangeType;
  previousValues?: PredictionSnapshot | null;
  newValues: PredictionSnapshot;
  reason?: string;
  triggeredBy?: TriggeredBy;
}

/**
 * Log a change to a prediction's history.
 */
export async function logPredictionHistory(options: LogHistoryOptions): Promise<string> {
  try {
    const record = await prisma.predictionHistory.create({
      data: {
        predictionId: options.predictionId,
        gameId: options.gameId,
        changeType: options.changeType,
        previousValues: options.previousValues != null
          ? (JSON.parse(JSON.stringify(options.previousValues)) as object)
          : undefined,
        newValues: JSON.parse(JSON.stringify(options.newValues)) as object,
        reason: options.reason ?? null,
        triggeredBy: options.triggeredBy ?? null,
      },
    });
    return record.id;
  } catch (error) {
    console.error("Failed to log prediction history:", error);
    return "";
  }
}

/**
 * Log prediction creation.
 */
export async function logPredictionCreated(
  predictionId: string,
  gameId: string,
  values: PredictionSnapshot,
  triggeredBy: TriggeredBy = "system"
): Promise<void> {
  await logPredictionHistory({
    predictionId,
    gameId,
    changeType: "created",
    newValues: values,
    triggeredBy,
  });
}

/**
 * Log prediction regeneration.
 */
export async function logPredictionRegenerated(
  predictionId: string,
  gameId: string,
  previousValues: PredictionSnapshot,
  newValues: PredictionSnapshot,
  reason?: string,
  triggeredBy: TriggeredBy = "admin"
): Promise<void> {
  await logPredictionHistory({
    predictionId,
    gameId,
    changeType: "regenerated",
    previousValues,
    newValues,
    reason,
    triggeredBy,
  });
}

/**
 * Log prediction validation (outcome recorded).
 */
export async function logPredictionValidated(
  predictionId: string,
  gameId: string,
  previousValues: PredictionSnapshot,
  newValues: PredictionSnapshot,
  triggeredBy: TriggeredBy = "system"
): Promise<void> {
  await logPredictionHistory({
    predictionId,
    gameId,
    changeType: "validated",
    previousValues,
    newValues,
    triggeredBy,
  });
}

/**
 * Get history for a specific prediction.
 */
export async function getPredictionHistory(predictionId: string): Promise<Array<{
  id: string;
  changeType: string;
  previousValues: unknown;
  newValues: unknown;
  reason: string | null;
  triggeredBy: string | null;
  createdAt: Date;
}>> {
  return prisma.predictionHistory.findMany({
    where: { predictionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      changeType: true,
      previousValues: true,
      newValues: true,
      reason: true,
      triggeredBy: true,
      createdAt: true,
    },
  });
}

/**
 * Get history for a game (across all predictions).
 */
export async function getGameHistory(gameId: string): Promise<Array<{
  id: string;
  predictionId: string;
  changeType: string;
  previousValues: unknown;
  newValues: unknown;
  reason: string | null;
  triggeredBy: string | null;
  createdAt: Date;
}>> {
  return prisma.predictionHistory.findMany({
    where: { gameId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      predictionId: true,
      changeType: true,
      previousValues: true,
      newValues: true,
      reason: true,
      triggeredBy: true,
      createdAt: true,
    },
  });
}

/**
 * Get recent history entries (for admin dashboard).
 */
export async function getRecentHistory(
  limit: number = 50,
  changeType?: ChangeType
): Promise<Array<{
  id: string;
  predictionId: string;
  gameId: string;
  changeType: string;
  reason: string | null;
  triggeredBy: string | null;
  createdAt: Date;
}>> {
  return prisma.predictionHistory.findMany({
    where: changeType ? { changeType } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      predictionId: true,
      gameId: true,
      changeType: true,
      reason: true,
      triggeredBy: true,
      createdAt: true,
    },
  });
}

/**
 * Get history statistics.
 */
export async function getHistoryStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  byTrigger: Record<string, number>;
  last24h: number;
  last7d: number;
}> {
  const [total, byType, byTrigger, last24h, last7d] = await Promise.all([
    prisma.predictionHistory.count(),
    prisma.predictionHistory.groupBy({
      by: ["changeType"],
      _count: true,
    }),
    prisma.predictionHistory.groupBy({
      by: ["triggeredBy"],
      _count: true,
    }),
    prisma.predictionHistory.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.predictionHistory.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const typeMap: Record<string, number> = {};
  for (const row of byType) {
    typeMap[row.changeType] = row._count;
  }

  const triggerMap: Record<string, number> = {};
  for (const row of byTrigger) {
    const key = row.triggeredBy ?? "unknown";
    triggerMap[key] = row._count;
  }

  return {
    total,
    byType: typeMap,
    byTrigger: triggerMap,
    last24h,
    last7d,
  };
}

/**
 * Search predictions by matchup (for autocomplete).
 */
export async function searchPredictions(
  query: string,
  options: {
    sport?: string;
    limit?: number;
    validated?: boolean;
  } = {}
): Promise<Array<{
  id: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string | null;
  date: Date;
  validated: boolean;
  confidence: number;
}>> {
  const { sport, limit = 20, validated } = options;
  
  const where: Record<string, unknown> = {};
  
  if (sport) {
    where.sport = sport;
  }
  
  if (validated !== undefined) {
    where.validated = validated;
  }

  // Search by team names
  if (query) {
    where.OR = [
      { homeTeam: { contains: query, mode: "insensitive" } },
      { awayTeam: { contains: query, mode: "insensitive" } },
      { gameId: { contains: query, mode: "insensitive" } },
    ];
  }

  return prisma.prediction.findMany({
    where,
    orderBy: { date: "desc" },
    take: limit,
    select: {
      id: true,
      gameId: true,
      homeTeam: true,
      awayTeam: true,
      sport: true,
      date: true,
      validated: true,
      confidence: true,
    },
  });
}
