/**
 * Test Data Sources Script
 * 
 * Comprehensive test suite for all potential free sports data API sources
 * Tests each source for data availability, quality, and completeness
 * 
 * Run with: npx tsx scripts/test-data-sources.ts
 */

import * as fs from "fs";
import * as path from "path";
import { SportSRCTester } from "@/lib/test-sources/sportsrc-tester";
import { APISportsTester } from "@/lib/test-sources/apisports-tester";
import { SportmonksTester } from "@/lib/test-sources/sportmonks-tester";
import { EntitySportsTester } from "@/lib/test-sources/entitysports-tester";
import { StatPalTester } from "@/lib/test-sources/statpal-tester";
import { ClearsportsTester } from "@/lib/test-sources/clearsports-tester";
import { SportDBTester } from "@/lib/test-sources/sportdb-tester";
import { BaseSourceTester, SourceTestResult } from "@/lib/test-sources/base-tester";
import { sleep } from "./test-helpers";

// Load test teams
const testTeamsPath = path.join(process.cwd(), "data", "test-teams.json");
const testTeamsData = JSON.parse(fs.readFileSync(testTeamsPath, "utf-8"));
const testTeams = testTeamsData.testTeams.map((t: any) => t.name);

// Ensure test results directory exists
const testResultsDir = path.join(process.cwd(), "data", "test-results");
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true });
}

interface TestSummary {
  source: string;
  totalTests: number;
  successfulTests: number;
  averageResponseTime: number;
  averageQuality: number;
  averageCompleteness: number;
  averageReliability: number;
  overallScore: number;
  dataPointCoverage: Record<string, boolean>;
}

function printHeader(title: string) {
  console.log("\n" + "=".repeat(80));
  console.log(title);
  console.log("=".repeat(80));
}

