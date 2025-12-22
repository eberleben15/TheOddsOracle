#!/usr/bin/env tsx
/**
 * Calibration Script
 * 
 * Runs coefficient optimization on historical data to find best coefficients.
 * Usage: npx tsx scripts/calibrate-predictions.ts [--seasons 2023,2024] [--sample-size 200]
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config();

import {
  collectHistoricalDataForSeasons,
  getHistoricalDataStats,
} from "../lib/historical-data-collector";
import {
  DEFAULT_COEFFICIENTS,
  optimizeCoefficients,
  validateCoefficients,
  compareCoefficients,
} from "../lib/prediction-calibration";
import { logValidationMetrics } from "../lib/score-prediction-validator";

async function calibratePredictions() {
  console.log("\n🔧 Prediction Model Calibration\n");
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let seasonsToUse: number[] = [];
  let sampleSize = 200;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seasons' && i + 1 < args.length) {
      seasonsToUse = args[i + 1].split(',').map(s => parseInt(s.trim()));
    }
    if (args[i] === '--sample-size' && i + 1 < args.length) {
      sampleSize = parseInt(args[i + 1]);
    }
  }
  
  // Default to last 2 seasons if not specified
  if (seasonsToUse.length === 0) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentSeason = currentMonth >= 10 ? currentYear + 1 : currentYear;
    seasonsToUse = [currentSeason - 1, currentSeason];
  }
  
  console.log(`Collecting data for seasons: ${seasonsToUse.join(', ')}`);
  console.log(`Sample size: ${sampleSize} games\n`);
  
  try {
    // Collect historical data
    const dataset = await collectHistoricalDataForSeasons(seasonsToUse);
    
    const stats = getHistoricalDataStats();
    console.log(`Collected ${stats.totalGames} games and ${stats.totalTeams} teams\n`);
    
    if (stats.totalGames === 0) {
      console.error("No historical data available for calibration");
      process.exit(1);
    }
    
    // Validate default coefficients
    console.log("Validating default coefficients...");
    const defaultMetrics = await validateCoefficients(DEFAULT_COEFFICIENTS, dataset, sampleSize);
    console.log("Default coefficients performance:");
    logValidationMetrics(defaultMetrics);
    
    // Optimize coefficients
    console.log("\nOptimizing coefficients...");
    const optimizedCoefficients = await optimizeCoefficients(dataset, sampleSize);
    
    // Validate optimized coefficients
    console.log("\nValidating optimized coefficients...");
    const optimizedMetrics = await validateCoefficients(optimizedCoefficients, dataset, sampleSize);
    console.log("Optimized coefficients performance:");
    logValidationMetrics(optimizedMetrics);
    
    // Compare
    console.log("\nComparison:");
    const comparison = await compareCoefficients(
      DEFAULT_COEFFICIENTS,
      optimizedCoefficients,
      dataset,
      sampleSize
    );
    
    console.log(`\nMAE Improvement: ${comparison.improvement.mae > 0 ? '+' : ''}${comparison.improvement.mae.toFixed(2)} points`);
    console.log(`Winner Accuracy Improvement: ${comparison.improvement.winnerAccuracy > 0 ? '+' : ''}${comparison.improvement.winnerAccuracy.toFixed(2)}%`);
    
    // Output optimized coefficients
    console.log("\n📋 Optimized Coefficients:");
    console.log(JSON.stringify(optimizedCoefficients, null, 2));
    
    console.log("\n✅ Calibration complete\n");
    
  } catch (error) {
    console.error("Error during calibration:", error);
    process.exit(1);
  }
}

calibratePredictions().catch(console.error);

