/**
 * Comprehensive test script for API-Sports.io Basketball API endpoints
 * Tests all endpoints we use to ensure they're working correctly
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

async function testEndpoint(name: string, url: string, headers: Record<string, string>) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`Testing: ${name}`);
  console.log(`URL: ${url}`);
  console.log(`${"=".repeat(80)}`);
  
  try {
    const response = await fetch(url, { headers });
    const status = response.status;
    const statusText = response.statusText;
    
    console.log(`Status: ${status} ${statusText}`);
    
    const responseText = await response.text();
    let data: any = null;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.log(`Response (not JSON): ${responseText.substring(0, 500)}`);
      return { success: false, status, error: "Not JSON" };
    }
    
    console.log(`Response structure:`, {
      get: data.get,
      parameters: data.parameters,
      errors: data.errors,
      results: data.results,
      responseLength: data.response?.length || 0,
      paging: data.paging,
    });
    
    if (data.errors && Object.keys(data.errors).length > 0) {
      console.log(`❌ Errors:`, JSON.stringify(data.errors, null, 2));
    }
    
    if (data.response && Array.isArray(data.response) && data.response.length > 0) {
      console.log(`✓ Found ${data.response.length} results`);
      console.log(`First result:`, JSON.stringify(data.response[0], null, 2));
    } else if (data.response && !Array.isArray(data.response)) {
      console.log(`Response (object):`, JSON.stringify(data.response, null, 2));
    } else {
      console.log(`⚠ No results in response`);
    }
    
    return {
      success: status === 200 && !data.errors,
      status,
      data,
      hasResults: data.response && (Array.isArray(data.response) ? data.response.length > 0 : true),
    };
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function runTests() {
  const apiKey = process.env.STATS_API_KEY;
  
  if (!apiKey) {
    console.error("❌ STATS_API_KEY is not set");
    process.exit(1);
  }

  const headers = {
    "x-apisports-key": apiKey,
  };

  console.log(`\n🔍 Testing API-Sports.io Basketball API Endpoints`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Base URL: ${API_BASKETBALL_DIRECT_URL}`);

  const results: Record<string, any> = {};

  // Test 1: Get team by ID (Michigan = 1994)
  results.teamById = await testEndpoint(
    "Get Team by ID (Michigan = 1994)",
    `${API_BASKETBALL_DIRECT_URL}/teams?id=1994`,
    headers
  );
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Search teams by name
  results.searchTeams = await testEndpoint(
    "Search Teams (Michigan)",
    `${API_BASKETBALL_DIRECT_URL}/teams?search=Michigan`,
    headers
  );
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Get games by team and date (today)
  const today = new Date().toISOString().split('T')[0];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const dateFrom = ninetyDaysAgo.toISOString().split('T')[0];
  
  results.gamesByDate = await testEndpoint(
    `Get Games by Team and Date (team=1994, date=${dateFrom})`,
    `${API_BASKETBALL_DIRECT_URL}/games?team=1994&date=${dateFrom}`,
    headers
  );
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Get games by team and season (2024)
  results.gamesBySeason = await testEndpoint(
    "Get Games by Team and Season (team=1994, league=12, season=2024)",
    `${API_BASKETBALL_DIRECT_URL}/games?team=1994&league=12&season=2024`,
    headers
  );
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 5: Get games by team and season (2025)
  results.gamesBySeason2025 = await testEndpoint(
    "Get Games by Team and Season (team=1994, league=12, season=2025)",
    `${API_BASKETBALL_DIRECT_URL}/games?team=1994&league=12&season=2025`,
    headers
  );
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 6: Get games by team only (no filters)
  results.gamesByTeamOnly = await testEndpoint(
    "Get Games by Team Only (team=1994)",
    `${API_BASKETBALL_DIRECT_URL}/games?team=1994`,
    headers
  );
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 7: Get games with date range (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateFrom30 = thirtyDaysAgo.toISOString().split('T')[0];
  
  results.gamesLast30Days = await testEndpoint(
    `Get Games Last 30 Days (team=1994, date=${dateFrom30})`,
    `${API_BASKETBALL_DIRECT_URL}/games?team=1994&date=${dateFrom30}`,
    headers
  );
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 8: Head-to-head games
  results.headToHead = await testEndpoint(
    "Head-to-Head Games (team1=1994, team2=2188)",
    `${API_BASKETBALL_DIRECT_URL}/games?h2h=1994-2188`,
    headers
  );
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 9: Head-to-head with season
  results.headToHeadSeason = await testEndpoint(
    "Head-to-Head with Season (h2h=1994-2188, league=12, season=2024)",
    `${API_BASKETBALL_DIRECT_URL}/games?h2h=1994-2188&league=12&season=2024`,
    headers
  );
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Summary
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📊 TEST SUMMARY`);
  console.log(`${"=".repeat(80)}`);
  
  Object.entries(results).forEach(([key, result]) => {
    const icon = result.success && result.hasResults ? "✓" : result.success ? "⚠" : "✗";
    console.log(`${icon} ${key}: ${result.success ? "Success" : "Failed"} ${result.hasResults ? "(has results)" : "(no results)"}`);
    if (result.data?.errors) {
      console.log(`   Errors: ${JSON.stringify(result.data.errors)}`);
    }
  });

  const successful = Object.values(results).filter(r => r.success && r.hasResults).length;
  const total = Object.keys(results).length;
  
  console.log(`\n✅ Successful with results: ${successful}/${total}`);
  
  if (successful === 0) {
    console.log(`\n❌ No endpoints returned results. Check:`);
    console.log(`   1. API key is correct`);
    console.log(`   2. Subscription level has access to these endpoints`);
    console.log(`   3. Team IDs are correct (1994 = Michigan)`);
    console.log(`   4. Date/season parameters are valid`);
  }
}

runTests().catch(console.error);

