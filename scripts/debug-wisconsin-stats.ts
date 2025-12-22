/**
 * Debug script to investigate Wisconsin stats discrepancy
 * 
 * User reports: ESPN shows 87.9 PPG, our app shows 76.6 PPG
 * We need to see exactly what the API is returning.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

async function debugWisconsinStats() {
  const apiKey = process.env.STATS_API_KEY;
  
  if (!apiKey) {
    console.error("❌ STATS_API_KEY not set");
    process.exit(1);
  }

  console.log("🔍 DEBUGGING WISCONSIN STATS DISCREPANCY");
  console.log("═══════════════════════════════════════\n");

  // 1. Search for Wisconsin
  console.log("Step 1: Searching for Wisconsin...");
  const searchRes = await fetch(`${API_URL}/teams?search=Wisconsin`, {
    headers: { "x-apisports-key": apiKey as string },
  });
  const searchData = await searchRes.json();
  
  const wisconsinTeams = searchData.response?.filter((t: any) => 
    t.country?.name === "USA" && 
    t.name.toLowerCase().includes("wisconsin") &&
    !t.name.endsWith(" W")
  );
  
  console.log(`Found ${wisconsinTeams?.length || 0} Wisconsin teams (USA, not Women):`);
  wisconsinTeams?.forEach((t: any) => {
    console.log(`  - ID: ${t.id}, Name: "${t.name}"`);
  });
  
  if (!wisconsinTeams || wisconsinTeams.length === 0) {
    console.error("❌ No Wisconsin teams found!");
    return;
  }

  const wisconsin = wisconsinTeams[0];
  console.log(`\n✓ Using: ${wisconsin.name} (ID: ${wisconsin.id})\n`);

  // 2. Check what seasons have data
  console.log("Step 2: Checking available seasons...");
  const currentSeason = "2024-2025";
  
  console.log(`\nStep 3: Fetching /statistics for ${currentSeason}...`);
  const statsRes = await fetch(
    `${API_URL}/statistics?team=${wisconsin.id}&league=${NCAA_LEAGUE_ID}&season=${currentSeason}`,
    { headers: { "x-apisports-key": apiKey as string } }
  );
  const statsData = await statsRes.json();
  
  console.log("\n📊 RAW API RESPONSE:");
  console.log("═══════════════════════════════════════");
  console.log(JSON.stringify(statsData, null, 2));
  
  if (statsData.response) {
    const r = statsData.response;
    console.log("\n📈 EXTRACTED STATS:");
    console.log("═══════════════════════════════════════");
    console.log(`Games Played: ${r.games?.played?.all || 0}`);
    console.log(`Wins: ${r.games?.wins?.all?.total || 0}`);
    console.log(`Losses: ${r.games?.loses?.all?.total || 0}`);
    console.log(`Points For (Average): ${r.points?.for?.average?.all || 0} PPG`);
    console.log(`Points Against (Average): ${r.points?.against?.average?.all || 0} PAPG`);
    console.log(`FG%: ${r.shots?.fg_percentage?.all || 0}%`);
    console.log(`3P%: ${r.shots?.three_points_percentage?.all || 0}%`);
    console.log(`FT%: ${r.shots?.free_throws_percentage?.all || 0}%`);
  }
  
  // 4. Fetch actual games to verify
  console.log(`\n\nStep 4: Fetching actual games for verification...`);
  const gamesRes = await fetch(
    `${API_URL}/games?team=${wisconsin.id}&league=${NCAA_LEAGUE_ID}&season=${currentSeason}`,
    { headers: { "x-apisports-key": apiKey as string } }
  );
  const gamesData = await gamesRes.json();
  
  const finishedGames = gamesData.response?.filter((g: any) => 
    g.status?.short === "FT" && 
    !g.teams?.home?.name?.endsWith(" W") && 
    !g.teams?.away?.name?.endsWith(" W")
  );
  
  console.log(`\n🏀 COMPLETED GAMES (${finishedGames?.length || 0} games):`);
  console.log("═══════════════════════════════════════");
  
  let totalPoints = 0;
  let gameCount = 0;
  
  finishedGames?.forEach((g: any, idx: number) => {
    const isHome = g.teams.home.id === wisconsin.id;
    const wisScore = isHome ? g.scores.home.total : g.scores.away.total;
    const oppScore = isHome ? g.scores.away.total : g.scores.home.total;
    const opponent = isHome ? g.teams.away.name : g.teams.home.name;
    const result = wisScore > oppScore ? "W" : "L";
    
    totalPoints += wisScore;
    gameCount++;
    
    console.log(`${idx + 1}. ${g.date.split('T')[0]} | ${result} ${wisScore}-${oppScore} vs ${opponent}`);
  });
  
  const calculatedPPG = gameCount > 0 ? (totalPoints / gameCount).toFixed(1) : 0;
  
  console.log("\n📊 MANUAL CALCULATION:");
  console.log("═══════════════════════════════════════");
  console.log(`Total Points Scored: ${totalPoints}`);
  console.log(`Games Played: ${gameCount}`);
  console.log(`Calculated PPG: ${calculatedPPG}`);
  
  console.log("\n🔍 COMPARISON:");
  console.log("═══════════════════════════════════════");
  console.log(`ESPN/Sports Reference: 87.9 PPG (reported by user)`);
  console.log(`API /statistics:       ${statsData.response?.points?.for?.average?.all || 0} PPG`);
  console.log(`Manual calculation:    ${calculatedPPG} PPG`);
  
  const apiPPG = parseFloat(statsData.response?.points?.for?.average?.all || "0");
  const manualPPG = parseFloat(calculatedPPG);
  
  if (Math.abs(apiPPG - manualPPG) > 1) {
    console.log("\n⚠️  WARNING: API average doesn't match manual calculation!");
  }
  
  if (manualPPG < 85) {
    console.log("\n❌ PROBLEM IDENTIFIED:");
    console.log("   Our calculated PPG is significantly lower than ESPN (87.9)");
    console.log("   Possible issues:");
    console.log("   1. API might not have all games yet");
    console.log("   2. API might be filtering games differently");
    console.log("   3. ESPN might include different game types (tournaments, etc.)");
    console.log("   4. We might be using wrong season or league ID");
  }
  
  console.log("\n" + "═".repeat(50));
  console.log("Debug complete. Check output above for discrepancies.");
}

debugWisconsinStats().catch(console.error);

