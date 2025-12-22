/**
 * Inspect raw API response from SportsData.io to understand data structure
 */

import * as dotenv from "dotenv";
import { existsSync } from "fs";

// Load environment variables
if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
if (existsSync(".env")) {
  dotenv.config({ path: ".env" });
}

const API_KEY = process.env.SPORTSDATA_API_KEY;
if (!API_KEY) {
  console.error("❌ SPORTSDATA_API_KEY not found");
  process.exit(1);
}

const BASE_URL = "https://api.sportsdata.io/v3/cbb";
const CURRENT_SEASON = "2026"; // 2025-26 season

async function inspectAPIResponse() {
  console.log("🔍 Inspecting SportsData.io API Response Structure...\n");

  try {
    // 1. Get team info
    console.log("1. Fetching teams...");
    const teamsResponse = await fetch(`${BASE_URL}/Teams?key=${API_KEY}`);
    const teamsData: any = await teamsResponse.json();
    const teams = Array.isArray(teamsData) ? teamsData : (teamsData.response || []);
    const vanderbilt = teams.find((t: any) => t.School === "Vanderbilt");
    
    if (!vanderbilt) {
      console.error("❌ Vanderbilt not found");
      return;
    }
    
    console.log(`✅ Found: ${vanderbilt.School} (TeamID: ${vanderbilt.TeamID}, Key: ${vanderbilt.Key})\n`);

    // 2. Get raw team season stats
    console.log("2. Fetching raw team season stats...");
    const statsResponse = await fetch(
      `${BASE_URL}/stats/json/TeamSeasonStats/${CURRENT_SEASON}?key=${API_KEY}`
    );
    const statsData: any = await statsResponse.json();
    const allStats = Array.isArray(statsData) ? statsData : (statsData.response || []);
    const vandyStats = allStats.find((s: any) => s.TeamID === vanderbilt.TeamID);
    
    if (!vandyStats) {
      console.error("❌ Stats not found");
      return;
    }

    console.log("\n📊 RAW API RESPONSE STRUCTURE:");
    console.log("=" .repeat(60));
    console.log(JSON.stringify(vandyStats, null, 2));
    console.log("=" .repeat(60));

    // 3. Analyze key fields
    console.log("\n🔬 DATA ANALYSIS:");
    console.log("-".repeat(60));
    console.log(`Games Played: ${vandyStats.Games}`);
    console.log(`Points (raw): ${vandyStats.Points}`);
    console.log(`PointsPerGame (raw): ${vandyStats.PointsPerGame}`);
    console.log(`OpponentPoints (raw): ${vandyStats.OpponentPoints}`);
    console.log(`OpponentPointsPerGame (raw): ${vandyStats.OpponentPointsPerGame}`);
    console.log(`Possessions: ${vandyStats.Possessions}`);
    
    if (vandyStats.Points && vandyStats.Games) {
      const calculatedPPG = vandyStats.Points / vandyStats.Games;
      console.log(`\n📐 CALCULATIONS:`);
      console.log(`  Points / Games = ${vandyStats.Points} / ${vandyStats.Games} = ${calculatedPPG.toFixed(2)} PPG`);
    }
    
    if (vandyStats.Possessions && vandyStats.Games) {
      const pace = vandyStats.Possessions / vandyStats.Games;
      console.log(`  Possessions / Games = ${vandyStats.Possessions} / ${vandyStats.Games} = ${pace.toFixed(2)} pace`);
    }
    
    if (vandyStats.Points && vandyStats.Possessions) {
      const offEff = (vandyStats.Points / vandyStats.Possessions) * 100;
      console.log(`  (Points / Possessions) * 100 = (${vandyStats.Points} / ${vandyStats.Possessions}) * 100 = ${offEff.toFixed(2)} Off Eff`);
    }

    // 4. Get recent games
    console.log("\n3. Fetching recent games...");
    const gamesResponse = await fetch(
      `${BASE_URL}/scores/json/GamesByDate/${new Date().toISOString().split('T')[0]}?key=${API_KEY}`
    );
    
    // Try to get team's recent games from a different endpoint
    const teamGamesUrl = `${BASE_URL}/scores/json/TeamGameStatsBySeason/${CURRENT_SEASON}/${vanderbilt.TeamID}?key=${API_KEY}`;
    console.log(`   Trying: ${teamGamesUrl.split('?')[0]}...`);
    
    try {
      const teamGamesResponse = await fetch(teamGamesUrl);
      if (teamGamesResponse.ok) {
        const gamesData: any = await teamGamesResponse.json();
        const teamGames = Array.isArray(gamesData) ? gamesData : (gamesData.response || []);
        console.log(`   ✅ Found ${teamGames.length} games`);
        if (teamGames.length > 0) {
          console.log("\n📅 SAMPLE GAME DATA:");
          console.log("-".repeat(60));
          const sample = teamGames[0];
          console.log(JSON.stringify(sample, null, 2));
          
          // Look for score-related fields
          const scoreFields = Object.keys(sample).filter(k => 
            k.toLowerCase().includes('score') || 
            k.toLowerCase().includes('point') ||
            k.toLowerCase().includes('total')
          );
          if (scoreFields.length > 0) {
            console.log("\n🎯 Score-related fields found:");
            scoreFields.forEach(field => {
              console.log(`  ${field}: ${sample[field]}`);
            });
          }
        }
      } else {
        console.log(`   ⚠️  Endpoint returned ${teamGamesResponse.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch team games: ${error}`);
    }

    // 5. Check API documentation hints
    console.log("\n📚 INTERPRETATION:");
    console.log("-".repeat(60));
    console.log("If PointsPerGame is undefined but Points exists:");
    console.log("  → API might return totals, requiring manual calculation");
    console.log("\nIf recent game scores are >150:");
    console.log("  → Could be exhibition/preseason games with different rules");
    console.log("  → Could be aggregated/accumulated data");
    console.log("  → Could be a data quality issue");
    console.log("\nIf pace is >100 possessions:");
    console.log("  → This is unusually high (normal: 65-75)");
    console.log("  → Suggests data might be from a different source/format");

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
    }
  }
}

inspectAPIResponse().then(() => {
  console.log("\n🏁 Inspection complete");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

