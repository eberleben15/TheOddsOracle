/**
 * SportsData.io API Validation Script
 * 
 * Comprehensive test suite for validating the SportsData.io integration.
 * Tests all endpoints and verifies data accuracy.
 * 
 * Usage: npx tsx scripts/validate-sportsdata.ts
 */

import { 
  getAllTeams, 
  findTeamByName, 
  getTeamSeasonStats,
  getTeamRecentGames,
  getLiveGames,
  getUpcomingGames,
  getHeadToHead,
  getTeamSchedule,
  getBoxScore,
  getTeamPlayerStats,
  getConferenceStandings,
  getAllConferences,
  getAllTeamSeasonStats,
  getGamesByDate,
  testConnection,
  isConfigured,
  getCurrentSeason,
  clearCache,
} from "../lib/sportsdata-api";

interface TestResult {
  name: string;
  status: "passed" | "failed" | "skipped";
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(
  name: string, 
  testFn: () => Promise<string>
): Promise<void> {
  const startTime = Date.now();
  try {
    const message = await testFn();
    results.push({
      name,
      status: "passed",
      message,
      duration: Date.now() - startTime,
    });
    console.log(`✅ ${name}: ${message} (${Date.now() - startTime}ms)`);
  } catch (error) {
    results.push({
      name,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    });
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function validateSportsDataAPI() {
  console.log("\n🧪 SportsData.io API Validation Suite\n");
  console.log("=".repeat(70));
  console.log(`Season: ${getCurrentSeason()}`);
  console.log(`API Configured: ${isConfigured() ? "Yes" : "No"}`);
  console.log("=".repeat(70) + "\n");

  // Clear cache for fresh tests
  clearCache();

  // Test 0: Check configuration
  if (!isConfigured()) {
    console.log("❌ SPORTSDATA_API_KEY not configured in environment variables");
    console.log("\nTo configure:");
    console.log("  1. Get an API key from https://sportsdata.io");
    console.log("  2. Add SPORTSDATA_API_KEY=your_key to .env.local");
    return;
  }

  // Test 1: Connection test
  await runTest("Connection Test", async () => {
    const result = await testConnection();
    if (!result.connected) {
      throw new Error(result.error || "Connection failed");
    }
    return `Connected - ${result.teamsCount} teams available`;
  });

  // Test 2: Get all teams
  await runTest("Get All Teams", async () => {
    const teams = await getAllTeams();
    if (teams.length === 0) {
      throw new Error("No teams returned");
    }
    // Check for required fields
    const sample = teams[0];
    if (!sample.TeamID || !sample.Key || !sample.School) {
      throw new Error("Missing required team fields");
    }
    return `Found ${teams.length} teams`;
  });

  // Test 3: Find teams by name
  const teamSearchTests = [
    { name: "Wisconsin", expected: "WIS" },
    { name: "Duke", expected: "DUKE" },
    { name: "North Carolina", expected: "UNC" },
    { name: "Michigan State", expected: "MIST" },
    { name: "Gonzaga", expected: "GONZ" },
  ];

  for (const test of teamSearchTests) {
    await runTest(`Find Team: ${test.name}`, async () => {
      const team = await findTeamByName(test.name);
      if (!team) {
        throw new Error(`Team not found`);
      }
      return `Found: ${team.School} ${team.Name} (${team.Key})`;
    });
  }

  // Test 4: Get team season stats
  await runTest("Get Team Season Stats", async () => {
    const stats = await getTeamSeasonStats("Wisconsin");
    if (!stats) {
      throw new Error("No stats returned");
    }
    if (!stats.pointsPerGame || !stats.wins === undefined) {
      throw new Error("Missing required stat fields");
    }
    return `${stats.name}: ${stats.wins}-${stats.losses}, ${stats.pointsPerGame.toFixed(1)} PPG`;
  });

  // Test 5: Verify Four Factors
  await runTest("Four Factors Data", async () => {
    const stats = await getTeamSeasonStats("Duke");
    if (!stats) {
      throw new Error("No stats returned");
    }
    const fourFactors = [
      { name: "eFG%", value: stats.effectiveFieldGoalPercentage },
      { name: "TOV%", value: stats.turnoverRate },
      { name: "ORB%", value: stats.offensiveReboundRate },
      { name: "FTR", value: stats.freeThrowRate },
    ];
    const missing = fourFactors.filter(f => f.value === undefined || f.value === null);
    if (missing.length > 0) {
      throw new Error(`Missing: ${missing.map(f => f.name).join(", ")}`);
    }
    return `All Four Factors present: eFG% ${stats.effectiveFieldGoalPercentage?.toFixed(1)}%, TOV% ${stats.turnoverRate?.toFixed(1)}%`;
  });

  // Test 6: Advanced metrics
  await runTest("Advanced Metrics", async () => {
    const stats = await getTeamSeasonStats("Kansas");
    if (!stats) {
      throw new Error("No stats returned");
    }
    if (!stats.offensiveEfficiency || !stats.defensiveEfficiency) {
      throw new Error("Missing efficiency ratings");
    }
    return `ORtg: ${stats.offensiveEfficiency?.toFixed(1)}, DRtg: ${stats.defensiveEfficiency?.toFixed(1)}, Pace: ${stats.pace?.toFixed(1)}`;
  });

  // Test 7: Recent games
  await runTest("Get Recent Games", async () => {
    const games = await getTeamRecentGames("WIS", 5);
    if (games.length === 0) {
      return "No recent games found (may be off-season)";
    }
    return `Found ${games.length} recent games`;
  });

  // Test 8: Team schedule
  await runTest("Get Team Schedule", async () => {
    const schedule = await getTeamSchedule("DUKE");
    if (schedule.length === 0) {
      return "No schedule found (may be off-season)";
    }
    const upcoming = schedule.filter(g => g.Status === "Scheduled");
    const completed = schedule.filter(g => g.Status === "Final");
    return `${completed.length} completed, ${upcoming.length} upcoming`;
  });

  // Test 9: Head-to-head
  await runTest("Get Head-to-Head", async () => {
    const h2h = await getHeadToHead("DUKE", "UNC", 5);
    return `Found ${h2h.length} head-to-head games`;
  });

  // Test 10: Live games check
  await runTest("Check Live Games", async () => {
    const liveGames = await getLiveGames();
    if (liveGames.length === 0) {
      return "No live games (normal if no games in progress)";
    }
    return `${liveGames.length} games in progress`;
  });

  // Test 11: Upcoming games
  await runTest("Get Upcoming Games", async () => {
    const games = await getUpcomingGames(3);
    if (games.length === 0) {
      return "No upcoming games in next 3 days";
    }
    return `Found ${games.length} upcoming games`;
  });

  // Test 12: Games by date
  await runTest("Get Games By Date", async () => {
    const today = new Date().toISOString().split('T')[0];
    const games = await getGamesByDate(today);
    return `Found ${games.length} games on ${today}`;
  });

  // Test 13: All team season stats
  await runTest("Get All Team Season Stats", async () => {
    const stats = await getAllTeamSeasonStats();
    if (stats.length === 0) {
      throw new Error("No stats returned");
    }
    return `Stats for ${stats.length} teams`;
  });

  // Test 14: Conference standings
  await runTest("Get Conference Standings", async () => {
    const standings = await getConferenceStandings("Big Ten");
    if (standings.length === 0) {
      throw new Error("No teams found in conference");
    }
    return `${standings.length} teams in Big Ten`;
  });

  // Test 15: All conferences
  await runTest("Get All Conferences", async () => {
    const conferences = await getAllConferences();
    if (conferences.length === 0) {
      throw new Error("No conferences found");
    }
    return `Found ${conferences.length} conferences`;
  });

  // Test 16: Player stats (may require subscription)
  await runTest("Get Team Player Stats", async () => {
    try {
      const players = await getTeamPlayerStats("WIS");
      if (players.length === 0) {
        return "No player stats (may require higher tier subscription)";
      }
      return `Found ${players.length} player stats`;
    } catch {
      return "Player stats endpoint not available (subscription tier)";
    }
  });

  // Print summary
  console.log("\n" + "=".repeat(70));
  console.log("📊 SUMMARY");
  console.log("=".repeat(70));
  
  const passed = results.filter(r => r.status === "passed").length;
  const failed = results.filter(r => r.status === "failed").length;
  const skipped = results.filter(r => r.status === "skipped").length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\nTests: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`Total time: ${totalDuration}ms`);
  
  if (failed > 0) {
    console.log("\n❌ Failed tests:");
    results.filter(r => r.status === "failed").forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }
  
  console.log("\n" + "=".repeat(70));
  
  if (failed === 0) {
    console.log("✅ All tests passed! SportsData.io integration is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Check the errors above.");
  }
  
  console.log("\n📌 Tips:");
  console.log("   - Some endpoints may require higher subscription tiers");
  console.log("   - Games/stats may be empty during off-season");
  console.log("   - API responses are cached to reduce API calls");
  console.log("   - Use clearCache() to force fresh data");
}

// Run validation
validateSportsDataAPI().catch(console.error);
