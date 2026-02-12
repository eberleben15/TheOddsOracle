import { NextRequest } from "next/server";
import { getPolymarketClient } from "@/lib/api-clients/polymarket-client";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/**
 * GET /api/polymarket/events?limit=24&active=true&closed=false
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10) || 24));
    const active = searchParams.get("active");
    const closed = searchParams.get("closed");
    const tag_id = searchParams.get("tag_id") ?? undefined;

    const client = getPolymarketClient();
    const events = await client.getEvents({
      limit,
      active: active !== "false",
      closed: closed === "true",
      tag_id,
    });

    return Response.json(Array.isArray(events) ? events : []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Polymarket events";
    console.error("[polymarket/events]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
