#!/usr/bin/env npx tsx
/**
 * Apply NBA Bias Correction
 *
 * Saves NBA-specific bias correction from audit findings.
 * NBA model under-predicts: Home -11.35, Away -14.21, Total -25.56 pts.
 * These values are subtracted in applyBiasCorrection, so storing negatives
 * will add to predictions (correcting under-prediction).
 *
 * Usage:
 *   npx tsx scripts/apply-nba-bias-correction.ts
 *   npx tsx scripts/apply-nba-bias-correction.ts --dry-run
 */

import "dotenv/config";
import { saveBiasCorrection } from "../lib/prediction-feedback-batch";

const NBA_BIAS = {
  homeTeamBias: -11.35,
  awayTeamBias: -14.21,
  scoreBias: -25.56,
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("\n[DRY RUN] Would save NBA bias correction:");
    console.log("  homeTeamBias:", NBA_BIAS.homeTeamBias);
    console.log("  awayTeamBias:", NBA_BIAS.awayTeamBias);
    console.log("  scoreBias:", NBA_BIAS.scoreBias);
    console.log("\nRun without --dry-run to apply.");
    return;
  }

  await saveBiasCorrection(NBA_BIAS, "basketball_nba");
  console.log("\nSaved NBA bias correction:");
  console.log("  homeTeamBias:", NBA_BIAS.homeTeamBias);
  console.log("  awayTeamBias:", NBA_BIAS.awayTeamBias);
  console.log("  scoreBias:", NBA_BIAS.scoreBias);
  console.log("\nNew NBA predictions will use this correction.");
  console.log("Recommendations and value bets will use sport-specific bias.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
