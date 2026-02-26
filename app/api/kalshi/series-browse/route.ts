import { unstable_cache } from "next/cache";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import type { KalshiSeries } from "@/types/kalshi";
import { CATEGORY_ORDER } from "@/lib/kalshi-categories";

/**
 * Build browse list from Events API — the correct discovery path.
 * GET /series ignores limit and returns thousands of series in undefined order;
 * GET /events?status=open returns only tradeable events with series_ticker + category.
 */
async function fetchFilteredSeries(): Promise<KalshiSeries[]> {
  const client = getKalshiClient();
  const byCategory = await client.getAllSeriesWithOpenMarketsByCategory({ maxEvents: 500 });

  const seen = new Set<string>();
  const result: KalshiSeries[] = [];

  for (const category of CATEGORY_ORDER) {
    const list = byCategory.get(category) ?? [];
    for (const s of list) {
      if (!seen.has(s.ticker)) {
        seen.add(s.ticker);
        result.push(s);
      }
    }
  }

  // Include any categories from API not in our CATEGORY_ORDER
  const knownCats = new Set<string>(CATEGORY_ORDER);
  for (const [cat, list] of byCategory) {
    if (knownCats.has(cat)) continue;
    for (const s of list) {
      if (!seen.has(s.ticker)) {
        seen.add(s.ticker);
        result.push(s);
      }
    }
  }

  return result;
}

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  try {
    const getCached = unstable_cache(
      fetchFilteredSeries,
      ["kalshi-series-browse"],
      { revalidate: 300, tags: ["kalshi-series-browse"] }
    );
    const series = await getCached();

    return Response.json({ series });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Kalshi series";
    console.error("[kalshi/series-browse]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