function printTestResult(result: SourceTestResult) {
  const icon = result.success ? "✓" : "✗";
  const qualityBar = "█".repeat(Math.round(result.dataQuality));
  const completenessBar = "█".repeat(Math.round(result.completeness));
  const reliabilityBar = "█".repeat(Math.round(result.reliability));
  
  console.log(`\n${icon} ${result.testCase}`);
  console.log(`   Source: ${result.source}`);
  console.log(`   Data Point: ${result.dataPoint}`);
  console.log(`   Response Time: ${result.responseTime}ms`);
  console.log(`   Quality: ${result.dataQuality.toFixed(1)}/10 ${qualityBar}`);
  console.log(`   Completeness: ${result.completeness.toFixed(1)}/10 ${completenessBar}`);
  console.log(`   Reliability: ${result.reliability.toFixed(1)}/10 ${reliabilityBar}`);
  
  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.join(", ")}`);
  }
  
  if (result.notes) {
    console.log(`   Notes: ${result.notes}`);
  }
}

function calculateSummary(tester: BaseSourceTester): TestSummary {
  const results = tester.getTestResults();
  const successful = results.filter(r => r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length || 0;
  const avgQuality = results.reduce((sum, r) => sum + r.dataQuality, 0) / results.length || 0;
  const avgCompleteness = results.reduce((sum, r) => sum + r.completeness, 0) / results.length || 0;
  const avgReliability = results.reduce((sum, r) => sum + r.reliability, 0) / results.length || 0;
  const overallScore = tester.calculateOverallScore();
  
  // Data point coverage
  const dataPointCoverage: Record<string, boolean> = {};
  const dataPoints = ["teamStats", "recentGames", "headToHead", "schedules", "liveScores", "teamMetadata", "fourFactors"];
  for (const dp of dataPoints) {
    const dpResults = results.filter(r => r.dataPoint === dp);
    dataPointCoverage[dp] = dpResults.some(r => r.success && r.completeness > 0);
  }
  
  return {
    source: tester.constructor.name.replace("Tester", ""),
    totalTests: results.length,
    successfulTests: successful,
    averageResponseTime: avgResponseTime,
    averageQuality: avgQuality,
    averageCompleteness: avgCompleteness,
    averageReliability: avgReliability,
    overallScore,
    dataPointCoverage,
  };
}

function printSummary(summary: TestSummary) {
  console.log(`\n${"-".repeat(80)}`);
  console.log(`SUMMARY: ${summary.source}`);
  console.log("-".repeat(80));
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Successful: ${summary.successfulTests}/${summary.totalTests} (${((summary.successfulTests / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`Average Response Time: ${summary.averageResponseTime.toFixed(0)}ms`);
  console.log(`Average Quality: ${summary.averageQuality.toFixed(1)}/10`);
  console.log(`Average Completeness: ${summary.averageCompleteness.toFixed(1)}/10`);
  console.log(`Average Reliability: ${summary.averageReliability.toFixed(1)}/10`);
  console.log(`Overall Score: ${summary.overallScore.toFixed(1)}/10`);
  console.log(`\nData Point Coverage:`);
  for (const [dp, covered] of Object.entries(summary.dataPointCoverage)) {
    console.log(`  ${covered ? "✓" : "✗"} ${dp}`);
  }
}

async function testSource(tester: BaseSourceTester, teamName: string): Promise<TestSummary | null> {
  printHeader(`Testing ${tester.constructor.name.replace("Tester", "")}`);
  
  if (!tester.isConfigured()) {
    console.log(`⚠️  ${tester.constructor.name.replace("Tester", "")} is not configured (missing API key)`);
    console.log("   Skipping tests for this source");
    
    // Return empty summary for unconfigured sources
    return {
      source: tester.constructor.name.replace("Tester", ""),
      totalTests: 0,
      successfulTests: 0,
      averageResponseTime: 0,
      averageQuality: 0,
      averageCompleteness: 0,
      averageReliability: 0,
      overallScore: 0,
      dataPointCoverage: {
        teamStats: false,
        recentGames: false,
        headToHead: false,
        schedules: false,
        liveScores: false,
        teamMetadata: false,
        fourFactors: false,
      },
    };
  }
  
  console.log(`Testing with team: ${teamName}`);
  console.log(`API Key: ${(tester as any).getMaskedApiKey?.() || "configured"}`);
  
  // Test all data points
  console.log("\n1. Testing Team Stats...");
  await tester.testTeamStats(teamName);
  await sleep(1000);
  
  console.log("\n2. Testing Recent Games...");
  await tester.testRecentGames(teamName, 5);
  await sleep(1000);
  
  console.log("\n3. Testing Head-to-Head...");
  if (testTeamsData.rivalries?.[0]) {
    const rivalry = testTeamsData.rivalries[0];
    await tester.testHeadToHead(rivalry.team1, rivalry.team2);
  } else {
    await tester.testHeadToHead(testTeams[0], testTeams[1]);
  }
  await sleep(1000);
  
  console.log("\n4. Testing Schedules...");
  await tester.testSchedules();
  await sleep(1000);
  
  console.log("\n5. Testing Live Scores...");
  await tester.testLiveScores();
  await sleep(1000);
  
  console.log("\n6. Testing Team Metadata...");
  await tester.testTeamMetadata();
  await sleep(1000);
  
  console.log("\n7. Testing Four Factors Data...");
  await tester.testFourFactorsData(teamName);
  await sleep(1000);
  
  // Print results
  const results = tester.getTestResults();
  console.log("\n" + "=".repeat(80));
  console.log(`TEST RESULTS FOR ${tester.constructor.name.replace("Tester", "").toUpperCase()}`);
  console.log("=".repeat(80));
  
  for (const result of results) {
    printTestResult(result);
  }
  
  const summary = calculateSummary(tester);
  printSummary(summary);
  
  return summary;
}

async function main() {
  printHeader("FREE SPORTS DATA SOURCES TEST SUITE");
  console.log(`Test Teams: ${testTeams.join(", ")}`);
  console.log(`Test Results Directory: ${testResultsDir}`);
  
  const summaries: TestSummary[] = [];
  const allResults: SourceTestResult[] = [];
  
  // Initialize testers
  const testers: BaseSourceTester[] = [
    new SportSRCTester(),
    new APISportsTester(),
    new SportmonksTester(),
    new EntitySportsTester(),
    new StatPalTester(),
    new ClearsportsTester(),
    new SportDBTester(),
  ];
  
  // Test each source
  const testTeam = testTeams[0]; // Use first test team
  
  for (const tester of testers) {
    try {
      const summary = await testSource(tester, testTeam);
      if (summary) {
        summaries.push(summary);
        allResults.push(...tester.getTestResults());
      }
      
      // Wait between sources to avoid rate limiting
      await sleep(2000);
    } catch (error) {
      console.error(`\n❌ Error testing ${tester.constructor.name}:`, error);
    }
  }
  
  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsFile = path.join(testResultsDir, `results-${timestamp}.json`);
  fs.writeFileSync(
    resultsFile,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      testTeam,
      summaries,
      results: allResults,
    }, null, 2)
  );
  console.log(`\n✓ Results saved to: ${resultsFile}`);
  
  // Print comparison matrix
  printHeader("COMPARISON MATRIX");
  
  console.log("\nData Point Coverage:");
  console.log("Source".padEnd(20) + "Team Stats".padEnd(12) + "Games".padEnd(12) + "H2H".padEnd(12) + "Schedule".padEnd(12) + "Live".padEnd(12) + "Metadata".padEnd(12) + "4 Factors".padEnd(12) + "Score");
  console.log("-".repeat(100));
  
  for (const summary of summaries) {
    // Safely access dataPointCoverage with fallback
    const coverage = summary.dataPointCoverage || {};
    const coverageArray = [
      coverage.teamStats ? "✓" : "✗",
      coverage.recentGames ? "✓" : "✗",
      coverage.headToHead ? "✓" : "✗",
      coverage.schedules ? "✓" : "✗",
      coverage.liveScores ? "✓" : "✗",
      coverage.teamMetadata ? "✓" : "✗",
      coverage.fourFactors ? "✓" : "✗",
    ];
    
    console.log(
      summary.source.padEnd(20) +
      coverageArray[0].padEnd(12) +
      coverageArray[1].padEnd(12) +
      coverageArray[2].padEnd(12) +
      coverageArray[3].padEnd(12) +
      coverageArray[4].padEnd(12) +
      coverageArray[5].padEnd(12) +
      coverageArray[6].padEnd(12) +
      (summary.overallScore || 0).toFixed(1)
    );
  }
  
  // Print recommendations
  printHeader("RECOMMENDATIONS");
  
  if (summaries.length === 0) {
    console.log("\n⚠️  No test results available. Configure API keys and run tests again.");
    return;
  }
  
  const sortedSummaries = summaries.filter(s => s.totalTests > 0).sort((a, b) => b.overallScore - a.overallScore);
  
  if (sortedSummaries.length > 0) {
    console.log("\nTop Sources by Overall Score:");
    for (let i = 0; i < Math.min(3, sortedSummaries.length); i++) {
      const s = sortedSummaries[i];
      console.log(`${i + 1}. ${s.source}: ${s.overallScore.toFixed(1)}/10`);
    }
  }
  
  console.log("\nBest Source for Each Data Point:");
  const dataPoints = ["teamStats", "recentGames", "headToHead", "schedules", "liveScores", "teamMetadata", "fourFactors"];
  for (const dp of dataPoints) {
    const best = summaries
      .filter(s => s.dataPointCoverage && s.dataPointCoverage[dp] && s.totalTests > 0)
      .sort((a, b) => b.overallScore - a.overallScore)[0];
    
    if (best) {
      console.log(`  ${dp}: ${best.source} (${best.overallScore.toFixed(1)}/10)`);
    } else {
      console.log(`  ${dp}: No source available`);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("Testing complete! Review results above and check JSON file for detailed data.");
  console.log("=".repeat(80));
}

main().catch(console.error);
