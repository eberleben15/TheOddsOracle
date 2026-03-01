/**
 * Odds Movement Monitor
 * 
 * Monitors betting lines for significant movement and triggers re-prediction
 * when thresholds are exceeded. This helps keep predictions fresh when
 * market conditions change substantially.
 */

import { prisma } from "./prisma";
import { getUpcomingGamesBySport } from "./odds-api";
import { parseOdds } from "./odds-utils";
import type { OddsGame } from "@/types";

/** Configuration for line movement thresholds */
export interface LineMovementThresholds {
  /** Minimum spread movement to trigger re-prediction (points) */
  spreadThreshold: number;
  /** Minimum total movement to trigger re-prediction (points) */
  totalThreshold: number;
  /** Minimum moneyline change to trigger (percentage, e.g., 15 = 15%) */
  moneylineThreshold: number;
  /** Only monitor games starting within this many hours */
  hoursBeforeGame: number;
  /** Don't re-predict games starting within this many minutes */
  minMinutesBeforeGame: number;
  /** Maximum re-predictions per game */
  maxRepredictionsPerGame: number;
  /** Cooldown between re-predictions for same game (minutes) */
  repredictionCooldownMinutes: number;
}

/** Default thresholds */
export const DEFAULT_THRESHOLDS: LineMovementThresholds = {
  spreadThreshold: 2.5,           // 2.5 points spread movement
  totalThreshold: 5.0,            // 5 points total movement
  moneylineThreshold: 20,         // 20% moneyline change
  hoursBeforeGame: 24,            // Monitor games within 24 hours
  minMinutesBeforeGame: 30,       // Stop 30 min before game
  maxRepredictionsPerGame: 3,     // Max 3 re-predictions per game
  repredictionCooldownMinutes: 60 // 1 hour between re-predictions
};

/** Detected line movement for a game */
export interface LineMovement {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  gameTime: Date;
  
  // Original values (at prediction time)
  originalSpread: number | null;
  originalTotal: number | null;
  originalHomeML: number | null;
  originalAwayML: number | null;
  
  // Current values
  currentSpread: number | null;
  currentTotal: number | null;
  currentHomeML: number | null;
  currentAwayML: number | null;
  
  // Movement metrics
  spreadMovement: number | null;
  totalMovement: number | null;
  homeMlChangePercent: number | null;
  awayMlChangePercent: number | null;
  
  // Flags
  significantSpreadMove: boolean;
  significantTotalMove: boolean;
  significantMlMove: boolean;
  shouldRepredict: boolean;
  
  // Reasons
  movementReasons: string[];
  
  // Tracking
  predictionId: string;
  lastRepredictedAt: Date | null;
  repredictionCount: number;
}

/** Result of monitoring run */
export interface MonitoringResult {
  timestamp: Date;
  gamesChecked: number;
  predictionsMatched: number;
  significantMovements: number;
  repredictionsTriggered: number;
  movements: LineMovement[];
  errors: string[];
}

/**
 * Calculate moneyline change percentage
 * Handles American odds conversion
 */
function calculateMlChangePercent(original: number | null, current: number | null): number | null {
  if (original == null || current == null) return null;
  if (original === 0) return null;
  
  // Convert American odds to implied probability for fair comparison
  const toImplied = (odds: number): number => {
    if (odds > 0) return 100 / (odds + 100);
    return Math.abs(odds) / (Math.abs(odds) + 100);
  };
  
  const originalProb = toImplied(original);
  const currentProb = toImplied(current);
  
  // Return absolute change in implied probability percentage
  return Math.abs(currentProb - originalProb) * 100;
}

/**
 * Get consensus spread from game odds
 */
function getConsensusSpread(game: OddsGame): number | null {
  const spreads: number[] = [];
  
  for (const book of game.bookmakers || []) {
    const spreadMarket = book.markets?.find(m => m.key === 'spreads');
    if (spreadMarket?.outcomes) {
      const homeOutcome = spreadMarket.outcomes.find(o => o.name === game.home_team);
      if (homeOutcome?.point != null) {
        spreads.push(homeOutcome.point);
      }
    }
  }
  
  if (spreads.length === 0) return null;
  return spreads.reduce((a, b) => a + b, 0) / spreads.length;
}

