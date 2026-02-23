#!/usr/bin/env tsx
/**
 * Verify Odds API spread sign convention for CLV calculation.
 *
 * The Odds API uses American convention: negative spread = favorite.
 * Our prediction model uses: positive predictedSpread = home favored.
 *
 * Run: npx tsx scripts/verify-odds-spread-convention.ts
 * Requires THE_ODDS_API_KEY in .env.local
 */

import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config();

import { getUpcomingGamesBySport } from "../lib/odds-api";

async function verify() {
  const apiKey = process.env.THE_ODDS_API_KEY;
  if (!apiKey) {
    console.error("THE_ODDS_API_KEY not set. Add to .env.local");
    process.exit(1);
  }

  console.log("Verifying Odds API spread convention...\n");

  const games = await getUpcomingGamesBySport("basketball_ncaab", "us", "h2h,spreads,totals");
  const sample = games.slice(0, 3);

  for (let i = 0; i < sample.length; i++) {
    const game = sample[i];
    const homeML = game.bookmakers?.[0]?.markets?.find((m) => m.key === "h2h")?.outcomes?.find(
      (o) => o.name === game.home_team
    )?.price;
    const homeSpread = game.bookmakers?.[0]?.markets?.find((m) => m.key === "spreads")?.outcomes?.find(
      (o) => o.name === game.home_team
    )?.point;

    const awayML = game.bookmakers?.[0]?.markets?.find((m) => m.key === "h2h")?.outcomes?.find(
      (o) => o.name === game.away_team
    )?.price;
    const awaySpread = game.bookmakers?.[0]?.markets?.find((m) => m.key === "spreads")?.outcomes?.find(
      (o) => o.name === game.away_team
    )?.point;

    const homeFavored = homeML != null && awayML != null && homeML < awayML;
    const homeSpreadSign = homeSpread != null ? (homeSpread < 0 ? "negative" : "positive") : "N/A";

    console.log(`Game ${i + 1}: ${game.away_team} @ ${game.home_team}`);
    console.log(`  Home favored (moneyline): ${homeFavored}`);
    console.log(`  Home spread: ${homeSpread} (${homeSpreadSign})`);
    console.log(`  Away spread: ${awaySpread}`);
    console.log(
      `  Convention: ${homeFavored && homeSpread != null && homeSpread < 0 ? "OK (negative = favorite)" : homeFavored && homeSpread != null ? "MISMATCH" : "N/A"}`
    );
    console.log("");
  }

  console.log("Summary: Odds API uses negative spread for favorite. Our model uses positive = home favored.");
  console.log("CLV calculation normalizes: predictedInOddsFormat = -predictedSpread before comparison.");
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
