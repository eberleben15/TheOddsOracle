/**
 * Inspect raw Kalshi and Polymarket API payloads.
 * Run: npx tsx scripts/inspect-prediction-markets-payloads.ts
 */

import { getKalshiClient } from "../lib/api-clients/kalshi-client";
import { getPolymarketClient } from "../lib/api-clients/polymarket-client";

async function main() {
  console.log("=== Kalshi ===\n");

  try {
    const kalshi = getKalshiClient();
    const { series } = await kalshi.getSeriesList({ category: "Sports", limit: 5 });
    console.log("Series (Sports, limit 5):");
    console.log(JSON.stringify(series, null, 2));

    const s = series[0];
    if (s?.ticker) {
      const { markets } = await kalshi.getMarkets({
        series_ticker: s.ticker,
        status: "open",
        limit: 2,
      });
      console.log("\nMarkets (first series, limit 2):");
      console.log(JSON.stringify(markets, null, 2));
      if (markets[0] && typeof markets[0] === "object") {
        console.log("\nMarket field names:", Object.keys(markets[0] as object).sort().join(", "));
      }
    }
  } catch (e) {
    console.error("Kalshi error:", e);
  }

  console.log("\n\n=== Polymarket ===\n");

  try {
    const poly = getPolymarketClient();
    const events = await poly.getEvents({ limit: 3, active: true, closed: false });
    console.log("Events (limit 3, active=true, closed=false):");
    console.log(JSON.stringify(events, null, 2));
    const ev = events[0];
    if (ev?.markets?.[0]) {
      console.log("\nEvent field names:", Object.keys(ev).sort().join(", "));
      console.log("Market field names:", Object.keys(ev.markets[0]).sort().join(", "));
    }
  } catch (e) {
    console.error("Polymarket error:", e);
  }
}

main();
