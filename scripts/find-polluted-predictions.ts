#!/usr/bin/env npx tsx
/**
 * Find Polluted Predictions
 *
 * Identifies predictions that were created after the game had already started
 * (predictedAt > commenceTime), which means they used closing-line odds.
 *
 * Usage:
 *   npx tsx scripts/find-polluted-predictions.ts
 *   npx tsx scripts/find-polluted-predictions.ts --sport basketball_ncaab
 *   npx tsx scripts/find-polluted-predictions.ts --export polluted.json
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import * as fs from "fs";
import { findPollutedPredictions } from "../lib/correct-polluted-predictions";

async function main() {
  const args = process.argv.slice(2);
  const exportPath = args.find((a) => a === "--export")
    ? args[args.indexOf("--export") + 1]
    : undefined;
  const sportArg = args.find((a) => a === "--sport");
  const sport = sportArg && args[args.indexOf("--sport") + 1]
    ? args[args.indexOf("--sport") + 1]
    : undefined;

  console.log("\n🔍 Finding polluted predictions (predictedAt > commenceTime)...\n");
  if (sport) console.log(`   Sport filter: ${sport}\n`);

  const polluted = await findPollutedPredictions(sport);

  console.log(`Found ${polluted.length} polluted prediction(s)\n`);

  const summary = polluted.map((rec) => {
    const minutesAfter = (rec.predictedAt.getTime() - rec.commenceTime.getTime()) / (1000 * 60);
    return {
      trackedGameId: rec.trackedGameId,
      externalId: rec.externalId,
      predictionId: rec.predictionId,
      sport: rec.sport,
      homeTeam: rec.homeTeam,
      awayTeam: rec.awayTeam,
      commenceTime: rec.commenceTime.toISOString(),
      predictedAt: rec.predictedAt.toISOString(),
      minutesAfterStart: minutesAfter,
    };
  });

  if (polluted.length > 0) {
    for (const s of summary) {
      console.log(
        `  ${s.awayTeam} @ ${s.homeTeam} (${s.sport}) – predicted ${s.minutesAfterStart?.toFixed(0)} min after start`
      );
    }
  }

  if (exportPath && summary.length > 0) {
    fs.writeFileSync(exportPath, JSON.stringify(summary, null, 2), "utf-8");
    console.log(`\n✅ Exported to ${exportPath}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
