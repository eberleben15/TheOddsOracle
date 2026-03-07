#!/usr/bin/env npx tsx
/**
 * Retrain Model After Correction
 *
 * Runs the feedback/training pipeline (train-only) to incorporate corrected
 * prediction data. Use after running correct-polluted-predictions.ts.
 *
 * Usage:
 *   npx tsx scripts/retrain-after-correction.ts
 */

import "dotenv/config";
import { runBatchSync } from "../lib/prediction-feedback-batch";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("\n🔄 Running model retraining (train-only)...\n");

  const result = await runBatchSync({ trainOnly: true });

  console.log(
    `\n✅ Training complete: ${result.trainingRan ? "ran" : "skipped"} ` +
      `(${result.validatedCount} validated predictions, ${result.duration}ms)\n`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
