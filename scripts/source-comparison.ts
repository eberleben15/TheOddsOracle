/**
 * Source Comparison Script
 * 
 * Side-by-side comparison of responses from different sources
 * Helps identify data quality differences and best source per data point
 * 
 * Run with: npx tsx scripts/source-comparison.ts [team-name]
 */

import * as fs from "fs";
import * as path from "path";
import { SportSRCTester } from "@/lib/test-sources/sportsrc-tester";
import { APISportsTester } from "@/lib/test-sources/apisports-tester";
import { SportmonksTester } from "@/lib/test-sources/sportmonks-tester";
import { BaseSourceTester } from "@/lib/test-sources/base-tester";
import { sleep } from "./test-helpers";

interface ComparisonResult {
  dataPoint: string;
  teamName: string;
  sources: {
    source: string;
    success: boolean;
    responseTime: number;
    dataSample: any;
    quality: number;
    completeness: number;
    errors: string[];
  }[];
}

function printComparison(comparison: ComparisonResult) {
  console.log("\n" + "=".repeat(100));
  console.log(`COMPARISON: ${comparison.dataPoint} for ${comparison.teamName}`);
  console.log("=".repeat(100));
  
  console.log("\nSource".padEnd(20) + "Success".padEnd(12) + "Time".padEnd(12) + "Quality".padEnd(12) + "Complete".padEnd(12) + "Sample Data");
  console.log("-".repeat(100));
  
  for (const source of comparison.sources) {
    const successIcon = source.success ? "✓" : "✗";
    const sample = JSON.stringify(source.dataSample || {}).substring(0, 50) + "...";
    
    console.log(
      source.source.padEnd(20) +
      `${successIcon} ${source.success}`.padEnd(12) +
      `${source.responseTime}ms`.padEnd(12) +
      `${source.quality.toFixed(1)}/10`.padEnd(12) +
      `${source.completeness.toFixed(1)}/10`.padEnd(12) +
      sample
    );
    
    if (source.errors.length > 0) {
      console.log(`  Errors: ${source.errors.join(", ")}`);
    }
  }
  
  // Find best source
  const best = comparison.sources
    .filter(s => s.success)
    .sort((a, b) => (b.quality + b.completeness) - (a.quality + a.completeness))[0];
  
  if (best) {
    console.log(`\n🏆 Best Source: ${best.source} (Quality: ${best.quality.toFixed(1)}, Completeness: ${best.completeness.toFixed(1)})`);
  }
}

async function compareDataPoint(
  testers: BaseSourceTester[],
  dataPoint: string,
  teamName: string,
  team2?: string
): Promise<ComparisonResult> {
  const sources: ComparisonResult["sources"] = [];
  
  for (const tester of testers) {
    if (!tester.isConfigured()) {
      sources.push({
        source: tester.constructor.name.replace("Tester", ""),
        success: false,
        responseTime: 0,
        dataSample: null,
        quality: 0,
        completeness: 0,
        errors: ["Not configured"],
      });
      continue;
    }
    
    try {
      let result;
      
      switch (dataPoint) {
        case "teamStats":
          result = await tester.testTeamStats(teamName);
          break;
        case "recentGames":
          result = await tester.testRecentGames(teamName, 5);
          break;
        case "headToHead":
          if (team2) {
            result = await tester.testHeadToHead(teamName, team2);
          } else {
            result = await tester.testHeadToHead(teamName, "Duke Blue Devils");
          }
          break;
        case "schedules":
          result = await tester.testSchedules();
          break;
        case "liveScores":
          result = await tester.testLiveScores();
          break;
        case "teamMetadata":
          result = await tester.testTeamMetadata();
          break;
        case "fourFactors":
          result = await tester.testFourFactorsData(teamName);
          break;
        default:
          continue;
      }
      
      sources.push({
        source: tester.constructor.name.replace("Tester", ""),
        success: result.success,
        responseTime: result.responseTime,
        dataSample: result.sampleData,
        quality: result.dataQuality,
        completeness: result.completeness,
        errors: result.errors,
      });
      
      await sleep(1000); // Rate limit protection
    } catch (error) {
      sources.push({
        source: tester.constructor.name.replace("Tester", ""),
        success: false,
        responseTime: 0,
        dataSample: null,
        quality: 0,
        completeness: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }
  
  return {
    dataPoint,
    teamName,
    sources,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const teamName = args[0] || "Duke Blue Devils";
  
  console.log("\n" + "=".repeat(100));
  console.log("SOURCE COMPARISON TOOL");
  console.log("=".repeat(100));
  console.log(`Comparing sources for: ${teamName}`);
  
  const testers: BaseSourceTester[] = [
    new SportSRCTester(),
    new APISportsTester(),
    new SportmonksTester(),
  ];
  
  const dataPoints = ["teamStats", "recentGames", "schedules", "liveScores", "teamMetadata", "fourFactors"];
  
  const comparisons: ComparisonResult[] = [];
  
  for (const dp of dataPoints) {
    console.log(`\n📊 Comparing ${dp}...`);
    const comparison = await compareDataPoint(testers, dp, teamName);
    comparisons.push(comparison);
    printComparison(comparison);
    await sleep(2000);
  }
  
  // Summary
  console.log("\n" + "=".repeat(100));
  console.log("SUMMARY");
  console.log("=".repeat(100));
  
  console.log("\nBest Source per Data Point:");
  for (const comp of comparisons) {
    const best = comp.sources
      .filter(s => s.success)
      .sort((a, b) => (b.quality + b.completeness) - (a.quality + a.completeness))[0];
    
    if (best) {
      console.log(`  ${comp.dataPoint}: ${best.source} (${(best.quality + best.completeness).toFixed(1)}/20)`);
    } else {
      console.log(`  ${comp.dataPoint}: No source available`);
    }
  }
  
  // Save comparison
  const comparisonFile = path.join(process.cwd(), "data", "test-results", `comparison-${Date.now()}.json`);
  fs.writeFileSync(
    comparisonFile,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      teamName,
      comparisons,
    }, null, 2)
  );
  
  console.log(`\n✓ Comparison saved to: ${comparisonFile}`);
}

main().catch(console.error);
