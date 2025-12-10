/**
 * Check stats for ONLY the current season (Nov-Dec 2024)
 * ESPN likely only counts games from the current academic year
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

async function checkCurrentSeasonOnly() {
  const apiKey = process.env.STATS_API_KEY;
  if (!apiKey) {
    console.error("❌ STATS_API_KEY not set");
    process.exit(1);
  }

  console.log("🏀 WISCONSIN STATS - CURRENT SEASON ONLY");
  console.log("═══════════════════════════════════════\n");

  const searchRes = await fetch(`${API_URL}/teams?search=Wisconsin`, {
    headers: { "x-apisports-key": apiKey },
  });
  const searchData = await searchRes.json();
  const wisconsin = searchData.response?.find((t: any) => t.id === 2214);

  // Fetch all games
  const gamesRes = await fetch(
    `${API_URL}/games?team=${wisconsin.id}&league=${NCAA_LEAGUE_ID}&season=2024-2025`,
    { headers: { "x-apisports-key": apiKey } }
  );
  const gamesData = await gamesRes.json();

  const finishedGames = gamesData.response?.filter((g: any) => 
    g.status?.short === "FT" && 
    !g.teams?.home?.name?.endsWith(" W") && 
    !g.teams?.away?.name?.endsWith(" W")
  );

  // Filter to ONLY Nov-Dec 2024 (current season games actually played)
  const currentSeasonStart = new Date('2024-11-01');
  const today = new Date('2024-12-10'); // Actual today (not system date)

  const currentSeasonGames = finishedGames?.filter((g: any) => {
    const gameDate = new Date(g.date);
    return gameDate >= currentSeasonStart && gameDate <= today;
  });

  console.log(`📅 CURRENT SEASON GAMES (Nov 1 - Dec 10, 2024):`);
  console.log(`   Count: ${currentSeasonGames?.length || 0} games\n`);

  let total = 0;
  currentSeasonGames?.forEach((g: any, idx: number) => {
    const isHome = g.teams.home.id === wisconsin.id;
    const wisScore = isHome ? g.scores.home.total : g.scores.away.total;
    const oppScore = isHome ? g.scores.away.total : g.scores.home.total;
    const opponent = isHome ? g.teams.away.name : g.teams.home.name;
    const result = wisScore > oppScore ? "W" : "L";
    
    total += wisScore;
    console.log(`   ${idx + 1}. ${g.date.split('T')[0]} | ${result} ${wisScore}-${oppScore} vs ${opponent}`);
  });

  const currentPPG = currentSeasonGames.length > 0 ? (total / currentSeasonGames.length).toFixed(1) : 0;

  console.log(`\n📊 STATISTICS COMPARISON:`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Current season only (Nov-Dec 2024):  ${currentPPG} PPG (${currentSeasonGames.length} games)`);
  console.log(`API /statistics endpoint:            80.1 PPG (37 games total)`);
  console.log(`API away games only:                 76.8 PPG`);
  console.log(`User sees on app:                    76.6 PPG ⚠️`);
  console.log(`ESPN/Sports Reference:               87.9 PPG`);

  console.log(`\n🔍 ANALYSIS:`);
  if (Math.abs(parseFloat(currentPPG) - 87.9) < 2) {
    console.log(`✅ Current season PPG (${currentPPG}) matches ESPN (87.9)!`);
    console.log(`   → ESPN is showing CURRENT SEASON games only`);
  } else {
    console.log(`❌ Current season PPG (${currentPPG}) doesn't match ESPN (87.9)`);
    console.log(`   → Difference: ${Math.abs(parseFloat(currentPPG) - 87.9).toFixed(1)} points`);
  }

  if (Math.abs(parseFloat(currentPPG) - 76.6) < 2) {
    console.log(`\n⚠️  User's app value (76.6) is close to current season (${currentPPG})`);
  } else if (Math.abs(76.8 - 76.6) < 0.5) {
    console.log(`\n⚠️  User's app value (76.6) matches API AWAY games average (76.8)!`);
    console.log(`   → BUG: App might be showing away stats instead of all stats`);
  }
}

checkCurrentSeasonOnly().catch(console.error);

