/**
 * Line Movement Re-prediction Service
 * 
 * Automatically regenerates predictions when significant line movement
 * is detected. This ensures predictions stay fresh when market conditions
 * change substantially.
 */

import { prisma } from "./prisma";
import { generatePredictionForGame } from "./prediction-generator";
import { getUpcomingGamesBySport } from "./odds-api";
import { 
  monitorOddsMovement, 
  LineMovement, 
  LineMovementThresholds, 
  DEFAULT_THRESHOLDS 
} from "./odds-movement-monitor";
import { logLineMovementUpdate, type PredictionSnapshot } from "./prediction-history";
import type { OddsGame } from "@/types";

/** Result of a single re-prediction */
export interface RepredictionResult {
  gameId: string;
  predictionId: string;
  homeTeam: string;
  awayTeam: string;
  success: boolean;
  
  // Previous values
  previousSpread: number;
  previousConfidence: number;
  
  // New values
  newSpread?: number;
  newConfidence?: number;
  
  // Change metrics
  spreadChange?: number;
  confidenceChange?: number;
  materialChange: boolean;
  
  // Movement that triggered this
  movementReasons: string[];
  
  // Error info
  error?: string;
}

/** Result of re-prediction batch */
export interface RepredictionBatchResult {
  timestamp: Date;
  duration: number;
  
  // Counts
  movementsDetected: number;
  repredictionsAttempted: number;
  repredictionsSucceeded: number;
  repredictionsFailed: number;
  
  // Material changes
  materialChanges: number;
  
  // Results
  results: RepredictionResult[];
  
  // Errors
  errors: string[];
}

/** Threshold for considering a prediction change "material" */
const MATERIAL_CHANGE_THRESHOLD = {
  spread: 1.0,        // 1 point spread change
  confidence: 5,       // 5 point confidence change
};

/**
 * Re-generate a single prediction due to line movement
 */
async function repredictGame(
  movement: LineMovement,
  currentOdds: OddsGame
): Promise<RepredictionResult> {
  const result: RepredictionResult = {
    gameId: movement.gameId,
    predictionId: movement.predictionId,
    homeTeam: movement.homeTeam,
    awayTeam: movement.awayTeam,
    success: false,
    previousSpread: 0,
    previousConfidence: 0,
    materialChange: false,
    movementReasons: movement.movementReasons,
  };
  
  try {
    // Get current prediction
    const currentPrediction = await prisma.prediction.findUnique({
      where: { id: movement.predictionId },
    });
    
    if (!currentPrediction) {
      result.error = "Prediction not found";
      return result;
    }
    
    result.previousSpread = currentPrediction.predictedSpread;
    result.previousConfidence = currentPrediction.confidence;
    
    // Capture previous state for history
    const previousSnapshot: PredictionSnapshot = {
      predictedScore: currentPrediction.predictedScore as any,
      predictedSpread: currentPrediction.predictedSpread,
      predictedTotal: currentPrediction.predictedTotal ?? undefined,
      winProbability: currentPrediction.winProbability as any,
      confidence: currentPrediction.confidence,
      keyFactors: (currentPrediction.keyFactors as string[]) ?? undefined,
      valueBets: currentPrediction.valueBets as any,
      oddsSnapshot: currentPrediction.oddsSnapshot as any,
    };
    
    // Generate new prediction
    const genResult = await generatePredictionForGame(currentOdds);
    
    if (!genResult.success || !genResult.predictionId) {
      result.error = genResult.error || genResult.skipReason || "Generation failed";
      return result;
    }
    
    // Get the newly generated prediction (it may have created a new one or updated)
    const newPrediction = await prisma.prediction.findUnique({
      where: { id: genResult.predictionId },
    });
    
    if (!newPrediction) {
      result.error = "New prediction not found after generation";
      return result;
    }
    
    result.newSpread = newPrediction.predictedSpread;
    result.newConfidence = newPrediction.confidence;
    result.spreadChange = Math.abs(newPrediction.predictedSpread - currentPrediction.predictedSpread);
    result.confidenceChange = Math.abs(newPrediction.confidence - currentPrediction.confidence);
    
    // Determine if change is material
    result.materialChange = 
      (result.spreadChange >= MATERIAL_CHANGE_THRESHOLD.spread) ||
      (result.confidenceChange >= MATERIAL_CHANGE_THRESHOLD.confidence);
    
    // If material change, update the original prediction and log history
    if (result.materialChange) {
      // Update the original prediction record
      await prisma.prediction.update({
        where: { id: movement.predictionId },
        data: {
          predictedScore: newPrediction.predictedScore as any,
          predictedSpread: newPrediction.predictedSpread,
          predictedTotal: newPrediction.predictedTotal,
          winProbability: newPrediction.winProbability as any,
          confidence: newPrediction.confidence,
          keyFactors: newPrediction.keyFactors as any,
          valueBets: newPrediction.valueBets as any,
          oddsSnapshot: newPrediction.oddsSnapshot as any,
          predictionTrace: newPrediction.predictionTrace as any,
          teamAnalytics: newPrediction.teamAnalytics as any,
          updatedAt: new Date(),
        },
      });
      
      // Log to prediction history
      const newSnapshot: PredictionSnapshot = {
        predictedScore: newPrediction.predictedScore as any,
        predictedSpread: newPrediction.predictedSpread,
        predictedTotal: newPrediction.predictedTotal ?? undefined,
        winProbability: newPrediction.winProbability as any,
        confidence: newPrediction.confidence,
        keyFactors: (newPrediction.keyFactors as string[]) ?? undefined,
        valueBets: newPrediction.valueBets as any,
        oddsSnapshot: newPrediction.oddsSnapshot as any,
      };
      
      await logLineMovementUpdate(
        movement.predictionId,
        movement.gameId,
        previousSnapshot,
        newSnapshot,
        {
          spreadMovement: movement.spreadMovement ?? undefined,
          totalMovement: movement.totalMovement ?? undefined,
          mlChangePercent: movement.homeMlChangePercent ?? movement.awayMlChangePercent ?? undefined,
          reasons: movement.movementReasons,
        }
      );
      
      // Delete the duplicate prediction if different ID
      if (genResult.predictionId !== movement.predictionId) {
        await prisma.prediction.delete({
          where: { id: genResult.predictionId },
        }).catch(() => {
          // Ignore if can't delete (might be same record)
        });
      }
    }
    
    result.success = true;
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }
  
  return result;
}

