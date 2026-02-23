#!/usr/bin/env tsx
/**
 * Score Prediction Validation Script
 * 
 * Validates score predictions against historical game results.
 * Usage: npx tsx scripts/validate-predictions.ts [numGames]
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config(); // Also load .env if it exists

import { 
  getTeamSeasonStats, 
  getAllTeams,
  getAllTeamSeasonStats,
  getGamesByDate 
} from "../lib/sportsdata-api";
import {
  calculateValidationMetrics,
  logValidationMetrics,
  PredictionValidation,
} from "../lib/score-prediction-validator";
import { predictMatchup, calculateTeamAnalytics } from "../lib/advanced-analytics";

async function validatePredictions(numGames: number = 20) {
  console.log(`\n🔍 Validating Score Predictions (${numGames} recent games)\n`);
  
  try {
    // Get recent completed games
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get games from the last 7 days
    const validations: PredictionValidation[] = [];
    const allGames: any[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const games = await getGamesByDate(dateStr);
        const completedGames = games.filter(g => 
          g.IsClosed && 
          g.HomeTeamScore !== null && 
          g.AwayTeamScore !== null
        );
        allGames.push(...completedGames);
      } catch (error) {
        console.warn(`Error fetching games for ${dateStr}:`, error);
      }
    }
    
    if (allGames.length === 0) {
      console.log("❌ No completed games found to validate");
      return;
    }
    
    // Get all team stats for lookups
    const allStats = await getAllTeamSeasonStats();
    const allTeams = await getAllTeams();
    const statsMap = new Map(allStats.map(s => [s.TeamID, s]));
    const teamsMap = new Map(allTeams.map(t => [t.TeamID, t]));
    
    // Process games (limit to numGames)
    const gamesToProcess = allGames.slice(0, numGames);
    
    for (const game of gamesToProcess) {
      try {
        const homeTeam = teamsMap.get(game.HomeTeamID);
        const awayTeam = teamsMap.get(game.AwayTeamID);
        
        if (!homeTeam || !awayTeam) continue;
        
        const homeStatsData = statsMap.get(game.HomeTeamID);
        const awayStatsData = statsMap.get(game.AwayTeamID);
        
        if (!homeStatsData || !awayStatsData) continue;
        
        // Convert to TeamStats format (simplified)
        const homeStats = {
          id: homeTeam.TeamID,
          name: homeTeam.School,
          code: homeTeam.Key,
          wins: homeStatsData.Wins,
          losses: homeStatsData.Losses,
          pointsPerGame: homeStatsData.PointsPerGame,
          pointsAllowedPerGame: homeStatsData.OpponentPointsPerGame,
          recentGames: [],
          offensiveEfficiency: homeStatsData.OffensiveRating,
          defensiveEfficiency: homeStatsData.DefensiveRating,
          pace: homeStatsData.Possessions / Math.max(homeStatsData.Games, 1),
          effectiveFieldGoalPercentage: homeStatsData.EffectiveFieldGoalsPercentage,
          turnoverRate: homeStatsData.TurnOversPercentage,
          offensiveReboundRate: homeStatsData.OffensiveReboundsPercentage,
          freeThrowRate: homeStatsData.FreeThrowAttemptRate,
        } as any;
        
        const awayStats = {
          id: awayTeam.TeamID,
          name: awayTeam.School,
          code: awayTeam.Key,
          wins: awayStatsData.Wins,
          losses: awayStatsData.Losses,
          pointsPerGame: awayStatsData.PointsPerGame,
          pointsAllowedPerGame: awayStatsData.OpponentPointsPerGame,
          recentGames: [],
          offensiveEfficiency: awayStatsData.OffensiveRating,
          defensiveEfficiency: awayStatsData.DefensiveRating,
          pace: awayStatsData.Possessions / Math.max(awayStatsData.Games, 1),
          effectiveFieldGoalPercentage: awayStatsData.EffectiveFieldGoalsPercentage,
          turnoverRate: awayStatsData.TurnOversPercentage,
          offensiveReboundRate: awayStatsData.OffensiveReboundsPercentage,
          freeThrowRate: awayStatsData.FreeThrowAttemptRate,
        } as any;
        
        // Calculate analytics
        const homeAnalytics = calculateTeamAnalytics(homeStats, [], true);
        const awayAnalytics = calculateTeamAnalytics(awayStats, [], false);
        
        // Make prediction
        const prediction = predictMatchup(awayAnalytics, homeAnalytics, awayStats, homeStats);
        
        // Validate
        const validation = {
          gameId: game.GameID,
          date: game.DateTime,
          homeTeam: homeTeam.School,
          awayTeam: awayTeam.School,
          predictedScore: prediction.predictedScore,
          actualScore: {
            home: game.HomeTeamScore!,
            away: game.AwayTeamScore!,
          },
          predictedSpread: prediction.predictedSpread,
          actualSpread: game.HomeTeamScore! - game.AwayTeamScore!,
          homeWinProb: prediction.winProbability.home,
          actualWinner: game.HomeTeamScore! > game.AwayTeamScore! ? 'home' as const : 'away' as const,
          errors: {
            homeScoreError: Math.abs(prediction.predictedScore.home - game.HomeTeamScore!),
            awayScoreError: Math.abs(prediction.predictedScore.away - game.AwayTeamScore!),
            spreadError: Math.abs(prediction.predictedSpread - (game.HomeTeamScore! - game.AwayTeamScore!)),
            totalError: Math.abs(prediction.predictedScore.home - game.HomeTeamScore!) + 
                       Math.abs(prediction.predictedScore.away - game.AwayTeamScore!),
          },
        };
        
        validations.push(validation);
        
        console.log(`✓ ${awayTeam.School} @ ${homeTeam.School}: Predicted ${prediction.predictedScore.away}-${prediction.predictedScore.home}, Actual ${game.AwayTeamScore}-${game.HomeTeamScore}`);
        
      } catch (error) {
        console.warn(`Error processing game ${game.GameID}:`, error);
      }
    }
    
    if (validations.length === 0) {
      console.log("❌ No validations could be completed");
      return;
    }
    
    // Calculate and display metrics
    const metrics = calculateValidationMetrics(validations);
    logValidationMetrics(metrics);
    
  } catch (error) {
    console.error("Error validating predictions:", error);
  }
}

// Run validation
const numGames = process.argv[2] ? parseInt(process.argv[2]) : 20;
validatePredictions(numGames).catch(console.error);

