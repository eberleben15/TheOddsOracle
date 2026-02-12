/**
 * API Route to track predictions (full payload for feedback loop)
 * Accepts: gameId, date, homeTeam, awayTeam, prediction, and optional
 * sport, keyFactors, valueBets, favorableBets, oddsSnapshot.
 */

import { NextRequest, NextResponse } from "next/server";
import { trackPrediction } from "@/lib/prediction-tracker";
import { MatchupPrediction } from "@/lib/advanced-analytics";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      gameId,
      date,
      homeTeam,
      awayTeam,
      prediction,
      sport,
      keyFactors,
      valueBets,
      favorableBets,
      oddsSnapshot,
    } = body;

    if (!gameId || !date || !homeTeam || !awayTeam || !prediction) {
      return NextResponse.json(
        { error: "Missing required fields: gameId, date, homeTeam, awayTeam, prediction" },
        { status: 400 }
      );
    }

    const predictionId = await trackPrediction(
      gameId,
      date,
      homeTeam,
      awayTeam,
      prediction as MatchupPrediction,
      {
        sport: sport ?? undefined,
        keyFactors: Array.isArray(keyFactors) ? keyFactors : undefined,
        valueBets: Array.isArray(valueBets) ? valueBets : undefined,
        favorableBets: Array.isArray(favorableBets) ? favorableBets : undefined,
        oddsSnapshot:
          oddsSnapshot && typeof oddsSnapshot === "object" ? oddsSnapshot : undefined,
      }
    );

    return NextResponse.json({
      success: true,
      predictionId,
    });
  } catch (error) {
    console.error("Error tracking prediction:", error);
    return NextResponse.json(
      { error: "Failed to track prediction" },
      { status: 500 }
    );
  }
}

