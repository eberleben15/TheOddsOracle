/**
 * Verify we're only counting REAL games that have actually been played
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

async function verifyRealGamesOnly() {
  const apiKey = process.env.STATS_API_KEY;
  if (!apiKey) {
    console.error("❌ STATS_API_KEY not set");
    process.exit(1);
  }

  console.log("🔍 VERIFYING REAL vs FUTURE GAMES");
  console.log("═══════════════════════════════════════\n");
  console.log(`Today's Date: ${new Date().toISOString().split('T')[0]}\n`);

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

  const today = new Date();
  const realGames = finishedGames?.filter((g: any) => new Date(g.date) <= today);
  const futureGames = finishedGames?.filter((g: any) => new Date(g.date) > today);

  console.log(`📅 REAL GAMES (on or before ${today.toISOString().split('T')[0]}):`);
  console.log(`   Count: ${realGames?.length || 0} games\n`);

  let realTotal = 0;
  realGames?.forEach((g: any) => {
    const isHome = g.teams.home.id === wisconsin.id;
    const wisScore = isHome ? g.scores.home.total : g.scores.away.total;
    realTotal += wisScore;
    console.log(`   ${g.date.split('T')[0]} | ${wisScore} pts`);
  });

  const realPPG = realGames.length > 0 ? (realTotal / realGames.length).toFixed(1) : 0;

  console.log(`\n🔮 FUTURE GAMES (after today - SHOULD NOT BE COUNTED!):`);
  console.log(`   Count: ${futureGames?.length || 0} games\n`);

  let futureTotal = 0;
  futureGames?.slice(0, 5).forEach((g: any) => {
    const isHome = g.teams.home.id === wisconsin.id;
    const wisScore = isHome ? g.scores.home.total : g.scores.away.total;
    futureTotal += wisScore;
    console.log(`   ${g.date.split('T')[0]} | ${wisScore} pts (⚠️  FUTURE!)`);
  });

  if (futureGames.length > 5) {
    console.log(`   ... and ${futureGames.length - 5} more future games`);
  }

  console.log(`\n📊 FINAL COMPARISON:`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Real games only (correct):  ${realPPG} PPG (${realGames.length} games)`);
  console.log(`All games (wrong):          80.1 PPG (37 games - includes future!)`);
  console.log(`ESPN/Sports Reference:      87.9 PPG (reported by user)`);
  console.log(`\n✅ Real games PPG (${realPPG}) should match ESPN (87.9)!`);
}

verifyRealGamesOnly().catch(console.error);

