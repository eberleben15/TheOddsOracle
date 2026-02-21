/**
 * Admin API: Search predictions for autocomplete
 * 
 * GET /api/admin/predictions/search?q=query&sport=sport&limit=20
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { searchPredictions } from "@/lib/prediction-history";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const sport = searchParams.get("sport") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const predictions = await searchPredictions(query, { sport, limit });

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
