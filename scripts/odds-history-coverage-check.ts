#!/usr/bin/env tsx
/**
 * OddsHistory Coverage Check
 *
 * Finds validated predictions missing opening/closing lines and reports gaps.
 * Usage: npx tsx scripts/odds-history-coverage-check.ts [options]
 *
 * Options:
 *   --days N      Number of days to check (default: 90)
 *   --sport S     Sport filter (nba, cbb, nhl, etc.)
 *   --verbose     Show game IDs missing coverage
 */

import "./load-env";
import { prisma } from "../lib/prisma";

function parseArgs(): { days: number; sport: string | undefined; verbose: boolean } {
  const args = process.argv.slice(2);
  let days = 90;
  let sport: string | undefined;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--days":
        days = parseInt(args[++i], 10) || 90;
        break;
      case "--sport":
        sport = args[++i];
        break;
      case "--verbose":
      case "-v":
        verbose = true;
        break;
      case "--help":
      case "-h":
        console.log(`
OddsHistory Coverage Check - Find predictions missing opening/closing lines

Usage: npx tsx scripts/odds-history-coverage-check.ts [options]

Options:
  --days N      Number of days to check (default: 90)
  --sport S     Sport filter (nba, cbb, nhl, etc.)
  --verbose, -v Show game IDs missing coverage
  --help, -h    Show this help
`);
        process.exit(0);
    }
  }

  return { days, sport, verbose };
}

async function main() {
  const opts = parseArgs();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - opts.days);

  const where: Record<string, unknown> = {
    validated: true,
    actualHomeScore: { not: null },
    actualAwayScore: { not: null },
    date: { gte: startDate, lte: endDate },
  };
  if (opts.sport) where.sport = opts.sport;

  const predictions = await prisma.prediction.findMany({
    where,
    select: {
      id: true,
      gameId: true,
      date: true,
      homeTeam: true,
      awayTeam: true,
      sport: true,
      closingSpread: true,
      openingSpread: true,
      oddsSnapshot: true,
    },
  });

  let withClosing = 0;
  let withOpening = 0;
  let withOddsSnapshotSpread = 0;
  let withAnySpread = 0;
  const missingClosing: { gameId: string; date: Date; homeTeam: string; awayTeam: string }[] = [];
  const missingOpening: { gameId: string; date: Date; homeTeam: string; awayTeam: string }[] = [];

  for (const p of predictions) {
    const hasClosing = p.closingSpread != null;
    const hasOpening = p.openingSpread != null;
    const oddsSpread = (p.oddsSnapshot as { spread?: number } | null)?.spread;
    const hasOddsSnapshotSpread = oddsSpread != null;
    const hasAny = hasClosing || hasOpening || hasOddsSnapshotSpread;

    if (hasClosing) withClosing++;
    if (hasOpening) withOpening++;
    if (hasOddsSnapshotSpread) withOddsSnapshotSpread++;
    if (hasAny) withAnySpread++;

    if (!hasClosing)
      missingClosing.push({
        gameId: p.gameId,
        date: p.date,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
      });
    if (!hasOpening)
      missingOpening.push({
        gameId: p.gameId,
        date: p.date,
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
      });
  }

  console.log("\n--- OddsHistory Coverage Check ---");
  console.log(`Date range: ${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`);
  console.log(`Sport: ${opts.sport ?? "all"}`);
  console.log(`Total validated predictions: ${predictions.length}\n`);

  console.log("Spread coverage:");
  console.log(`  With closing spread:     ${withClosing} (${predictions.length > 0 ? ((withClosing / predictions.length) * 100).toFixed(1) : 0}%)`);
  console.log(`  With opening spread:     ${withOpening} (${predictions.length > 0 ? ((withOpening / predictions.length) * 100).toFixed(1) : 0}%)`);
  console.log(`  With oddsSnapshot.spread: ${withOddsSnapshotSpread} (${predictions.length > 0 ? ((withOddsSnapshotSpread / predictions.length) * 100).toFixed(1) : 0}%)`);
  console.log(`  With any spread source:  ${withAnySpread} (${predictions.length > 0 ? ((withAnySpread / predictions.length) * 100).toFixed(1) : 0}%)\n`);

  console.log("Missing coverage:");
  console.log(`  Missing closing spread:  ${missingClosing.length}`);
  console.log(`  Missing opening spread:  ${missingOpening.length}\n`);

  if (opts.verbose && (missingClosing.length > 0 || missingOpening.length > 0)) {
    if (missingClosing.length > 0) {
      console.log("Games missing closing spread (first 20):");
      missingClosing.slice(0, 20).forEach((g) => {
        console.log(`  ${g.date.toISOString().split("T")[0]} ${g.gameId} ${g.awayTeam} @ ${g.homeTeam}`);
      });
      if (missingClosing.length > 20)
        console.log(`  ... and ${missingClosing.length - 20} more`);
      console.log();
    }
    if (missingOpening.length > 0) {
      console.log("Games missing opening spread (first 20):");
      missingOpening.slice(0, 20).forEach((g) => {
        console.log(`  ${g.date.toISOString().split("T")[0]} ${g.gameId} ${g.awayTeam} @ ${g.homeTeam}`);
      });
      if (missingOpening.length > 20)
        console.log(`  ... and ${missingOpening.length - 20} more`);
    }
  }

  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
