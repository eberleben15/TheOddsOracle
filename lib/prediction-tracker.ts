/**
 * Prediction Tracker
 * 
 * Tracks all predictions with their actual outcomes for validation and performance monitoring.
 * Stores predictions in database for persistence and analysis.
 */

import { MatchupPrediction } from "./advanced-analytics";
import { prisma } from "./prisma";

export interface TrackedPrediction {
  id: string; // Unique identifier (e.g., game ID + timestamp)
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  predictedAt: number; // Timestamp
  prediction: MatchupPrediction;
  actualOutcome?: {
    homeScore: number;
    awayScore: number;
    winner: 'home' | 'away';
    recordedAt: number;
  };
  validated: boolean;
}

/**
 * Track a prediction (before game is played) - saves to database
 */
export async function trackPrediction(
  gameId: string,
  date: string,
  homeTeam: string,
  awayTeam: string,
  prediction: MatchupPrediction
): Promise<string> {
  try {
    const gameDate = new Date(date);
    
    const dbPrediction = await prisma.prediction.create({
      data: {
        gameId,
        date: gameDate,
        homeTeam,
        awayTeam,
        predictedScore: {
          home: prediction.predictedScore.home,
          away: prediction.predictedScore.away,
        },
        predictedSpread: prediction.predictedSpread,
        winProbability: {
          home: prediction.winProbability.home,
          away: prediction.winProbability.away,
        },
        confidence: prediction.confidence,
        validated: false,
      },
    });
    
    return dbPrediction.id;
  } catch (error) {
    console.error("Error tracking prediction to database:", error);
    // Fallback: generate ID even if DB save fails
    return `${gameId}-${Date.now()}`;
  }
}

/**
 * Record actual outcome for a tracked prediction - updates database
 */
export async function recordOutcome(
  predictionId: string,
  homeScore: number,
  awayScore: number
): Promise<boolean> {
  try {
    const actualWinner = homeScore > awayScore ? 'home' : 'away';
    
    await prisma.prediction.update({
      where: { id: predictionId },
      data: {
        actualHomeScore: homeScore,
        actualAwayScore: awayScore,
        actualWinner,
        validated: true,
        validatedAt: new Date(),
      },
    });
    
    return true;
  } catch (error) {
    console.error("Error recording outcome:", error);
    return false;
  }
}

/**
 * Record outcome by game ID (finds most recent unvalidated prediction)
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
 * Get all validated predictions (for analysis) - from database
 */
export async function getValidatedPredictions(): Promise<TrackedPrediction[]> {
  try {
    const dbPredictions = await prisma.prediction.findMany({
      where: {
        validated: true,
        actualHomeScore: { not: null },
        actualAwayScore: { not: null },
      },
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
      keyFactors: [],
      valueBets: [],
    },
    actualOutcome: dbPrediction.actualHomeScore !== null ? {
      homeScore: dbPrediction.actualHomeScore!,
      awayScore: dbPrediction.actualAwayScore!,
      winner: dbPrediction.actualWinner as 'home' | 'away',
      recordedAt: dbPrediction.validatedAt?.getTime() || Date.now(),
    } : undefined,
    validated: dbPrediction.validated,
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

