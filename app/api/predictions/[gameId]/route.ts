/**
 * API: Get Prediction by Game ID
 * 
 * Returns the existing prediction for a game if one exists.
 * This is the primary way the UI should fetch predictions.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AlternateSpread } from "@/lib/advanced-analytics";

export interface PredictionResponse {
  exists: boolean;
  prediction?: {
    id: string;
    gameId: string;
    date: string;
    homeTeam: string;
    awayTeam: string;
    sport: string | null;
    predictedScore: { home: number; away: number };
    predictedSpread: number;
    alternateSpread: AlternateSpread | null;
    predictedTotal: number | null;
    winProbability: { home: number; away: number };
    confidence: number;
    keyFactors: string[];
    valueBets: Array<{
      type: string;
      recommendation: string;
      confidence: number;
      reason: string;
    }>;
    createdAt: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
): Promise<NextResponse<PredictionResponse>> {
  const { gameId } = await params;

  if (!gameId) {
    return NextResponse.json({ exists: false });
  }

  const prediction = await prisma.prediction.findFirst({
    where: { gameId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      gameId: true,
      date: true,
      homeTeam: true,
      awayTeam: true,
      sport: true,
      predictedScore: true,
      predictedSpread: true,
      alternateSpread: true,
      predictedTotal: true,
      winProbability: true,
      confidence: true,
      keyFactors: true,
      valueBets: true,
      createdAt: true,
    },
  });

  if (!prediction) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    prediction: {
      id: prediction.id,
      gameId: prediction.gameId,
      date: prediction.date.toISOString(),
      homeTeam: prediction.homeTeam,
      awayTeam: prediction.awayTeam,
      sport: prediction.sport,
      predictedScore: prediction.predictedScore as { home: number; away: number },
      predictedSpread: prediction.predictedSpread,
      alternateSpread: prediction.alternateSpread as AlternateSpread | null,
      predictedTotal: prediction.predictedTotal,
      winProbability: prediction.winProbability as { home: number; away: number },
      confidence: prediction.confidence,
      keyFactors: (prediction.keyFactors as string[]) ?? [],
      valueBets: (prediction.valueBets as Array<{
        type: string;
        recommendation: string;
        confidence: number;
        reason: string;
      }>) ?? [],
      createdAt: prediction.createdAt.toISOString(),
    },
  });
}
