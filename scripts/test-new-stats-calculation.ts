/**
 * Test the new manual stats calculation approach
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import the updated function (simulate it here for testing)
const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

async function testNewCalculation() {
  const apiKey = process.env.STATS_API_KEY;
  
  console.log("🧪 TESTING NEW STATS CALCULATION");
  console.log("═══════════════════════════════════════\n");

  // Search for Wisconsin
  const searchRes = await fetch(`${API_URL}/teams?search=Wisconsin`, {
    headers: { "x-apisports-key": apiKey as string },
  });
  const searchData = await searchRes.json();
  const wisconsin = searchData.response?.find((t: any) => t.id === 2214);

  // Fetch ALL games
  const gamesRes = await fetch(
    `${API_URL}/games?team=${wisconsin.id}&league=${NCAA_LEAGUE_ID}&season=2024-2025`,
    { headers: { "x-apisports-key": apiKey as string } }
  );
  const gamesData = await gamesRes.json();

  const finishedGames = gamesData.response?.filter((g: any) => 
    g.status?.short === "FT" && 
    !g.teams?.home?.name?.endsWith(" W") && 
    !g.teams?.away?.name?.endsWith(" W")
  );

  console.log(`Found ${finishedGames.length} completed games\n`);

  // Calculate manually
  let wins = 0;
  let losses = 0;
  let totalPoints = 0;
  let totalPointsAllowed = 0;

  finishedGames.forEach((g: any) => {
    const isHome = g.teams.home.id === wisconsin.id;
    const teamScore = isHome ? g.scores.home.total : g.scores.away.total;
    const oppScore = isHome ? g.scores.away.total : g.scores.home.total;

    if (teamScore > oppScore) wins++;
    else losses++;

    totalPoints += teamScore;
    totalPointsAllowed += oppScore;
  });

  const gamesPlayed = finishedGames.length;
  const ppg = (totalPoints / gamesPlayed).toFixed(1);
  const papg = (totalPointsAllowed / gamesPlayed).toFixed(1);

  console.log("📊 MANUAL CALCULATION RESULTS:");
  console.log("═══════════════════════════════════════");
  console.log(`Record: ${wins}-${losses}`);
  console.log(`Points Per Game: ${ppg} PPG`);
  console.log(`Points Allowed: ${papg} PAPG`);
  console.log(`Games Used: ${gamesPlayed}`);

  console.log("\n✅ ACCURACY CHECK:");
  console.log("═══════════════════════════════════════");
  console.log(`Our calculation:        ${ppg} PPG`);
  console.log(`API /statistics:        80.1 PPG`);
  console.log(`ESPN/Sports Reference:  87.9 PPG`);

  if (Math.abs(parseFloat(ppg) - 80.1) < 0.5) {
    console.log(`\n✅ Our calculation matches API /statistics!`);
  }

  if (Math.abs(parseFloat(ppg) - 87.9) < 2) {
    console.log(`✅ Our calculation is VERY CLOSE to ESPN!`);
  } else {
    console.log(`\n⚠️  Still ${Math.abs(parseFloat(ppg) - 87.9).toFixed(1)} points off from ESPN (87.9)`);
    console.log(`   Possible reasons:`);
    console.log(`   - ESPN might only count recent games`);
    console.log(`   - ESPN might use different game types`);
    console.log(`   - Different data sources entirely`);
  }

  console.log(`\n💡 RECOMMENDATION:`);
  console.log(`   Our ${ppg} PPG is calculated from actual game data (${gamesPlayed} games)`);
  console.log(`   This is the most accurate we can get from this API.`);
  console.log(`   If ESPN shows different, they may be using different criteria.`);
}

testNewCalculation().catch(console.error);