/**
 * Run re-prediction for all games with significant line movement
 */
export async function runLineMovementReprediction(
  sports?: string[],
  thresholds?: LineMovementThresholds
): Promise<RepredictionBatchResult> {
  const startTime = Date.now();
  const result: RepredictionBatchResult = {
    timestamp: new Date(),
    duration: 0,
    movementsDetected: 0,
    repredictionsAttempted: 0,
    repredictionsSucceeded: 0,
    repredictionsFailed: 0,
    materialChanges: 0,
    results: [],
    errors: [],
  };
  
  try {
    // Monitor for line movements
    const monitorResult = await monitorOddsMovement(sports, thresholds);
    result.movementsDetected = monitorResult.significantMovements;
    
    if (monitorResult.errors.length > 0) {
      result.errors.push(...monitorResult.errors);
    }
    
    // Filter to movements that should trigger re-prediction
    // GUARDRAIL: Double-check that we're not repredicting live games
    const now = new Date();
    const movementsToRepredict = monitorResult.movements.filter(m => {
      if (!m.shouldRepredict) return false;
      
      // Extra safety check: game must be in the future
      if (m.gameTime <= now) {
        console.log(`[LineMovement] Skipping live game: ${m.awayTeam} @ ${m.homeTeam}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`[LineMovement] Found ${monitorResult.significantMovements} significant movements, ${movementsToRepredict.length} eligible for re-prediction`);
    
    // Fetch current odds for each sport (cache for efficiency)
    const oddsBySport = new Map<string, OddsGame[]>();
    const sportSet = new Set(movementsToRepredict.map(m => m.sport));
    
    for (const sport of sportSet) {
      try {
        const odds = await getUpcomingGamesBySport(sport);
        oddsBySport.set(sport, odds);
      } catch (error) {
        result.errors.push(`Failed to fetch odds for ${sport}: ${error}`);
      }
    }
    
    // Re-predict each game
    for (const movement of movementsToRepredict) {
      result.repredictionsAttempted++;
      
      const sportOdds = oddsBySport.get(movement.sport);
      const currentOdds = sportOdds?.find(g => g.id === movement.gameId);
      
      if (!currentOdds) {
        result.results.push({
          gameId: movement.gameId,
          predictionId: movement.predictionId,
          homeTeam: movement.homeTeam,
          awayTeam: movement.awayTeam,
          success: false,
          previousSpread: 0,
          previousConfidence: 0,
          materialChange: false,
          movementReasons: movement.movementReasons,
          error: "Current odds not found",
        });
        result.repredictionsFailed++;
        continue;
      }
      
      const repredictResult = await repredictGame(movement, currentOdds);
      result.results.push(repredictResult);
      
      if (repredictResult.success) {
        result.repredictionsSucceeded++;
        if (repredictResult.materialChange) {
          result.materialChanges++;
          console.log(
            `[LineMovement] Updated ${movement.awayTeam} @ ${movement.homeTeam}: ` +
            `spread ${repredictResult.previousSpread.toFixed(1)} → ${repredictResult.newSpread?.toFixed(1)} ` +
            `(Δ${repredictResult.spreadChange?.toFixed(1)})`
          );
        }
      } else {
        result.repredictionsFailed++;
        console.warn(`[LineMovement] Failed to repredict ${movement.gameId}: ${repredictResult.error}`);
      }
    }
    
  } catch (error) {
    result.errors.push(`Batch error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  result.duration = Date.now() - startTime;
  
  console.log(
    `[LineMovement] Complete: ${result.movementsDetected} detected, ` +
    `${result.repredictionsAttempted} attempted, ${result.repredictionsSucceeded} succeeded, ` +
    `${result.materialChanges} material changes in ${result.duration}ms`
  );
  
  return result;
}

/**
 * Get games with pending significant line movement (for UI display)
 */
export async function getGamesWithSignificantMovement(
  sports?: string[],
  thresholds?: LineMovementThresholds
): Promise<LineMovement[]> {
  const monitorResult = await monitorOddsMovement(sports, thresholds);
  return monitorResult.movements;
}
