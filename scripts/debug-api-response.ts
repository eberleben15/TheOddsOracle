/**
 * Debug script to inspect raw SportsData.io API responses
 * Run with: npx tsx scripts/debug-api-response.ts
 */

const API_KEY = process.env.SPORTSDATA_API_KEY;
const BASE_URL = "https://api.sportsdata.io/v3/cbb";
const CURRENT_SEASON = "2025";

async function debugAPI() {
  console.log("\n🔍 DEBUGGING SportsData.io API RESPONSES\n");
  console.log("=".repeat(70));
  
  if (!API_KEY) {
    console.error("❌ SPORTSDATA_API_KEY not set!");
    return;
  }
  
  console.log("✅ API Key configured\n");

  // 1. Fetch all teams
  console.log("📋 STEP 1: Fetching Teams...");
  const teamsResponse = await fetch(`${BASE_URL}/scores/json/Teams?key=${API_KEY}`);
  const teams = await teamsResponse.json();
  console.log(`Found ${teams.length} teams\n`);
  
  // Find Wisconsin as a test team
  const wisconsin = teams.find((t: any) => t.School === "Wisconsin");
  console.log("📊 Sample Team (Wisconsin):");
  console.log(JSON.stringify(wisconsin, null, 2));
  console.log("\n" + "-".repeat(70) + "\n");

  // 2. Fetch Team Season Stats
  console.log("📋 STEP 2: Fetching Team Season Stats...");
  const statsResponse = await fetch(`${BASE_URL}/stats/json/TeamSeasonStats/${CURRENT_SEASON}?key=${API_KEY}`);
  const stats = await statsResponse.json();
  console.log(`Found stats for ${stats.length} teams\n`);
  
  // Find Wisconsin's stats
  const wisconsinStats = stats.find((s: any) => s.TeamID === wisconsin?.TeamID);
  console.log("📊 Wisconsin Season Stats (FULL OBJECT):");
  console.log(JSON.stringify(wisconsinStats, null, 2));
  
  // Specifically check Four Factors
  console.log("\n📊 Four Factors Check:");
  console.log(`  EffectiveFieldGoalsPercentage: ${wisconsinStats?.EffectiveFieldGoalsPercentage}`);
  console.log(`  TurnOversPercentage: ${wisconsinStats?.TurnOversPercentage}`);
  console.log(`  OffensiveReboundsPercentage: ${wisconsinStats?.OffensiveReboundsPercentage}`);
  console.log(`  FreeThrowAttemptRate: ${wisconsinStats?.FreeThrowAttemptRate}`);
  
  console.log("\n📊 Advanced Metrics Check:");
  console.log(`  OffensiveRating: ${wisconsinStats?.OffensiveRating}`);
  console.log(`  DefensiveRating: ${wisconsinStats?.DefensiveRating}`);
  console.log(`  Possessions: ${wisconsinStats?.Possessions}`);
  
  console.log("\n📊 Basic Stats Check:");
  console.log(`  PointsPerGame: ${wisconsinStats?.PointsPerGame}`);
  console.log(`  OpponentPointsPerGame: ${wisconsinStats?.OpponentPointsPerGame}`);
  console.log(`  Wins: ${wisconsinStats?.Wins}`);
  console.log(`  Losses: ${wisconsinStats?.Losses}`);
  console.log(`  Games: ${wisconsinStats?.Games}`);
  
  console.log("\n" + "-".repeat(70) + "\n");

  // 3. Fetch Games
  console.log("📋 STEP 3: Fetching Games...");
  const gamesResponse = await fetch(`${BASE_URL}/scores/json/Games/${CURRENT_SEASON}?key=${API_KEY}`);
  const games = await gamesResponse.json();
  console.log(`Found ${games.length} games total\n`);
  
  // Filter for Wisconsin games
  const wisconsinGames = games.filter((g: any) => 
    (g.HomeTeam === wisconsin?.Key || g.AwayTeam === wisconsin?.Key) &&
    g.Status === "Final"
  );
  console.log(`Found ${wisconsinGames.length} completed Wisconsin games\n`);
  
  // Show first few games
  console.log("📊 Wisconsin Recent Games (first 5):");
  wisconsinGames.slice(0, 5).forEach((g: any, i: number) => {
    console.log(`\n  Game ${i + 1}:`);
    console.log(`    Date: ${g.DateTime}`);
    console.log(`    HomeTeam: "${g.HomeTeam}" (ID: ${g.HomeTeamID})`);
    console.log(`    AwayTeam: "${g.AwayTeam}" (ID: ${g.AwayTeamID})`);
    console.log(`    Score: ${g.AwayTeamScore} - ${g.HomeTeamScore}`);
    console.log(`    Status: ${g.Status}`);
  });
  
  console.log("\n" + "-".repeat(70) + "\n");
  
  // 4. Check Team Key vs Team Name
  console.log("📋 STEP 4: Checking Team Key Format...");
  console.log(`Wisconsin Key: "${wisconsin?.Key}"`);
  console.log(`Wisconsin School: "${wisconsin?.School}"`);
  console.log(`Wisconsin Name: "${wisconsin?.Name}"`);
  
  // Check if games use Key or School name
  if (wisconsinGames.length > 0) {
    const firstGame = wisconsinGames[0];
    console.log(`\nFirst Game HomeTeam: "${firstGame.HomeTeam}"`);
    console.log(`First Game AwayTeam: "${firstGame.AwayTeam}"`);
    console.log(`Does HomeTeam match Key? ${firstGame.HomeTeam === wisconsin?.Key || firstGame.AwayTeam === wisconsin?.Key}`);
  }
  
  // 5. List all field names in stats response
  console.log("\n📋 STEP 5: ALL Fields in TeamSeasonStats:");
  if (wisconsinStats) {
    Object.keys(wisconsinStats).forEach(key => {
      const value = wisconsinStats[key];
      console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    });
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("✅ Debug Complete!\n");
}

debugAPI().catch(console.error);
