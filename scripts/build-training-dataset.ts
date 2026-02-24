#!/usr/bin/env npx tsx
/**
 * Build Training Dataset
 *
 * Extracts features from validated predictions and optionally exports to JSON.
 * Use for historical calibration experiments and ML training prep.
 *
 * Usage:
 *   npx tsx scripts/build-training-dataset.ts
 *   npx tsx scripts/build-training-dataset.ts --export training-data.json
 *   npx tsx scripts/build-training-dataset.ts --sport basketball_ncaab
 *   npx tsx scripts/build-training-dataset.ts --test-fraction 0.2
 */

import { buildTrainingDataset, getDatasetStats, splitByTimeFraction, exportToJson } from "../lib/training-dataset";
import { runEvaluation } from "../lib/evaluation-harness";
import * as fs from "fs";

async function main() {
  const args = process.argv.slice(2);
  const exportPath = args.find((a) => a === "--export") ? args[args.indexOf("--export") + 1] : undefined;
  const sport = args.find((a) => a === "--sport") ? args[args.indexOf("--sport") + 1] : undefined;
  const testFrac = args.find((a) => a === "--test-fraction")
    ? parseFloat(args[args.indexOf("--test-fraction") + 1])
    : 0.2;

  console.log("\n📊 Building Training Dataset\n");

  const examples = await buildTrainingDataset({
    sport: sport || undefined,
    limit: 0,
  });

  const stats = getDatasetStats(examples);
  console.log("Dataset stats:");
  console.log(`  Total examples: ${stats.count}`);
  console.log(`  Date range: ${stats.dateRange.min} to ${stats.dateRange.max}`);
  console.log(`  Sport breakdown:`, stats.sportBreakdown);
  console.log(`  With trace: ${stats.hasTraceCount}`);
  console.log(`  With market lines: ${stats.withMarketLinesCount}`);

  if (examples.length === 0) {
    console.log("\n⚠️  No validated predictions found. Run batch sync to validate games first.");
    process.exit(0);
  }

  const fullReport = runEvaluation(examples);
  console.log("\nFull-set evaluation:");
  console.log(`  Brier: ${fullReport.brierScore.toFixed(4)}`);
  console.log(`  Log Loss: ${fullReport.logLoss.toFixed(4)}`);
  console.log(`  Winner accuracy: ${fullReport.winnerAccuracy.toFixed(1)}%`);
  console.log(`  Spread MAE: ${fullReport.spreadMAE.toFixed(2)}`);
  console.log(`  Total MAE: ${fullReport.totalMAE.toFixed(2)}`);
  if (fullReport.ats) {
    console.log(`  ATS: ${fullReport.ats.wins}-${fullReport.ats.losses}-${fullReport.ats.pushes} (${fullReport.ats.winRate.toFixed(1)}%)`);
  }

  if (testFrac > 0 && examples.length >= 20) {
    const { train, test } = splitByTimeFraction(examples, testFrac);
    const trainReport = runEvaluation(train);
    const testReport = runEvaluation(test);
    console.log(`\nTrain/Test split (${((1 - testFrac) * 100).toFixed(0)}/${(testFrac * 100).toFixed(0)}):`);
    console.log(`  Train: n=${train.length} Brier=${trainReport.brierScore.toFixed(4)} Acc=${trainReport.winnerAccuracy.toFixed(1)}%`);
    console.log(`  Test:  n=${test.length} Brier=${testReport.brierScore.toFixed(4)} Acc=${testReport.winnerAccuracy.toFixed(1)}%`);
  }

  if (exportPath) {
    fs.writeFileSync(exportPath, exportToJson(examples));
    console.log(`\n✅ Exported ${examples.length} examples to ${exportPath}`);
  }

  console.log("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
