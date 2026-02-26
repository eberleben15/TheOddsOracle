import { NextRequest } from "next/server";
import { getPolymarketClient } from "@/lib/api-clients/polymarket-client";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/** Valid order values for Gamma API (camelCase) */
const VALID_ORDER = ["volume", "volume24hr", "liquidity"] as const;

/**
 * GET /api/polymarket/events?limit=100&active=true&closed=false&order=volume&ascending=false&offset=0
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10) || 100));
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
    const active = searchParams.get("active");
    const closed = searchParams.get("closed");
    const tag_id = searchParams.get("tag_id") ?? undefined;
    const rawOrder = searchParams.get("order") ?? "volume";
    const order = VALID_ORDER.includes(rawOrder as (typeof VALID_ORDER)[number])
      ? (rawOrder as (typeof VALID_ORDER)[number])
      : "volume";
    const ascending = searchParams.get("ascending") === "true";

    const client = getPolymarketClient();
    const events = await client.getEvents({
      limit,
      offset,
      active: active !== "false",
      closed: closed === "true",
      tag_id,
      order,
      ascending,
    });

    return Response.json(Array.isArray(events) ? events : []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Polymarket events";
    console.error("[polymarket/events]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
