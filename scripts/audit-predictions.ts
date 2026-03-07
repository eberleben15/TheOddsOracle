#!/usr/bin/env npx tsx
/**
 * Prediction Audit Script (any sport)
 *
 * Audits predictions for data integrity and metric accuracy:
 * (a) Closing line coverage (% of validated with closing spread)
 * (b) Blended ATS vs True ATS (market line only)
 * (c) Polluted predictions (predicted after game start)
 *
 * Usage:
 *   npx tsx scripts/audit-predictions.ts                    # CBB (default)
 *   npx tsx scripts/audit-predictions.ts --sport basketball_ncaab
 *   npx tsx scripts/audit-predictions.ts --sport basketball_nba
 *   npx tsx scripts/audit-predictions.ts --sport basketball_nba --days 60
 */

import "dotenv/config";
import { getValidatedPredictions } from "../lib/prediction-tracker";
import { generatePerformanceReport, validationsFromTrackedPredictions } from "../lib/validation-dashboard";
import { computeTrueATSMetrics } from "../lib/score-prediction-validator";
import { findPollutedPredictions } from "../lib/correct-polluted-predictions";
import { prisma } from "../lib/prisma";

const SPORT_LABELS: Record<string, string> = {
  basketball_ncaab: "College Basketball",
  basketball_nba: "NBA",
  icehockey_nhl: "NHL",
  baseball_mlb: "MLB",
};

const DEFAULT_SPORT = "basketball_ncaab";
const DEFAULT_DAYS = 90;

async function main() {
  const args = process.argv.slice(2);
  const sportArg = args.find((a) => a === "--sport");
  const sport = sportArg && args[args.indexOf("--sport") + 1]
    ? args[args.indexOf("--sport") + 1]
    : DEFAULT_SPORT;
  const daysIdx = args.indexOf("--days");
  const days = daysIdx >= 0 && args[daysIdx + 1] ? parseInt(args[daysIdx + 1], 10) : DEFAULT_DAYS;

  const sportLabel = SPORT_LABELS[sport] ?? sport;

  console.log("\n" + "=".repeat(60));
  console.log(`${sportLabel} Prediction Audit`);
  console.log(`Sport: ${sport}`);
  console.log(`Period: Last ${days} days`);
  console.log("=".repeat(60) + "\n");

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  // 1. Get validated predictions for sport
  const validated = await getValidatedPredictions(sport);
  const recent = validated.filter((p) => p.predictedAt >= cutoff);

  if (recent.length === 0) {
    console.log(`No validated ${sportLabel} predictions in the period.`);
    await prisma.$disconnect();
    return;
  }

  const validations = validationsFromTrackedPredictions(recent);

  // 2. Closing line coverage
  const withClosingSpread = validations.filter((v) => v.marketSpread != null);
  const pctWithClosingSpread = (withClosingSpread.length / validations.length) * 100;

  console.log("1. CLOSING LINE COVERAGE");
  console.log("-".repeat(40));
  console.log(`  Validated games:        ${validations.length}`);
  console.log(`  With closing spread:    ${withClosingSpread.length} (${pctWithClosingSpread.toFixed(1)}%)`);
  console.log(`  Without closing spread: ${validations.length - withClosingSpread.length}`);
  if (pctWithClosingSpread < 70) {
    console.log(`  ⚠️  Low coverage: <70% - reported ATS may blend model-vs-own-line.`);
  } else {
    console.log(`  ✓ Coverage adequate for reliable True ATS.`);
  }
  console.log();

  // 3. Blended vs True ATS
  const performanceReport = await generatePerformanceReport(days, sport);
  const blendedAts = performanceReport.overall.ats;
  const trueAts = computeTrueATSMetrics(validations);

  console.log("2. ATS METRICS");
  console.log("-".repeat(40));
  console.log("  Blended ATS (all games, fallback to our line when no market):");
  if (blendedAts) {
    console.log(`    Record:   ${blendedAts.record}`);
    console.log(`    Win rate: ${blendedAts.winRate.toFixed(1)}%`);
  } else {
    console.log("    (none)");
  }
  console.log();
  console.log("  True ATS (market line only):");
  if (trueAts) {
    console.log(`    Record:   ${trueAts.record}`);
    console.log(`    Win rate: ${trueAts.winRate.toFixed(1)}%`);
    console.log(`    Games:    ${trueAts.gameCount}`);
  } else {
    console.log("    (no games with closing spread)");
  }
  console.log();

  // 4. SU and other metrics
  console.log("3. SU & PERFORMANCE");
  console.log("-".repeat(40));
  console.log(`  Winner accuracy:  ${performanceReport.overall.accuracy.winner.toFixed(1)}%`);
  console.log(`  Spread MAE:       ${performanceReport.overall.meanAbsoluteError.spread.toFixed(2)}`);
  console.log(`  Within 3 pts:     ${performanceReport.overall.accuracy.spreadWithin3.toFixed(1)}%`);
  if (performanceReport.biases) {
    console.log("  Detected biases:");
    if (performanceReport.biases.homeTeamBias != null) {
      console.log(`    Home:  ${performanceReport.biases.homeTeamBias > 0 ? "+" : ""}${performanceReport.biases.homeTeamBias.toFixed(2)} pts`);
    }
    if (performanceReport.biases.awayTeamBias != null) {
      console.log(`    Away:  ${performanceReport.biases.awayTeamBias > 0 ? "+" : ""}${performanceReport.biases.awayTeamBias.toFixed(2)} pts`);
    }
    if (performanceReport.biases.scoreBias != null) {
      console.log(`    Total: ${performanceReport.biases.scoreBias > 0 ? "+" : ""}${performanceReport.biases.scoreBias.toFixed(2)} pts`);
    }
  }
  console.log();

  // 5. Polluted predictions
  const pollutedFiltered = await findPollutedPredictions(sport);

  console.log("4. POLLUTED PREDICTIONS (predicted after game start)");
  console.log("-".repeat(40));
  console.log(`  ${sportLabel} polluted count: ${pollutedFiltered.length}`);
  if (pollutedFiltered.length > 0) {
    console.log(`  ⚠️  Run: npx tsx scripts/find-polluted-predictions.ts --sport ${sport}`);
    console.log("  Consider correcting or excluding from metrics.");
    const sample = pollutedFiltered.slice(0, 5);
    for (const p of sample) {
      const mins = ((p.predictedAt.getTime() - p.commenceTime.getTime()) / (1000 * 60)).toFixed(0);
      console.log(`    - ${p.awayTeam} @ ${p.homeTeam} (${mins} min after start)`);
    }
  } else {
    console.log(`  ✓ No polluted ${sportLabel} predictions found.`);
  }
  console.log();

  console.log("=".repeat(60));
  console.log("Audit complete.");
  console.log("=".repeat(60) + "\n");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
