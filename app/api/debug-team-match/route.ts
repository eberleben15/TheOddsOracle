/**
 * Debug Team Matching API
 * 
 * Endpoint to debug team name matching for a specific game
 */

import { NextRequest, NextResponse } from "next/server";
import { getGameOdds } from "@/lib/odds-api";
import { debugTeamMatching } from "@/lib/team-match-debugger";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameId = searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json(
        { error: "gameId query parameter is required" },
        { status: 400 }
      );
    }

    const game = await getGameOdds(gameId);
    
    if (!game) {
      return NextResponse.json(
        { error: `Game ${gameId} not found` },
        { status: 404 }
      );
    }

    const debugInfo = debugTeamMatching(game);

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error("Error debugging team match:", error);
    return NextResponse.json(
      {
        error: "Failed to debug team matching",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

