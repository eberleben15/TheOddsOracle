/**
 * Player Props Database Service
 * 
 * Handles persistence and retrieval of player prop predictions
 * and player data in the database.
 */

import { prisma } from "@/lib/prisma";
import type {
  NBAPlayer,
  PropPrediction,
  PropValueBet,
  PlayerPropOdds,
} from "./player-types";
import type { BoxScorePlayerStats } from "./espn-player-api";

// ============================================================================
// Player Management
// ============================================================================

export async function upsertPlayer(player: NBAPlayer): Promise<void> {
  await prisma.player.upsert({
    where: { id: player.id },
    update: {
      name: player.name,
      firstName: player.firstName,
      lastName: player.lastName,
      team: player.team,
      teamId: player.teamId,
      position: player.position,
      jersey: player.jersey,
      headshotUrl: player.headshotUrl,
      status: player.status,
    },
    create: {
      id: player.id,
      name: player.name,
      firstName: player.firstName,
      lastName: player.lastName,
      team: player.team,
      teamId: player.teamId,
      position: player.position,
      jersey: player.jersey,
      headshotUrl: player.headshotUrl,
      status: player.status,
    },
  });
}

export async function upsertPlayers(players: NBAPlayer[]): Promise<void> {
  for (const player of players) {
    await upsertPlayer(player);
  }
}

export async function getPlayerById(playerId: string) {
  return prisma.player.findUnique({
    where: { id: playerId },
  });
}

export async function getPlayersByTeam(team: string) {
  return prisma.player.findMany({
    where: { team },
  });
}

// ============================================================================
// Player Prop Prediction Management
// ============================================================================

interface SavePropPredictionInput {
  gameId: string;
  prediction: PropPrediction;
  propOdds?: {
    line: number;
    overOdds?: number;
    underOdds?: number;
    bookmaker?: string;
  };
}

export async function savePropPrediction(input: SavePropPredictionInput) {
  const { gameId, prediction, propOdds } = input;
  
  return prisma.playerPropPrediction.create({
    data: {
      gameId,
      playerId: prediction.playerId,
      playerName: prediction.playerName,
      propType: prediction.propType,
      sport: "basketball_nba",
      line: prediction.line,
      overOdds: propOdds?.overOdds ?? prediction.overOdds,
      underOdds: propOdds?.underOdds ?? prediction.underOdds,
      bestBookmaker: prediction.bestBookmaker,
      predictedValue: prediction.predictedValue,
      confidence: prediction.confidence,
      edge: prediction.edge,
      recommendation: prediction.recommendation,
      factors: prediction.factors,
      seasonAvg: prediction.seasonAvg,
      last5Avg: prediction.last5Avg,
      last10Avg: prediction.last10Avg,
    },
  });
}

export async function savePropPredictions(
  gameId: string,
  predictions: PropPrediction[]
) {
  const results = [];
  for (const prediction of predictions) {
    try {
      const result = await savePropPrediction({ gameId, prediction });
      results.push(result);
    } catch (error) {
      console.error(`Error saving prop prediction for ${prediction.playerName}:`, error);
    }
  }
  return results;
}

export async function getPropPredictionsForGame(gameId: string) {
  return prisma.playerPropPrediction.findMany({
    where: { gameId },
    include: { player: true },
    orderBy: [
      { confidence: "desc" },
      { edge: "desc" },
    ],
  });
}

