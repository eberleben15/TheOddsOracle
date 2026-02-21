/**
 * Admin API: Prediction History
 * 
 * GET /api/admin/predictions/history - Get recent history
 * GET /api/admin/predictions/history?predictionId=xxx - Get history for a specific prediction
 * GET /api/admin/predictions/history?gameId=xxx - Get history for a game
 * GET /api/admin/predictions/history/stats - Get history statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import {
  getRecentHistory,
  getPredictionHistory,
  getGameHistory,
  getHistoryStats,
  type ChangeType,
} from "@/lib/prediction-history";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const predictionId = searchParams.get("predictionId");
    const gameId = searchParams.get("gameId");
    const stats = searchParams.get("stats");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const changeType = searchParams.get("changeType") as ChangeType | null;

    // Get stats
    if (stats === "true") {
      const historyStats = await getHistoryStats();
      return NextResponse.json({ stats: historyStats });
    }

    // Get history for specific prediction
    if (predictionId) {
      const history = await getPredictionHistory(predictionId);
      return NextResponse.json({ history });
    }

    // Get history for a game
    if (gameId) {
      const history = await getGameHistory(gameId);
      return NextResponse.json({ history });
    }

    // Get recent history
    const history = await getRecentHistory(limit, changeType || undefined);
    return NextResponse.json({ history });
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
