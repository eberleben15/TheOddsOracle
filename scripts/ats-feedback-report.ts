#!/usr/bin/env npx tsx
/**
 * ATS Feedback Report
 *
 * Builds training dataset from validated predictions and runs comprehensive
 * ATS feature correlation, segmentation, and bias analysis.
 *
 * Usage:
 *   npx tsx scripts/ats-feedback-report.ts
 *   npx tsx scripts/ats-feedback-report.ts --sport basketball_ncaab
 *   npx tsx scripts/ats-feedback-report.ts --export report.json
 *   npx tsx scripts/ats-feedback-report.ts --generate-config config.json
 */

import { buildTrainingDataset } from "../lib/training-dataset";
import { runATSFeedbackReport, formatATSFeedbackReport } from "../lib/ats-feedback";
import { generateConfigFromFeedback, DEFAULT_PIPELINE_CONFIG, serializeConfig } from "../lib/feedback-pipeline-config";
import * as fs from "fs";

async function main() {
  const args = process.argv.slice(2);
  const exportPath = args.find((a) => a === "--export")
    ? args[args.indexOf("--export") + 1]
    : undefined;
  const sport = args.find((a) => a === "--sport")
    ? args[args.indexOf("--sport") + 1]
    : undefined;
  const configPath = args.find((a) => a === "--generate-config")
    ? args[args.indexOf("--generate-config") + 1]
    : undefined;
  const verbose = args.includes("--verbose");

  console.log("\n📊 ATS FEEDBACK ANALYSIS\n");

  const examples = await buildTrainingDataset({
    sport: sport || undefined,
    limit: 0,
  });

  if (examples.length === 0) {
    console.log("⚠️  No validated predictions found. Run batch sync to validate games first.");
    process.exit(0);
  }

  // Check for teamAnalytics coverage
  const withAnalytics = examples.filter((ex) => ex.awayNetRating != null);
  console.log(`Loaded ${examples.length} training examples (${withAnalytics.length} with teamAnalytics)`);
  
  const report = runATSFeedbackReport(examples);

  if (report.overall.sampleCount === 0) {
    console.log(
      "\n⚠️  No examples with market spread (closingSpread). Need closing lines for ATS analysis."
    );
    process.exit(0);
  }

  console.log(formatATSFeedbackReport(report));

  // Export report
  if (exportPath) {
    fs.writeFileSync(exportPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`\n✅ Exported report to ${exportPath}`);
  }

  // Generate config from feedback
  if (configPath) {
    const config = generateConfigFromFeedback(report, DEFAULT_PIPELINE_CONFIG);
    fs.writeFileSync(configPath, serializeConfig(config), "utf-8");
    console.log(`\n✅ Generated config to ${configPath}`);
    
    // Show what changed
    console.log("\n── Config Changes ──");
    for (const [sportKey, sportConfig] of Object.entries(config.sports)) {
      const defaultConfig = DEFAULT_PIPELINE_CONFIG.sports[sportKey as keyof typeof DEFAULT_PIPELINE_CONFIG.sports];
      if (sportConfig.confidenceMultiplier !== defaultConfig.confidenceMultiplier || !sportConfig.enabled) {
        const status = sportConfig.enabled ? `multiplier=${sportConfig.confidenceMultiplier.toFixed(2)}` : "DISABLED";
        console.log(`  ${sportKey}: ${status}`);
      }
    }
    for (const [key, bucket] of Object.entries(config.spreadMagnitude)) {
      const defaultBucket = DEFAULT_PIPELINE_CONFIG.spreadMagnitude[key as keyof typeof DEFAULT_PIPELINE_CONFIG.spreadMagnitude];
      if (bucket.confidenceMultiplier !== defaultBucket.confidenceMultiplier || !bucket.enabled) {
        const status = bucket.enabled ? `multiplier=${bucket.confidenceMultiplier.toFixed(2)}` : "DISABLED";
        console.log(`  spreadMagnitude.${key}: ${status}`);
      }
    }
    for (const [key, bucket] of Object.entries(config.totalBucket)) {
      const defaultBucket = DEFAULT_PIPELINE_CONFIG.totalBucket[key as keyof typeof DEFAULT_PIPELINE_CONFIG.totalBucket];
      if (bucket.confidenceMultiplier !== defaultBucket.confidenceMultiplier || !bucket.enabled) {
        const status = bucket.enabled ? `multiplier=${bucket.confidenceMultiplier.toFixed(2)}` : "DISABLED";
        console.log(`  totalBucket.${key}: ${status}`);
      }
    }
  }

  // Verbose: show feature coverage
  if (verbose) {
    console.log("\n── Feature Coverage ──");
    const featureCoverage: Record<string, number> = {};
    for (const ex of examples) {
      for (const [key, value] of Object.entries(ex)) {
        if (value != null && typeof value === "number") {
          featureCoverage[key] = (featureCoverage[key] ?? 0) + 1;
        }
      }
    }
    const sortedCoverage = Object.entries(featureCoverage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);
    for (const [feature, count] of sortedCoverage) {
      const pct = ((count / examples.length) * 100).toFixed(1);
      console.log(`  ${feature.padEnd(28)} ${count}/${examples.length} (${pct}%)`);
    }
  }

  console.log("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