export async function getPropPredictionsByPlayer(playerId: string, limit: number = 20) {
  return prisma.playerPropPrediction.findMany({
    where: { playerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getValuePropPredictions(
  options: {
    sport?: string;
    minEdge?: number;
    minConfidence?: number;
    recommendation?: string;
    limit?: number;
  } = {}
) {
  const {
    sport = "basketball_nba",
    minEdge = 3,
    minConfidence = 50,
    recommendation,
    limit = 50,
  } = options;
  
  return prisma.playerPropPrediction.findMany({
    where: {
      sport,
      edge: { gte: minEdge },
      confidence: { gte: minConfidence },
      recommendation: recommendation ? recommendation : { not: "pass" },
      hit: null, // Only unsettled
    },
    include: { player: true },
    orderBy: [
      { edge: "desc" },
      { confidence: "desc" },
    ],
    take: limit,
  });
}

// ============================================================================
// Validation & Outcome Tracking
// ============================================================================

export async function validatePropPrediction(
  predictionId: string,
  actualValue: number
) {
  const prediction = await prisma.playerPropPrediction.findUnique({
    where: { id: predictionId },
  });
  
  if (!prediction) {
    throw new Error(`Prediction ${predictionId} not found`);
  }
  
  // Determine if the prediction hit
  let hit: boolean;
  if (prediction.recommendation === "over") {
    hit = actualValue > prediction.line;
  } else if (prediction.recommendation === "under") {
    hit = actualValue < prediction.line;
  } else {
    // "pass" recommendations are not validated as hit/miss
    hit = false;
  }
  
  return prisma.playerPropPrediction.update({
    where: { id: predictionId },
    data: {
      actualValue,
      hit: prediction.recommendation === "pass" ? null : hit,
      settledAt: new Date(),
    },
  });
}

export async function validatePropPredictionsFromBoxScore(
  gameId: string,
  boxScoreStats: BoxScorePlayerStats[]
) {
  const predictions = await prisma.playerPropPrediction.findMany({
    where: { gameId, hit: null },
  });
  
  const results = [];
  
  for (const prediction of predictions) {
    // Find matching player in box score
    const playerStats = boxScoreStats.find(
      (bs) => bs.playerId === prediction.playerId
    );
    
    if (!playerStats) continue;
    
    // Get actual value based on prop type
    const actualValue = getActualValueForPropType(playerStats, prediction.propType);
    if (actualValue === null) continue;
    
    try {
      const result = await validatePropPrediction(prediction.id, actualValue);
      results.push(result);
    } catch (error) {
      console.error(`Error validating prediction ${prediction.id}:`, error);
    }
  }
  
  return results;
}

function getActualValueForPropType(
  stats: BoxScorePlayerStats,
  propType: string
): number | null {
  switch (propType) {
    case "points":
      return stats.points;
    case "rebounds":
      return stats.rebounds;
    case "assists":
      return stats.assists;
    case "threes":
      return stats.threes;
    case "steals":
      return stats.steals;
    case "blocks":
      return stats.blocks;
    case "turnovers":
      return stats.turnovers;
    case "pra":
      return stats.points + stats.rebounds + stats.assists;
    case "points_rebounds":
      return stats.points + stats.rebounds;
    case "points_assists":
      return stats.points + stats.assists;
    case "rebounds_assists":
      return stats.rebounds + stats.assists;
    case "blocks_steals":
      return stats.blocks + stats.steals;
    default:
      return null;
  }
}

// ============================================================================
// Analytics & Reporting
// ============================================================================

export async function getPropPerformanceStats(options: {
  sport?: string;
  propType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { sport = "basketball_nba", propType, startDate, endDate } = options;
  
  const where: Record<string, unknown> = {
    sport,
    hit: { not: null },
  };
  
  if (propType) where.propType = propType;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }
  
  const predictions = await prisma.playerPropPrediction.findMany({
    where,
  });
  
  const total = predictions.length;
  const hits = predictions.filter((p: { hit: boolean | null }) => p.hit === true).length;
  const misses = predictions.filter((p: { hit: boolean | null }) => p.hit === false).length;
  const passes = predictions.filter((p: { recommendation: string }) => p.recommendation === "pass").length;
  
  const byPropType = new Map<string, { total: number; hits: number }>();
  for (const pred of predictions) {
    const existing = byPropType.get(pred.propType) || { total: 0, hits: 0 };
    existing.total++;
    if (pred.hit === true) existing.hits++;
    byPropType.set(pred.propType, existing);
  }
  
  const byRecommendation: Record<"over" | "under", { total: number; hits: number }> = {
    over: { total: 0, hits: 0 },
    under: { total: 0, hits: 0 },
  };
  
  for (const pred of predictions) {
    if (pred.recommendation === "over" || pred.recommendation === "under") {
      const rec = pred.recommendation as "over" | "under";
      byRecommendation[rec].total++;
      if (pred.hit === true) byRecommendation[rec].hits++;
    }
  }
  
  return {
    total,
    hits,
    misses,
    passes,
    hitRate: total > 0 ? hits / (hits + misses) : 0,
    byPropType: Object.fromEntries(byPropType),
    byRecommendation,
  };
}

export async function getRecentPropPredictions(limit: number = 50) {
  return prisma.playerPropPrediction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { player: true },
  });
}
