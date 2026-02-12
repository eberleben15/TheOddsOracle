import { NextRequest } from "next/server";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";

export const dynamic = "force-dynamic";
export const revalidate = 120;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      300,
      Math.max(1, parseInt(searchParams.get("limit") ?? "200", 10) || 200)
    );
    const cursor = searchParams.get("cursor") ?? undefined;
    const category = searchParams.get("category") ?? undefined;

    const client = getKalshiClient();
    const data = await client.getSeriesList({
      limit,
      cursor,
      ...(category ? { category } : {}),
    });

    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Kalshi series";
    console.error("[kalshi/series]", message);
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
