#!/usr/bin/env npx tsx
/**
 * Apply NHL Bias Correction
 *
 * Saves NHL-specific bias correction from audit findings.
 * NHL model over-predicts slightly: Home +0.56, Away +0.74, Total +1.30 (goals).
 * applyBiasCorrection subtracts these, reducing predictions to correct over-prediction.
 *
 * Usage:
 *   npx tsx scripts/apply-nhl-bias-correction.ts
 *   npx tsx scripts/apply-nhl-bias-correction.ts --dry-run
 */

import "dotenv/config";
import { saveBiasCorrection } from "../lib/prediction-feedback-batch";

const NHL_BIAS = {
  homeTeamBias: 0.56,
  awayTeamBias: 0.74,
  scoreBias: 1.3,
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("\n[DRY RUN] Would save NHL bias correction (goals):");
    console.log("  homeTeamBias:", NHL_BIAS.homeTeamBias);
    console.log("  awayTeamBias:", NHL_BIAS.awayTeamBias);
    console.log("  scoreBias:", NHL_BIAS.scoreBias);
    console.log("\nRun without --dry-run to apply.");
    return;
  }

  await saveBiasCorrection(NHL_BIAS, "icehockey_nhl");
  console.log("\nSaved NHL bias correction (goals):");
  console.log("  homeTeamBias:", NHL_BIAS.homeTeamBias);
  console.log("  awayTeamBias:", NHL_BIAS.awayTeamBias);
  console.log("  scoreBias:", NHL_BIAS.scoreBias);
  console.log("\nNew NHL predictions will use this correction.");
  console.log("Recommendations and value bets will use sport-specific bias.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
