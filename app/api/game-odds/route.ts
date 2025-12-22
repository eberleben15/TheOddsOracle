/**
 * Game Odds API Route
 * 
 * GET /api/game-odds?gameId=abc123
 */

import { NextResponse } from "next/server";
import { getGameOdds } from "@/lib/odds-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing 'gameId' parameter" },
        { status: 400 }
      );
    }

    const game = await getGameOdds(gameId);

    if (!game) {
      return NextResponse.json(
        { error: `Game not found: ${gameId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      game,
    });
  } catch (error) {
    console.error("Error in game odds API route:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch game odds",
      },
      { status: 500 }
    );
  }
}

