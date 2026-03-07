#!/usr/bin/env tsx
/**
 * Backfill Historical Games
 *
 * Fetches historical games from SportsData/ESPN and persists to HistoricalGame table.
 * Usage: npx tsx scripts/backfill-historical-games.ts [options]
 *
 * Options:
 *   --days N      Number of days to backfill (default: 90)
 *   --sport S     Sport (default: basketball_ncaab - CBB from ESPN)
 *   --dryRun      Don't write to database
 */

import "./load-env";
import { collectHistoricalGames } from "../lib/historical-data-collector";
import { prisma } from "../lib/prisma";

function parseArgs(): {
  days: number;
  sport: string;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let days = 90;
  let sport = "basketball_ncaab";
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--days":
        days = parseInt(args[++i], 10) || 90;
        break;
      case "--sport":
        sport = args[++i] ?? "basketball_ncaab";
        break;
      case "--dryRun":
        dryRun = true;
        break;
      case "--help":
      case "-h":
        console.log(`
Backfill Historical Games - Persist SportsData/ESPN games to database

Usage: npx tsx scripts/backfill-historical-games.ts [options]

Options:
  --days N      Number of days to backfill (default: 90)
  --sport S     Sport (default: basketball_ncaab)
  --dryRun      Don't write to database
  --help, -h    Show this help
`);
        process.exit(0);
    }
  }

  return { days, sport, dryRun };
}

async function main() {
  const opts = parseArgs();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - opts.days);

  console.log("\n--- Backfill Historical Games ---");
  console.log(`Date range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`);
  console.log(`Sport: ${opts.sport}`);
  console.log(`Dry run: ${opts.dryRun}\n`);

  const games = await collectHistoricalGames(startDate, endDate);

  if (games.length === 0) {
    console.log("No historical games found.");
    process.exit(0);
  }

  if (opts.dryRun) {
    console.log(`Would upsert ${games.length} games.`);
    process.exit(0);
  }

  let upserted = 0;
  let skipped = 0;

  for (const g of games) {
    try {
      await prisma.historicalGame.upsert({
        where: {
          externalGameId_sport: {
            externalGameId: String(g.gameId),
            sport: opts.sport,
          },
        },
        create: {
          externalGameId: String(g.gameId),
          date: new Date(g.date),
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          homeTeamId: String(g.homeTeamId),
          awayTeamId: String(g.awayTeamId),
          homeScore: g.homeScore,
          awayScore: g.awayScore,
          sport: opts.sport,
          season: g.season,
          source: "sportsdata",
        },
        update: {
          homeScore: g.homeScore,
          awayScore: g.awayScore,
        },
      });
      upserted++;
    } catch (err) {
      console.warn(`Failed to upsert game ${g.gameId}:`, err);
      skipped++;
    }
  }

  console.log(`Upserted ${upserted} games, skipped ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
