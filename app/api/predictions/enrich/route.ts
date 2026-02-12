/**
 * Enrich an existing prediction with favorable bets and odds snapshot.
 * Call after favorableBetAnalysis is ready (client-side).
 */

import { NextRequest, NextResponse } from "next/server";
import { enrichPrediction } from "@/lib/prediction-tracker";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, favorableBets, oddsSnapshot } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required field: gameId" },
        { status: 400 }
      );
    }

    const ok = await enrichPrediction(
      gameId,
      Array.isArray(favorableBets) ? favorableBets : null,
      oddsSnapshot && typeof oddsSnapshot === "object" ? oddsSnapshot : null
    );

    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error("Error enriching prediction:", error);
    return NextResponse.json(
      { error: "Failed to enrich prediction" },
      { status: 500 }
    );
  }
}
