#!/usr/bin/env tsx
/**
 * Clear All Predictions
 *
 * Deletes every row from the predictions table for a clean slate.
 * Use after improving stats/data so new predictions are tracked from scratch.
 *
 * Usage: npx tsx scripts/clear-all-predictions.ts
 *    or: npm run predictions:clear
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load env before any other local imports so DATABASE_URL is set for Prisma
const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { prisma } = await import("../lib/prisma");
  const count = await prisma.prediction.deleteMany({});
  console.log(`Deleted ${count.count} prediction(s). Clean slate ready.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("../lib/prisma");
    await prisma.$disconnect();
  });
