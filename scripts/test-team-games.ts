/**
 * Test script to check if a team ID returns games from the API
 * Usage: npx tsx scripts/test-team-games.ts <teamId> [teamName]
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

async function testTeamGames(teamId: number, teamName?: string) {
  const apiKey = process.env.STATS_API_KEY;
  
  if (!apiKey) {
    console.error("STATS_API_KEY is not set");
    process.exit(1);
  }

  console.log(`\n🔍 Testing team ID ${teamId}${teamName ? ` (${teamName})` : ""}\n`);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const season = currentMonth >= 10 || currentMonth <= 3 
    ? (currentMonth >= 10 ? currentYear : currentYear - 1)
    : currentYear;

  console.log(`Current date: ${new Date().toISOString()}`);
  console.log(`Using season: ${season}\n`);

  // Test 1: Get team info
  console.log("1️⃣ Testing /teams endpoint:");
  try {
    const teamUrl = `${API_BASKETBALL_DIRECT_URL}/teams?id=${teamId}`;
    const teamResponse = await fetch(teamUrl, {
      headers: { "x-apisports-key": apiKey as string },
    });
    
    if (teamResponse.ok) {
      const teamData = await teamResponse.json();
      console.log(`   ✓ Team found:`, JSON.stringify(teamData, null, 2));
    } else {
      console.log(`   ✗ Error ${teamResponse.status}: ${await teamResponse.text()}`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 2: Games with league=12 and season
  console.log("\n2️⃣ Testing /games endpoint with league=12:");
  try {
    const url = `${API_BASKETBALL_DIRECT_URL}/games?team=${teamId}&league=12&season=${season}`;
    console.log(`   URL: ${url}`);
    const response = await fetch(url, {
      headers: { "x-apisports-key": apiKey as string },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✓ Response:`, JSON.stringify({
        results: data.results,
        responseLength: data.response?.length || 0,
        errors: data.errors,
        firstGame: data.response?.[0] || null,
      }, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`   ✗ Error ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 3: Games without league
  console.log("\n3️⃣ Testing /games endpoint without league:");
  try {
    const url = `${API_BASKETBALL_DIRECT_URL}/games?team=${teamId}&season=${season}`;
    console.log(`   URL: ${url}`);
    const response = await fetch(url, {
      headers: { "x-apisports-key": apiKey as string },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✓ Response:`, JSON.stringify({
        results: data.results,
        responseLength: data.response?.length || 0,
        errors: data.errors,
        firstGame: data.response?.[0] || null,
      }, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`   ✗ Error ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 4: Games with date range (last 90 days)
  console.log("\n4️⃣ Testing /games endpoint with date range:");
  try {
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);
    const dateFrom = ninetyDaysAgo.toISOString().split('T')[0];
    const url = `${API_BASKETBALL_DIRECT_URL}/games?team=${teamId}&date=${dateFrom}`;
    console.log(`   URL: ${url}`);
    const response = await fetch(url, {
      headers: { "x-apisports-key": apiKey as string },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✓ Response:`, JSON.stringify({
        results: data.results,
        responseLength: data.response?.length || 0,
        errors: data.errors,
        firstGame: data.response?.[0] || null,
      }, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`   ✗ Error ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }

  // Test 5: Try previous season
  console.log("\n5️⃣ Testing /games endpoint with previous season:");
  try {
    const prevSeason = season - 1;
    const url = `${API_BASKETBALL_DIRECT_URL}/games?team=${teamId}&league=12&season=${prevSeason}`;
    console.log(`   URL: ${url}`);
    const response = await fetch(url, {
      headers: { "x-apisports-key": apiKey as string },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✓ Response:`, JSON.stringify({
        results: data.results,
        responseLength: data.response?.length || 0,
        errors: data.errors,
        firstGame: data.response?.[0] || null,
      }, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`   ✗ Error ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ✗ Error: ${error}`);
  }
}

const teamId = parseInt(process.argv[2]);
const teamName = process.argv[3];

if (!teamId || isNaN(teamId)) {
  console.error("Usage: npx tsx scripts/test-team-games.ts <teamId> [teamName]");
  console.error("Example: npx tsx scripts/test-team-games.ts 1994 \"Michigan\"");
  process.exit(1);
}

testTeamGames(teamId, teamName).catch(console.error);

