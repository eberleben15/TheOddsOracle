import { NextRequest } from "next/server";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import type { KalshiMarket } from "@/types/kalshi";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/** Only open markets are shown; finalized/closed/settled are excluded. */
const DISPLAY_STATUS = "open" as const;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50)
    );
    const cursor = searchParams.get("cursor") ?? undefined;
    const series_ticker = searchParams.get("series_ticker") ?? undefined;
    const category = searchParams.get("category") ?? undefined;

    const client = getKalshiClient();

    const data = category
      ? await client.getMarketsByCategory(category, { status: DISPLAY_STATUS, limit })
      : await client.getMarkets({
          status: DISPLAY_STATUS,
          limit,
          cursor,
          ...(series_ticker ? { series_ticker } : {}),
        });

    // Ensure only open markets are returned (safety net if API returns others)
    const markets = (data.markets ?? []).filter(
      (m: KalshiMarket) => (m.status ?? "").toLowerCase() === "open"
    );

    return Response.json({ ...data, markets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Kalshi markets";
    console.error("[kalshi/markets]", message);
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
