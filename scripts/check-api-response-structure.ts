/**
 * Check exact API response structure for statistics
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

async function checkResponseStructure() {
  const apiKey = process.env.STATS_API_KEY;
  
  const searchRes = await fetch(`${API_URL}/teams?search=Wisconsin`, {
    headers: { "x-apisports-key": apiKey },
  });
  const searchData = await searchRes.json();
  const wisconsin = searchData.response?.find((t: any) => t.id === 2214);

  const statsRes = await fetch(
    `${API_URL}/statistics?team=${wisconsin.id}&league=${NCAA_LEAGUE_ID}&season=2024-2025`,
    { headers: { "x-apisports-key": apiKey } }
  );
  const statsData = await statsRes.json();
  
  const r = statsData.response;
  
  console.log("📊 CHECKING API RESPONSE STRUCTURE");
  console.log("═══════════════════════════════════════\n");
  
  console.log("Points structure:");
  console.log(`  r.points?.for?.average?.all = "${r.points?.for?.average?.all}"`);
  console.log(`  r.points?.for?.average?.home = "${r.points?.for?.average?.home}"`);
  console.log(`  r.points?.for?.average?.away = "${r.points?.for?.average?.away}"\n`);
  
  console.log("Shooting stats:");
  console.log(`  r.shots?.fg_percentage?.all = "${r.shots?.fg_percentage?.all}"`);
  console.log(`  r.shots?.three_points_percentage?.all = "${r.shots?.three_points_percentage?.all}"`);
  console.log(`  r.shots?.free_throws_percentage?.all = "${r.shots?.free_throws_percentage?.all}"\n`);
  
  console.log("Other stats:");
  console.log(`  r.rebounds?.average?.all = "${r.rebounds?.average?.all}"`);
  console.log(`  r.assists?.average?.all = "${r.assists?.average?.all}"`);
  console.log(`  r.turnovers?.average?.all = "${r.turnovers?.average?.all}"`);
  console.log(`  r.steals?.average?.all = "${r.steals?.average?.all}"`);
  console.log(`  r.blocks?.average?.all = "${r.blocks?.average?.all}"`);
  console.log(`  r.fouls?.average?.all = "${r.fouls?.average?.all}"\n`);
  
  console.log("\n🐛 BUG CHECK:");
  console.log("═══════════════════════════════════════");
  console.log("Our code tries to access:");
  console.log(`  r.fieldGoalsPercentage = ${r.fieldGoalsPercentage} ❌`);
  console.log(`  r.threePointsPercentage = ${r.threePointsPercentage} ❌`);
  console.log(`  r.freeThrowsPercentage = ${r.freeThrowsPercentage} ❌\n`);
  
  console.log("Should be:");
  console.log(`  r.shots.fg_percentage.all = "${r.shots?.fg_percentage?.all}" ✅`);
  console.log(`  r.shots.three_points_percentage.all = "${r.shots?.three_points_percentage?.all}" ✅`);
  console.log(`  r.shots.free_throws_percentage.all = "${r.shots?.free_throws_percentage?.all}" ✅`);
}

checkResponseStructure().catch(console.error);

