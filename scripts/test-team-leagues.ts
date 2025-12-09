/**
 * Test script to find which league a team belongs to
 */

import * as dotenv from "dotenv";
import { existsSync } from "fs";

const envPaths = [".env.local", ".env", ".env.development"];
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

const API_BASKETBALL_DIRECT_URL = "https://v1.basketball.api-sports.io";

async function testTeamLeagues(teamId: number) {
  const apiKey = process.env.STATS_API_KEY;
  
  if (!apiKey) {
    console.error("STATS_API_KEY is not set");
    process.exit(1);
  }

  const headers = { "x-apisports-key": apiKey };

  console.log(`\n🔍 Testing team ${teamId} with different leagues and seasons\n`);

  // From the test, we saw head-to-head found games with league 116 (NCAA)
  // Let's test different leagues
  const leagues = [12, 116]; // 12 might be wrong, 116 is NCAA
  const seasons = [2025, 2024, 2023, 2022, 2021];

  for (const league of leagues) {
    console.log(`\n📊 Testing League ${league}:`);
    for (const season of seasons) {
      const url = `${API_BASKETBALL_DIRECT_URL}/games?team=${teamId}&league=${league}&season=${season}`;
      try {
        const response = await fetch(url, { headers });
        if (response.ok) {
          const data = await response.json();
          if (data.response && data.response.length > 0) {
            console.log(`  ✓ Season ${season}: ${data.results} games found`);
            if (data.response[0]?.league) {
              console.log(`    League info:`, data.response[0].league);
            }
          } else {
            console.log(`  ✗ Season ${season}: No games`);
          }
        }
      } catch (error) {
        console.log(`  ❌ Season ${season}: Error`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Also test without league
  console.log(`\n📊 Testing without league parameter:`);
  for (const season of seasons) {
    const url = `${API_BASKETBALL_DIRECT_URL}/games?team=${teamId}&season=${season}`;
    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        const data = await response.json();
        if (data.response && data.response.length > 0) {
          console.log(`  ✓ Season ${season}: ${data.results} games found`);
          // Check what leagues these games are in
          const leagues = new Set(data.response.map((g: any) => g.league?.id || g.league?.name));
          console.log(`    Leagues: ${Array.from(leagues).join(", ")}`);
        } else {
          console.log(`  ✗ Season ${season}: No games`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Season ${season}: Error`);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

const teamId = parseInt(process.argv[2]) || 1994; // Default to Michigan
testTeamLeagues(teamId).catch(console.error);

