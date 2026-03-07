#!/usr/bin/env npx tsx
/**
 * Correct Polluted Predictions
 *
 * Fetches historical opening/closing lines from The Odds API and updates
 * polluted predictions (created after game start) with corrected odds and CLV.
 *
 * Usage:
 *   npx tsx scripts/correct-polluted-predictions.ts
 *   npx tsx scripts/correct-polluted-predictions.ts --dry-run
 *   npx tsx scripts/correct-polluted-predictions.ts --limit 5
 *   npx tsx scripts/correct-polluted-predictions.ts --sport basketball_ncaab
 */

import "dotenv/config";
import {
  findPollutedPredictions,
  correctAllPollutedPredictions,
} from "../lib/correct-polluted-predictions";
import { prisma } from "../lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const limitArg = args.find((a) => a === "--limit");
  const limit = limitArg ? parseInt(args[args.indexOf("--limit") + 1], 10) : undefined;
  const sportArg = args.find((a) => a === "--sport");
  const sport = sportArg && args[args.indexOf("--sport") + 1] ? args[args.indexOf("--sport") + 1] : undefined;

  if (dryRun) {
    console.log("\n[DRY RUN] No changes will be written.\n");
  }
  if (sport) {
    console.log(`Sport filter: ${sport}\n`);
  }

  console.log("Finding polluted predictions...\n");
  const polluted = await findPollutedPredictions(sport);

  if (polluted.length === 0) {
    console.log("No polluted predictions found.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${polluted.length} polluted prediction(s). Correcting...\n`);

  const { corrected, failed, results } = await correctAllPollutedPredictions({
    dryRun,
    limit,
    sport,
  });

  for (const r of results) {
    const rec = polluted.find((p) => p.predictionId === r.predictionId);
    const label = rec ? `${rec.awayTeam} @ ${rec.homeTeam}` : r.predictionId;
    if (r.success) {
      console.log(`  ✅ ${label}`);
    } else {
      console.log(`  ❌ ${label}: ${r.error}`);
    }
  }

  console.log(
    `\n${dryRun ? "[DRY RUN] Would have " : ""}Corrected: ${corrected}, Failed: ${failed}`
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
