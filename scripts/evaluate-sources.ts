/**
 * Evaluate Sources Script
 * 
 * Scores and evaluates all tested sources based on test results
 * Generates comparison matrix and recommendation report
 * 
 * Run with: npx tsx scripts/evaluate-sources.ts [results-file]
 */

import * as fs from "fs";
import * as path from "path";
import { SourceTestResult } from "@/lib/test-sources/base-tester";

interface SourceEvaluation {
  source: string;
  overallScore: number;
  scores: {
    completeness: number;
    quality: number;
    reliability: number;
    performance: number;
    easeOfIntegration: number;
    legalRisk: number;
  };
  dataPointCoverage: Record<string, {
    available: boolean;
    quality: number;
    notes: string;
  }>;
  recommendations: string[];
  warnings: string[];
  testResults: SourceTestResult[];
}

interface EvaluationWeights {
  completeness: number;
  quality: number;
  reliability: number;
  performance: number;
  easeOfIntegration: number;
  legalRisk: number;
}

const DEFAULT_WEIGHTS: EvaluationWeights = {
  completeness: 0.25,
  quality: 0.25,
  reliability: 0.20,
  performance: 0.15,
  easeOfIntegration: 0.10,
  legalRisk: 0.05,
};

function findLatestResultsFile(): string | null {
  const testResultsDir = path.join(process.cwd(), "data", "test-results");
  if (!fs.existsSync(testResultsDir)) {
    return null;
  }
  
  const files = fs.readdirSync(testResultsDir)
    .filter(f => f.startsWith("results-") && f.endsWith(".json"))
    .map(f => ({
      name: f,
      path: path.join(testResultsDir, f),
      mtime: fs.statSync(path.join(testResultsDir, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  
  return files.length > 0 ? files[0].path : null;
}

function calculatePerformanceScore(results: SourceTestResult[]): number {
  if (results.length === 0) return 0;
  
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  // Score based on response time: <500ms = 10, <1000ms = 8, <2000ms = 6, <5000ms = 4, else = 2
  if (avgResponseTime < 500) return 10;
  if (avgResponseTime < 1000) return 8;
  if (avgResponseTime < 2000) return 6;
  if (avgResponseTime < 5000) return 4;
  return 2;
}

function calculateEaseOfIntegration(results: SourceTestResult[]): number {
  // Check error rates and API structure clarity
  const errorRate = results.filter(r => r.errors.length > 0).length / results.length || 0;
  
  // Lower error rate = easier integration
  if (errorRate < 0.1) return 10;
  if (errorRate < 0.2) return 8;
  if (errorRate < 0.3) return 6;
  if (errorRate < 0.5) return 4;
  return 2;
}

function calculateLegalRisk(source: string): number {
  // API-based sources have lower legal risk than scraping
  const apiSources = ["SportSRC", "API-Sports.io", "Sportmonks", "EntitySports", "StatPal.io", "ClearsportsAPI", "SportDB.dev"];
  
  if (apiSources.includes(source)) {
    return 9; // Official APIs are low risk
  }
  
  return 5; // Unknown/scraping sources have higher risk
}

function evaluateSource(
  source: string,
  results: SourceTestResult[],
  weights: EvaluationWeights = DEFAULT_WEIGHTS
): SourceEvaluation {
  const sourceResults = results.filter(r => r.source === source);
  
  if (sourceResults.length === 0) {
    return {
      source,
      overallScore: 0,
      scores: {
        completeness: 0,
        quality: 0,
        reliability: 0,
        performance: 0,
        easeOfIntegration: 0,
        legalRisk: calculateLegalRisk(source),
      },
      dataPointCoverage: {},
      recommendations: ["No test results available"],
      warnings: ["Source was not tested"],
      testResults: [],
    };
  }
  
  // Calculate average scores
  const avgCompleteness = sourceResults.reduce((sum, r) => sum + r.completeness, 0) / sourceResults.length;
  const avgQuality = sourceResults.reduce((sum, r) => sum + r.dataQuality, 0) / sourceResults.length;
  const avgReliability = sourceResults.reduce((sum, r) => sum + r.reliability, 0) / sourceResults.length;
  const performance = calculatePerformanceScore(sourceResults);
  const easeOfIntegration = calculateEaseOfIntegration(sourceResults);
  const legalRisk = calculateLegalRisk(source);
  
  // Calculate weighted overall score
  const overallScore = 
    avgCompleteness * weights.completeness +
    avgQuality * weights.quality +
    avgReliability * weights.reliability +
    performance * weights.performance +
    easeOfIntegration * weights.easeOfIntegration +
    legalRisk * weights.legalRisk;
  
  // Data point coverage
  const dataPoints = ["teamStats", "recentGames", "headToHead", "schedules", "liveScores", "teamMetadata", "fourFactors"];
  const dataPointCoverage: Record<string, { available: boolean; quality: number; notes: string }> = {};
  
  for (const dp of dataPoints) {
    const dpResults = sourceResults.filter(r => r.dataPoint === dp);
    const successful = dpResults.filter(r => r.success && r.completeness > 0);
    const avgQuality = dpResults.length > 0 
      ? dpResults.reduce((sum, r) => sum + r.dataQuality, 0) / dpResults.length 
      : 0;
    
    dataPointCoverage[dp] = {
      available: successful.length > 0,
      quality: avgQuality,
      notes: dpResults.length > 0 ? dpResults[0].notes : "Not tested",
    };
  }
  
  // Generate recommendations
  const recommendations: string[] = [];
  const warnings: string[] = [];
  
  if (overallScore >= 8) {
    recommendations.push("Excellent source - consider as primary");
  } else if (overallScore >= 6) {
    recommendations.push("Good source - consider as secondary or fallback");
  } else if (overallScore >= 4) {
    recommendations.push("Limited source - use only for specific data points");
  } else {
    warnings.push("Low overall score - may not be suitable");
  }
  
  if (avgCompleteness >= 8) {
    recommendations.push("High data completeness - good coverage");
  } else if (avgCompleteness < 5) {
    warnings.push("Low data completeness - many missing fields");
  }
  
  if (performance >= 8) {
    recommendations.push("Fast response times");
  } else if (performance < 5) {
    warnings.push("Slow response times - may impact user experience");
  }
  
  if (legalRisk >= 8) {
    recommendations.push("Low legal risk - official API");
  } else {
    warnings.push("Higher legal risk - verify terms of service");
  }
  
  // Check data point coverage
  const coveredPoints = Object.values(dataPointCoverage).filter(dp => dp.available).length;
  if (coveredPoints >= 5) {
    recommendations.push(`Covers ${coveredPoints}/7 data points - comprehensive`);
  } else if (coveredPoints < 3) {
    warnings.push(`Only covers ${coveredPoints}/7 data points - limited coverage`);
  }
  
  // Check for Four Factors
  if (dataPointCoverage.fourFactors.available) {
    recommendations.push("Has Four Factors data or raw stats for calculation");
  } else {
    warnings.push("No Four Factors data - will need to calculate from raw stats");
  }
  
  return {
    source,
    overallScore,
    scores: {
      completeness: avgCompleteness,
      quality: avgQuality,
      reliability: avgReliability,
      performance,
      easeOfIntegration,
      legalRisk,
    },
    dataPointCoverage,
    recommendations,
    warnings,
    testResults: sourceResults,
  };
}

function printEvaluation(evaluation: SourceEvaluation) {
  console.log("\n" + "=".repeat(80));
  console.log(`EVALUATION: ${evaluation.source}`);
  console.log("=".repeat(80));
  
  console.log(`\nOverall Score: ${evaluation.overallScore.toFixed(1)}/10`);
  
  console.log("\nDetailed Scores:");
  console.log(`  Completeness: ${evaluation.scores.completeness.toFixed(1)}/10`);
  console.log(`  Quality: ${evaluation.scores.quality.toFixed(1)}/10`);
  console.log(`  Reliability: ${evaluation.scores.reliability.toFixed(1)}/10`);
  console.log(`  Performance: ${evaluation.scores.performance.toFixed(1)}/10`);
  console.log(`  Ease of Integration: ${evaluation.scores.easeOfIntegration.toFixed(1)}/10`);
  console.log(`  Legal Risk: ${evaluation.scores.legalRisk.toFixed(1)}/10`);
  
  console.log("\nData Point Coverage:");
  for (const [dp, coverage] of Object.entries(evaluation.dataPointCoverage)) {
    const icon = coverage.available ? "✓" : "✗";
    console.log(`  ${icon} ${dp}: ${coverage.available ? `Available (Quality: ${coverage.quality.toFixed(1)}/10)` : "Not Available"}`);
    if (coverage.notes) {
      console.log(`    Note: ${coverage.notes}`);
    }
  }
  
  if (evaluation.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of evaluation.recommendations) {
      console.log(`  ✓ ${rec}`);
    }
  }
  
  if (evaluation.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of evaluation.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
  }
}

function printComparisonMatrix(evaluations: SourceEvaluation[]) {
  console.log("\n" + "=".repeat(100));
  console.log("SOURCE SCORING MATRIX");
  console.log("=".repeat(100));
  
  const header = "Source".padEnd(20) +
    "Overall".padEnd(10) +
    "Complete".padEnd(10) +
    "Quality".padEnd(10) +
    "Reliability".padEnd(12) +
    "Performance".padEnd(12) +
    "Ease".padEnd(10) +
    "Legal";
  
  console.log(header);
  console.log("-".repeat(100));
  
  for (const eval of evaluations.sort((a, b) => b.overallScore - a.overallScore)) {
    console.log(
      eval.source.padEnd(20) +
      eval.overallScore.toFixed(1).padEnd(10) +
      eval.scores.completeness.toFixed(1).padEnd(10) +
      eval.scores.quality.toFixed(1).padEnd(10) +
      eval.scores.reliability.toFixed(1).padEnd(12) +
      eval.scores.performance.toFixed(1).padEnd(12) +
      eval.scores.easeOfIntegration.toFixed(1).padEnd(10) +
      eval.scores.legalRisk.toFixed(1)
    );
  }
  
  console.log("\n" + "=".repeat(100));
  console.log("DATA POINT COVERAGE MATRIX");
  console.log("=".repeat(100));
  
  const dataPoints = ["teamStats", "recentGames", "headToHead", "schedules", "liveScores", "teamMetadata", "fourFactors"];
  const header2 = "Source".padEnd(20) + dataPoints.map(dp => dp.padEnd(12)).join("");
  
  console.log(header2);
  console.log("-".repeat(100));
  
  for (const eval of evaluations.sort((a, b) => b.overallScore - a.overallScore)) {
    const coverage = dataPoints.map(dp => {
      const cov = eval.dataPointCoverage[dp];
      if (!cov) return "?".padEnd(12);
      return (cov.available ? `✓ ${cov.quality.toFixed(0)}` : "✗").padEnd(12);
    });
    
    console.log(eval.source.padEnd(20) + coverage.join(""));
  }
}

function generateRecommendations(evaluations: SourceEvaluation[]) {
  console.log("\n" + "=".repeat(100));
  console.log("RECOMMENDATION REPORT");
  console.log("=".repeat(100));
  
  const sorted = evaluations.sort((a, b) => b.overallScore - a.overallScore);
  
  console.log("\n1. BEST OVERALL SOURCES:");
  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const eval = sorted[i];
    console.log(`   ${i + 1}. ${eval.source} (${eval.overallScore.toFixed(1)}/10)`);
    if (eval.recommendations.length > 0) {
      console.log(`      ${eval.recommendations[0]}`);
    }
  }
  
  console.log("\n2. BEST SOURCE FOR EACH DATA POINT:");
  const dataPoints = ["teamStats", "recentGames", "headToHead", "schedules", "liveScores", "teamMetadata", "fourFactors"];
  
  for (const dp of dataPoints) {
    const best = sorted
      .filter(e => e.dataPointCoverage[dp]?.available)
      .sort((a, b) => {
        const aQual = a.dataPointCoverage[dp]?.quality || 0;
        const bQual = b.dataPointCoverage[dp]?.quality || 0;
        return bQual - aQual;
      })[0];
    
    if (best) {
      const quality = best.dataPointCoverage[dp]?.quality || 0;
      console.log(`   ${dp}: ${best.source} (Quality: ${quality.toFixed(1)}/10)`);
    } else {
      console.log(`   ${dp}: No source available`);
    }
  }
  
  console.log("\n3. RECOMMENDED COMBINATION STRATEGY:");
  console.log("   Primary Source: " + (sorted[0]?.source || "TBD"));
  console.log("   Secondary Source: " + (sorted[1]?.source || "TBD"));
  console.log("   Tertiary Source: " + (sorted[2]?.source || "TBD"));
  
  console.log("\n4. COST ANALYSIS:");
  const freeSources = sorted.filter(e => 
    e.source.includes("SportSRC") || 
    e.source.includes("API-Sports") || 
    e.source.includes("Sportmonks")
  );
  
  if (freeSources.length > 0) {
    console.log("   Free Tier Sources Available:");
    for (const src of freeSources.slice(0, 3)) {
      console.log(`     - ${src.source}: ${src.overallScore.toFixed(1)}/10`);
    }
  }
  
  console.log("\n5. RISK ASSESSMENT:");
  const lowRisk = sorted.filter(e => e.scores.legalRisk >= 8);
  const highRisk = sorted.filter(e => e.scores.legalRisk < 6);
  
  if (lowRisk.length > 0) {
    console.log("   Low Risk Sources (Official APIs):");
    for (const src of lowRisk) {
      console.log(`     - ${src.source}`);
    }
  }
  
  if (highRisk.length > 0) {
    console.log("   Higher Risk Sources:");
    for (const src of highRisk) {
      console.log(`     - ${src.source}: ${src.warnings.join(", ")}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const resultsFile = args[0] || findLatestResultsFile();
  
  if (!resultsFile || !fs.existsSync(resultsFile)) {
    console.error("❌ No test results file found.");
    console.error("   Run 'npx tsx scripts/test-data-sources.ts' first to generate test results.");
    process.exit(1);
  }
  
  console.log(`\n📊 Loading test results from: ${resultsFile}`);
  
  const resultsData = JSON.parse(fs.readFileSync(resultsFile, "utf-8"));
  const results: SourceTestResult[] = resultsData.results || [];
  
  if (results.length === 0) {
    console.error("❌ No test results found in file.");
    process.exit(1);
  }
  
  // Get unique sources
  const sources = [...new Set(results.map(r => r.source))];
  
  console.log(`\nFound ${results.length} test results for ${sources.length} sources`);
  
  // Evaluate each source
  const evaluations: SourceEvaluation[] = [];
  
  for (const source of sources) {
    const evaluation = evaluateSource(source, results);
    evaluations.push(evaluation);
    printEvaluation(evaluation);
  }
  
  // Print comparison matrix
  printComparisonMatrix(evaluations);
  
  // Generate recommendations
  generateRecommendations(evaluations);
  
  // Save evaluation results
  const evalFile = resultsFile.replace("results-", "evaluation-");
  fs.writeFileSync(
    evalFile,
    JSON.stringify({
      timestamp: new Date().toISOString(),
      evaluations,
      weights: DEFAULT_WEIGHTS,
    }, null, 2)
  );
  
  console.log(`\n✓ Evaluation saved to: ${evalFile}`);
  console.log("\n" + "=".repeat(100));
}

main().catch(console.error);