/**
 * Get consensus total from game odds
 */
function getConsensusTotal(game: OddsGame): number | null {
  const totals: number[] = [];
  
  for (const book of game.bookmakers || []) {
    const totalMarket = book.markets?.find(m => m.key === 'totals');
    if (totalMarket?.outcomes) {
      const overOutcome = totalMarket.outcomes.find(o => o.name === 'Over');
      if (overOutcome?.point != null) {
        totals.push(overOutcome.point);
      }
    }
  }
  
  if (totals.length === 0) return null;
  return totals.reduce((a, b) => a + b, 0) / totals.length;
}

/**
 * Get consensus moneyline from game odds
 */
function getConsensusMoneyline(game: OddsGame): { home: number | null; away: number | null } {
  const homeMls: number[] = [];
  const awayMls: number[] = [];
  
  for (const book of game.bookmakers || []) {
    const mlMarket = book.markets?.find(m => m.key === 'h2h');
    if (mlMarket?.outcomes) {
      const homeOutcome = mlMarket.outcomes.find(o => o.name === game.home_team);
      const awayOutcome = mlMarket.outcomes.find(o => o.name === game.away_team);
      if (homeOutcome?.price != null) homeMls.push(homeOutcome.price);
      if (awayOutcome?.price != null) awayMls.push(awayOutcome.price);
    }
  }
  
  return {
    home: homeMls.length > 0 ? homeMls.reduce((a, b) => a + b, 0) / homeMls.length : null,
    away: awayMls.length > 0 ? awayMls.reduce((a, b) => a + b, 0) / awayMls.length : null,
  };
}

/**
 * Check for significant line movement on a single game
 */
export function analyzeLineMovement(
  prediction: {
    id: string;
    gameId: string;
    homeTeam: string;
    awayTeam: string;
    sport: string | null;
    date: Date;
    oddsSnapshot: any;
    updatedAt: Date;
  },
  currentOdds: OddsGame,
  thresholds: LineMovementThresholds = DEFAULT_THRESHOLDS
): LineMovement {
  const oddsSnapshot = prediction.oddsSnapshot as {
    spread?: number;
    total?: number;
    moneyline?: { home?: number; away?: number };
  } | null;
  
  // Extract original odds from snapshot
  const originalSpread = oddsSnapshot?.spread ?? null;
  const originalTotal = oddsSnapshot?.total ?? null;
  const originalHomeML = oddsSnapshot?.moneyline?.home ?? null;
  const originalAwayML = oddsSnapshot?.moneyline?.away ?? null;
  
  // Get current consensus odds
  const currentSpread = getConsensusSpread(currentOdds);
  const currentTotal = getConsensusTotal(currentOdds);
  const currentMl = getConsensusMoneyline(currentOdds);
  
  // Calculate movements
  const spreadMovement = (originalSpread != null && currentSpread != null)
    ? Math.abs(currentSpread - originalSpread)
    : null;
  
  const totalMovement = (originalTotal != null && currentTotal != null)
    ? Math.abs(currentTotal - originalTotal)
    : null;
  
  const homeMlChangePercent = calculateMlChangePercent(originalHomeML, currentMl.home);
  const awayMlChangePercent = calculateMlChangePercent(originalAwayML, currentMl.away);
  
  // Determine significance
  const significantSpreadMove = spreadMovement != null && spreadMovement >= thresholds.spreadThreshold;
  const significantTotalMove = totalMovement != null && totalMovement >= thresholds.totalThreshold;
  const significantMlMove = (
    (homeMlChangePercent != null && homeMlChangePercent >= thresholds.moneylineThreshold) ||
    (awayMlChangePercent != null && awayMlChangePercent >= thresholds.moneylineThreshold)
  );
  
  // Build reasons
  const movementReasons: string[] = [];
  if (significantSpreadMove) {
    const direction = currentSpread! > originalSpread! ? 'away' : 'home';
    movementReasons.push(`Spread moved ${spreadMovement!.toFixed(1)} pts toward ${direction}`);
  }
  if (significantTotalMove) {
    const direction = currentTotal! > originalTotal! ? 'up' : 'down';
    movementReasons.push(`Total moved ${direction} ${totalMovement!.toFixed(1)} pts`);
  }
  if (significantMlMove) {
    movementReasons.push(`Moneyline shifted significantly`);
  }
  
  // Check timing constraints
  const now = new Date();
  const gameTime = new Date(prediction.date);
  const hoursUntilGame = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const minutesUntilGame = hoursUntilGame * 60;
  
  // GUARDRAIL: Skip live games - we only process pregame predictions
  // If minutesUntilGame is negative, the game has already started
  if (minutesUntilGame <= 0) {
    return {
      gameId: prediction.gameId,
      homeTeam: prediction.homeTeam,
      awayTeam: prediction.awayTeam,
      sport: prediction.sport || 'unknown',
      gameTime,
      
      originalSpread,
      originalTotal,
      originalHomeML,
      originalAwayML,
      
      currentSpread,
      currentTotal,
      currentHomeML: currentMl.home,
      currentAwayML: currentMl.away,
      
      spreadMovement,
      totalMovement,
      homeMlChangePercent,
      awayMlChangePercent,
      
      significantSpreadMove: false,
      significantTotalMove: false,
      significantMlMove: false,
      shouldRepredict: false,
      
      movementReasons: ['Game is live - pregame predictions only'],
      
      predictionId: prediction.id,
      lastRepredictedAt: null,
      repredictionCount: 0,
    };
  }
  
  const withinWindow = hoursUntilGame <= thresholds.hoursBeforeGame && 
                       minutesUntilGame >= thresholds.minMinutesBeforeGame;
  
  // Get reprediction count from prediction history
  // (This would need to be passed in or queried - simplified here)
  const repredictionCount = 0; // Will be filled in by caller
  const lastRepredictedAt = null;
  
  // Determine if we should repredict
  const hasSignificantMove = significantSpreadMove || significantTotalMove || significantMlMove;
  const shouldRepredict = hasSignificantMove && withinWindow;
  
  return {
    gameId: prediction.gameId,
    homeTeam: prediction.homeTeam,
    awayTeam: prediction.awayTeam,
    sport: prediction.sport || 'unknown',
    gameTime,
    
    originalSpread,
    originalTotal,
    originalHomeML,
    originalAwayML,
    
    currentSpread,
    currentTotal,
    currentHomeML: currentMl.home,
    currentAwayML: currentMl.away,
    
    spreadMovement,
    totalMovement,
    homeMlChangePercent,
    awayMlChangePercent,
    
    significantSpreadMove,
    significantTotalMove,
    significantMlMove,
    shouldRepredict,
    
    movementReasons,
    
    predictionId: prediction.id,
    lastRepredictedAt,
    repredictionCount,
  };
}

