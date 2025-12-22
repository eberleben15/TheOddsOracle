/**
 * API Route to track predictions
 * Called from client components when predictions are made
 */

import { NextRequest, NextResponse } from "next/server";
import { trackPrediction } from "@/lib/prediction-tracker";
import { MatchupPrediction } from "@/lib/advanced-analytics";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { gameId, date, homeTeam, awayTeam, prediction } = body;
    
    if (!gameId || !date || !homeTeam || !awayTeam || !prediction) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Track the prediction
    const predictionId = await trackPrediction(
      gameId,
      date,
      homeTeam,
      awayTeam,
      prediction as MatchupPrediction
    );
    
    return NextResponse.json({ 
      success: true, 
      predictionId 
    });
  } catch (error) {
    console.error("Error tracking prediction:", error);
    return NextResponse.json(
      { error: "Failed to track prediction" },
      { status: 500 }
    );
  }
}

