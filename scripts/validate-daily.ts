#!/usr/bin/env tsx
/**
 * Daily Validation Script
 * 
 * Automatically validates predictions against completed games.
 * Should be run daily/weekly via cron job or scheduled task.
 * 
 * Usage: npx tsx scripts/validate-daily.ts [--date YYYY-MM-DD]
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config();

import { getGamesByDate } from "../lib/sportsdata-api";
import { 
  getValidatedPredictions,
  recordOutcomeByMatchup,
  getTrackingStats,
  clearOldPredictions,
} from "../lib/prediction-tracker";
import {
  calculateValidationMetrics,
  logValidationMetrics,
  PredictionValidation,
  validateGamePrediction,
} from "../lib/score-prediction-validator";

async function validateDaily(targetDate?: string) {
  console.log("\n📊 Daily Prediction Validation\n");
  
  const stats = await getTrackingStats();
  console.log(`Tracking Stats: ${stats.validated} validated, ${stats.unvalidated} unvalidated predictions`);
  
  // Determine date to validate
  let dateToValidate: Date;
  if (targetDate) {
    dateToValidate = new Date(targetDate);
  } else {
    // Default to yesterday (games completed)
    dateToValidate = new Date();
    dateToValidate.setDate(dateToValidate.getDate() - 1);
  }
  
  const dateStr = dateToValidate.toISOString().split('T')[0];
  console.log(`Validating games from ${dateStr}\n`);
  
  try {
    // Get completed games for the date
    const games = await getGamesByDate(dateStr);
    const completedGames = games.filter(g => 
      g.IsClosed && 
      g.HomeTeamScore !== null && 
      g.AwayTeamScore !== null
    );
    
    if (completedGames.length === 0) {
      console.log(`No completed games found for ${dateStr}`);
      return;
    }
    
    console.log(`Found ${completedGames.length} completed games`);
    
    // Record outcomes by matchup - predictions use Odds API IDs, ESPN uses different IDs
    let outcomesRecorded = 0;
    for (const game of completedGames) {
      const recorded = await recordOutcomeByMatchup(
        game.HomeTeam,
        game.AwayTeam,
        game.DateTime || game.Day,
        game.HomeTeamScore!,
        game.AwayTeamScore!
      );
      if (recorded) {
        outcomesRecorded++;
      }
    }
    
    console.log(`Recorded outcomes for ${outcomesRecorded} predictions\n`);
    
    // Get all validated predictions for metrics
    const validatedPredictions = await getValidatedPredictions();
    
    if (validatedPredictions.length === 0) {
      console.log("No validated predictions available for metrics");
      return;
    }
    
    // Convert to validation format
    const validations: PredictionValidation[] = validatedPredictions.map(tracked => {
      if (!tracked.actualOutcome) {
        throw new Error("Prediction marked as validated but missing actual outcome");
      }
      
      return validateGamePrediction(
        tracked.prediction,
        {
          homeScore: tracked.actualOutcome.homeScore,
          awayScore: tracked.actualOutcome.awayScore,
          homeTeam: tracked.homeTeam,
          awayTeam: tracked.awayTeam,
          gameId: parseInt(tracked.gameId),
          date: tracked.date,
        }
      );
    });
    
    // Calculate and display metrics
    const metrics = calculateValidationMetrics(validations);
    logValidationMetrics(metrics);
    
    // Clean up old predictions (keep last 30 days)
    const removed = await clearOldPredictions(30);
    if (removed > 0) {
      console.log(`Cleaned up ${removed} old predictions\n`);
    }
    
    // Summary
    console.log("✅ Daily validation complete\n");
    
  } catch (error) {
    console.error("Error during daily validation:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let targetDate: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--date' && i + 1 < args.length) {
    targetDate = args[i + 1];
    break;
  }
}

validateDaily(targetDate).catch(console.error);

