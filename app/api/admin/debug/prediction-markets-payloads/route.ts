/**
 * Admin Debug: Fetch raw Kalshi and Polymarket API payloads for inspection.
 * GET /api/admin/debug/prediction-markets-payloads
 * Admin-only.
 */

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { getPolymarketClient } from "@/lib/api-clients/polymarket-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result: {
    kalshi?: {
      series?: unknown;
      markets?: unknown;
      sampleMarketFields?: string[];
    };
    polymarket?: {
      events?: unknown;
      sampleEventFields?: string[];
      sampleMarketFields?: string[];
    };
    errors?: string[];
  } = {};

  const errors: string[] = [];

  // Kalshi
  try {
    const kalshi = getKalshiClient();
    const { series } = await kalshi.getSeriesList({ category: "Sports", limit: 5 });
    const sampleSeries = series[0];
    let markets: unknown[] = [];
    if (sampleSeries?.ticker) {
      const res = await kalshi.getMarkets({
        series_ticker: sampleSeries.ticker,
        status: "open",
        limit: 3,
      });
      markets = res.markets ?? [];
    }
    result.kalshi = {
      series: series.slice(0, 3),
      markets,
      sampleMarketFields:
        markets.length > 0 && typeof markets[0] === "object"
          ? Object.keys(markets[0] as Record<string, unknown>).sort()
          : [],
    };
  } catch (e) {
    errors.push(`Kalshi: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Polymarket
  try {
    const poly = getPolymarketClient();
    const events = await poly.getEvents({ limit: 3, active: true, closed: false });
    const sampleEvent = events[0];
    const sampleMarket =
      sampleEvent?.markets?.[0] ?? null;
    result.polymarket = {
      events: events.slice(0, 2).map((ev) => ({
        id: ev.id,
        slug: ev.slug,
        title: ev.title,
        active: ev.active,
        closed: ev.closed,
        marketsCount: ev.markets?.length ?? 0,
        firstMarket: ev.markets?.[0]
          ? {
              id: ev.markets[0].id,
              question: ev.markets[0].question,
              outcomePrices: ev.markets[0].outcomePrices,
              bestBid: ev.markets[0].bestBid,
              bestAsk: ev.markets[0].bestAsk,
              lastTradePrice: ev.markets[0].lastTradePrice,
              volume: ev.markets[0].volume,
              closed: ev.markets[0].closed,
            }
          : null,
      })),
      sampleEventFields:
        sampleEvent && typeof sampleEvent === "object"
          ? Object.keys(sampleEvent).sort()
          : [],
      sampleMarketFields:
        sampleMarket && typeof sampleMarket === "object"
          ? Object.keys(sampleMarket).sort()
          : [],
    };
  } catch (e) {
    errors.push(`Polymarket: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (errors.length > 0) result.errors = errors;

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
