/**
 * Test script to check Vanderbilt men's basketball stats from SportsData.io
 * Specifically checking points per game values
 */

import * as dotenv from "dotenv";
import { existsSync } from "fs";

// Load environment variables - prioritize .env.local
if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
if (existsSync(".env")) {
  dotenv.config({ path: ".env" });
}

// Also load .env as fallback
dotenv.config();

// Check for API key before importing
if (!process.env.SPORTSDATA_API_KEY) {
  console.error("❌ SPORTSDATA_API_KEY not found in environment variables");
  console.error("   Please ensure SPORTSDATA_API_KEY is set in .env.local or .env");
  process.exit(1);
}

// Import after env is loaded
import { getTeamSeasonStats, findTeamByName } from "../lib/sportsdata-api";

async function testVanderbiltStats() {
  console.log("🔍 Testing Vanderbilt Men's Basketball Stats...\n");

  try {
    // Find Vanderbilt team
    console.log("1. Finding Vanderbilt team...");
    const team = await findTeamByName("Vanderbilt");
    
    if (!team) {
      console.error("❌ Vanderbilt team not found in SportsData.io");
      return;
    }
    
    console.log(`✅ Found team: ${team.School} (TeamID: ${team.TeamID}, Key: ${team.Key})\n`);

    // Get team stats
    console.log("2. Fetching team season stats...");
    const stats = await getTeamSeasonStats("Vanderbilt");
    
    if (!stats) {
      console.error("❌ Could not fetch stats for Vanderbilt");
      return;
    }

    // Display key stats
    console.log("\n📊 VANDERBILT MEN'S BASKETBALL STATS");
    console.log("=" .repeat(50));
    console.log(`Team: ${stats.name}`);
    console.log(`Record: ${stats.wins}-${stats.losses}`);
    console.log(`\n🎯 SCORING STATS:`);
    console.log(`  Points Per Game (PPG): ${stats.pointsPerGame?.toFixed(1)}`);
    console.log(`  Points Allowed Per Game (PAPG): ${stats.pointsAllowedPerGame?.toFixed(1)}`);
    console.log(`  Net Rating: ${(stats.pointsPerGame || 0) - (stats.pointsAllowedPerGame || 0)}`);
    
    console.log(`\n⚡ ADVANCED METRICS:`);
    console.log(`  Offensive Efficiency: ${stats.offensiveEfficiency?.toFixed(1) || 'N/A'} (points per 100 possessions)`);
    console.log(`  Defensive Efficiency: ${stats.defensiveEfficiency?.toFixed(1) || 'N/A'} (points per 100 possessions)`);
    console.log(`  Pace: ${stats.pace?.toFixed(1) || 'N/A'} (possessions per game)`);
    
    console.log(`\n📈 FOUR FACTORS:`);
    console.log(`  Effective FG%: ${stats.effectiveFieldGoalPercentage?.toFixed(1) || 'N/A'}%`);
    console.log(`  Turnover Rate: ${stats.turnoverRate?.toFixed(1) || 'N/A'}%`);
    console.log(`  Offensive Rebound Rate: ${stats.offensiveReboundRate?.toFixed(1) || 'N/A'}%`);
    console.log(`  Free Throw Rate: ${stats.freeThrowRate?.toFixed(1) || 'N/A'}`);
    
    console.log(`\n🎯 RECENT GAMES: ${stats.recentGames?.length || 0} games`);
    if (stats.recentGames && stats.recentGames.length > 0) {
      console.log("\nLast 5 games:");
      stats.recentGames.slice(0, 5).forEach((game, idx) => {
        const isHome = game.homeTeam === stats.name;
        const teamScore = isHome ? game.homeScore : game.awayScore;
        const oppScore = isHome ? game.awayScore : game.homeScore;
        const opponent = isHome ? game.awayTeam : game.homeTeam;
        const result = teamScore > oppScore ? "W" : "L";
        console.log(`  ${idx + 1}. ${result} ${teamScore}-${oppScore} vs ${opponent}`);
      });
    }

    console.log("\n" + "=".repeat(50));
    console.log("\n✅ Analysis:");
    if (stats.pointsPerGame) {
      if (stats.pointsPerGame > 100) {
        console.log("⚠️  WARNING: Points Per Game is over 100, which is unusually high for college basketball");
        console.log("   Typical range: 65-85 PPG for college basketball");
        console.log("   This might be an efficiency rating (points per 100 possessions) incorrectly mapped as PPG");
      } else if (stats.pointsPerGame > 90) {
        console.log("⚠️  Points Per Game is high but within possible range (very high-scoring team)");
      } else if (stats.pointsPerGame >= 65 && stats.pointsPerGame <= 85) {
        console.log("✅ Points Per Game is in the expected range for college basketball (65-85)");
      } else if (stats.pointsPerGame < 65) {
        console.log("ℹ️  Points Per Game is below average (low-scoring team)");
      }
    }

    if (stats.offensiveEfficiency) {
      if (stats.offensiveEfficiency >= 100 && stats.offensiveEfficiency <= 120) {
        console.log("✅ Offensive Efficiency is in expected range (100-120 points per 100 possessions)");
      } else {
        console.log(`ℹ️  Offensive Efficiency: ${stats.offensiveEfficiency.toFixed(1)} (typical range: 100-120)`);
      }
    }

  } catch (error) {
    console.error("\n❌ Error testing Vanderbilt stats:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}

testVanderbiltStats().then(() => {
  console.log("\n🏁 Test complete");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