/**
 * Monitor all active predictions for line movement
 */
export async function monitorOddsMovement(
  sports: string[] = ['basketball_ncaab', 'basketball_nba', 'icehockey_nhl', 'baseball_mlb'],
  thresholds: LineMovementThresholds = DEFAULT_THRESHOLDS
): Promise<MonitoringResult> {
  const result: MonitoringResult = {
    timestamp: new Date(),
    gamesChecked: 0,
    predictionsMatched: 0,
    significantMovements: 0,
    repredictionsTriggered: 0,
    movements: [],
    errors: [],
  };
  
  const now = new Date();
  // GUARDRAIL: windowStart must be in the future to exclude live games
  // minMinutesBeforeGame ensures we don't process games that are about to start or have started
  const windowStart = new Date(now.getTime() + thresholds.minMinutesBeforeGame * 60 * 1000);
  const windowEnd = new Date(now.getTime() + thresholds.hoursBeforeGame * 60 * 60 * 1000);
  
  try {
    // Get unvalidated predictions within our monitoring window
    // Only games starting AFTER windowStart (excludes live and imminent games)
    const predictions = await prisma.prediction.findMany({
      where: {
        validated: false,
        date: {
          gte: windowStart,  // Game must start at least minMinutesBeforeGame from now
          lte: windowEnd,
        },
        sport: { in: sports },
      },
      select: {
        id: true,
        gameId: true,
        homeTeam: true,
        awayTeam: true,
        sport: true,
        date: true,
        oddsSnapshot: true,
        updatedAt: true,
      },
    });
    
    result.predictionsMatched = predictions.length;
    
    // Get reprediction counts from history
    const repredictionCounts = await prisma.predictionHistory.groupBy({
      by: ['predictionId'],
      where: {
        predictionId: { in: predictions.map(p => p.id) },
        changeType: 'updated',
        reason: { contains: 'line movement' },
      },
      _count: true,
    });
    
    const countMap = new Map(
      repredictionCounts.map(r => [r.predictionId, r._count])
    );
    
    // Get last reprediction times
    const lastRepredictions = await prisma.predictionHistory.findMany({
      where: {
        predictionId: { in: predictions.map(p => p.id) },
        changeType: 'updated',
        reason: { contains: 'line movement' },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['predictionId'],
      select: {
        predictionId: true,
        createdAt: true,
      },
    });
    
    const lastRepredictMap = new Map(
      lastRepredictions.map(r => [r.predictionId, r.createdAt])
    );
    
    // Group predictions by sport for efficient API calls
    const predictionsBySport = new Map<string, typeof predictions>();
    for (const pred of predictions) {
      const sport = pred.sport || 'unknown';
      if (!predictionsBySport.has(sport)) {
        predictionsBySport.set(sport, []);
      }
      predictionsBySport.get(sport)!.push(pred);
    }
    
    // Fetch current odds for each sport
    for (const [sport, sportPredictions] of predictionsBySport) {
      if (sport === 'unknown') continue;
      
      try {
        const currentGames = await getUpcomingGamesBySport(sport);
        result.gamesChecked += currentGames.length;
        
        // Create lookup by game ID
        const gameMap = new Map<string, OddsGame>(currentGames.map((g: OddsGame) => [g.id, g]));
        
        // Analyze each prediction
        for (const pred of sportPredictions) {
          const currentOdds = gameMap.get(pred.gameId);
          if (!currentOdds) continue;
          
          const movement = analyzeLineMovement(pred, currentOdds, thresholds);
          
          // Add reprediction tracking info
          movement.repredictionCount = countMap.get(pred.id) || 0;
          movement.lastRepredictedAt = lastRepredictMap.get(pred.id) || null;
          
          // Check cooldown
          if (movement.lastRepredictedAt) {
            const minutesSinceLastRepredict = 
              (now.getTime() - movement.lastRepredictedAt.getTime()) / (1000 * 60);
            
            if (minutesSinceLastRepredict < thresholds.repredictionCooldownMinutes) {
              movement.shouldRepredict = false;
              movement.movementReasons.push(
                `Cooldown: ${Math.round(thresholds.repredictionCooldownMinutes - minutesSinceLastRepredict)}min remaining`
              );
            }
          }
          
          // Check max repredictions
          if (movement.repredictionCount >= thresholds.maxRepredictionsPerGame) {
            movement.shouldRepredict = false;
            movement.movementReasons.push(`Max repredictions (${thresholds.maxRepredictionsPerGame}) reached`);
          }
          
          // Track significant movements
          if (movement.significantSpreadMove || movement.significantTotalMove || movement.significantMlMove) {
            result.significantMovements++;
            result.movements.push(movement);
          }
        }
      } catch (error) {
        const errMsg = `Error fetching odds for ${sport}: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errMsg);
        console.error(`[OddsMonitor] ${errMsg}`);
      }
    }
    
  } catch (error) {
    const errMsg = `Error in odds monitoring: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errMsg);
    console.error(`[OddsMonitor] ${errMsg}`);
  }
  
  return result;
}

/**
 * Get summary of current line movements
 */
export async function getLineMovementSummary(
  sports?: string[],
  thresholds?: LineMovementThresholds
): Promise<{
  timestamp: Date;
  movements: LineMovement[];
  summary: {
    total: number;
    significantSpread: number;
    significantTotal: number;
    significantMl: number;
    pendingReprediction: number;
  };
}> {
  const result = await monitorOddsMovement(sports, thresholds);
  
  return {
    timestamp: result.timestamp,
    movements: result.movements,
    summary: {
      total: result.movements.length,
      significantSpread: result.movements.filter(m => m.significantSpreadMove).length,
      significantTotal: result.movements.filter(m => m.significantTotalMove).length,
      significantMl: result.movements.filter(m => m.significantMlMove).length,
      pendingReprediction: result.movements.filter(m => m.shouldRepredict).length,
    },
  };
}
