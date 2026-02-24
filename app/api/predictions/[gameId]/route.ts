/**
 * API: Get Prediction by Game ID
 *
 * Returns the existing prediction for a game if one exists.
 * Runs Monte Carlo simulation on-the-fly for uncertainty estimates.
 * Results are cached briefly (60s) per gameId to avoid repeated runs.
 */

import { NextRequest, NextResponse } from "next/server";

const MC_CACHE_TTL_MS = 60_000;
type SimResult = import("@/lib/monte-carlo-simulation").SimulationResult;
const mcCache = new Map<string, { sim: SimResult; expires: number }>();

function getCachedSimulation(
  gameId: string,
  score: { home: number; away: number },
  spread: number,
  sport: string,
  compute: () => SimResult
): SimResult {
  const key = `${gameId}:${score.home}:${score.away}:${spread}:${sport}`;
  const now = Date.now();
  const entry = mcCache.get(key);
  if (entry && entry.expires > now) return entry.sim;
  const sim = compute();
  mcCache.set(key, { sim, expires: now + MC_CACHE_TTL_MS });
  if (mcCache.size > 500) {
    for (const [k, v] of mcCache) {
      if (v.expires <= now) mcCache.delete(k);
    }
  }
  return sim;
}
import { prisma } from "@/lib/prisma";
import type { AlternateSpread, MatchupPrediction } from "@/lib/advanced-analytics";
import { runMonteCarloSimulation } from "@/lib/monte-carlo-simulation";
import { getLeagueConstants } from "@/lib/advanced-analytics";
import { getVarianceModelForSimulation, loadNumSimulations } from "@/lib/prediction-feedback-batch";
import type { SimulationResult } from "@/lib/monte-carlo-simulation";

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
    simulation?: SimulationResult;
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

  const score = prediction.predictedScore as { home: number; away: number };
  const spread = prediction.predictedSpread;
  const sport = prediction.sport ?? "cbb";
  const league = getLeagueConstants(sport);
  const [varianceModel, numSimulations] = await Promise.all([
    getVarianceModelForSimulation(),
    loadNumSimulations(),
  ]);
  const minimalPrediction: MatchupPrediction = {
    predictedScore: score,
    predictedSpread: spread,
    winProbability: prediction.winProbability as { home: number; away: number },
    confidence: prediction.confidence,
    keyFactors: [],
    valueBets: [],
  };
  const simulation = getCachedSimulation(gameId, score, spread, sport, () =>
    runMonteCarloSimulation(minimalPrediction, varianceModel, numSimulations, {
      scoreMin: league.scoreMin,
      scoreMax: league.scoreMax,
    })
  );

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
      simulation,
      createdAt: prediction.createdAt.toISOString(),
    },
  });
}
