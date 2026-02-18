import { unstable_cache } from "next/cache";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import type { KalshiSeries } from "@/types/kalshi";
import { CATEGORY_ORDER } from "@/lib/kalshi-categories";

const CACHE_TTL = 300; // 5 minutes
const MAX_SERIES_PER_CATEGORY = 20;

/** Build browse list from per-category data — avoids global vs per-category mismatch. */
async function fetchFilteredSeries(): Promise<KalshiSeries[]> {
  const client = getKalshiClient();
  const seen = new Set<string>();
  const result: KalshiSeries[] = [];

  for (const category of CATEGORY_ORDER) {
    try {
      const seriesWithOpen = await client.getSeriesWithOpenMarkets(category, {
        maxSeries: MAX_SERIES_PER_CATEGORY,
      });
      for (const s of seriesWithOpen) {
        if (!seen.has(s.ticker)) {
          seen.add(s.ticker);
          result.push(s);
        }
      }
    } catch (err) {
      console.error(`[kalshi/series-browse] category "${category}" failed:`, err);
    }
  }

  return result;
}

export const dynamic = "force-dynamic";
export const revalidate = CACHE_TTL;

export async function GET() {
  try {
    const getCached = unstable_cache(
      fetchFilteredSeries,
      ["kalshi-series-browse"],
      { revalidate: CACHE_TTL, tags: ["kalshi-series-browse"] }
    );
    const series = await getCached();

    return Response.json({ series });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Kalshi series";
    console.error("[kalshi/series-browse]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
