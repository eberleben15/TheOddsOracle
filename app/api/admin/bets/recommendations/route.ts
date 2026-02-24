/**
 * Admin API: Today's Bet Recommendations
 *
 * Uses the unified recommendation engine. Supports edge-based (with market odds)
 * and model-only modes. Enforces 53% ATS performance gate.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";
import {
  generateRecommendations,
  checkPerformanceGate,
  applyBiasCorrection,
  type OddsSnapshot,
} from "@/lib/recommendation-engine";
import { generatePerformanceReport } from "@/lib/validation-dashboard";
import { loadBiasCorrection } from "@/lib/prediction-feedback-batch";

interface BetRecommendation {
  id: string;
  predictionId: string;
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  sport: string | null;
  predictedScore: { home: number; away: number };
  predictedSpread: number;
  predictedTotal: number | null;
  winProbability: { home: number; away: number };
  confidence: number;
  keyFactors: string[];
  alternateSpread: Record<string, unknown> | null;
  oddsSnapshot: Record<string, unknown> | null;
  valueBets: Record<string, unknown>[] | null;
  recommendedBets: {
    type: string;
    side: string;
    line: number | null;
    confidence: number;
    reasoning: string;
    edge?: number;
    isModelOnly: boolean;
    tier?: "high" | "medium" | "low";
  }[];
  alreadyBet: boolean;
}

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const sport = searchParams.get("sport");
    const dateParam = searchParams.get("date");
    const strictGate = searchParams.get("strictGate") === "true";

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const whereClause: Record<string, unknown> = {
      date: { gte: startOfDay, lte: endOfDay },
      validated: false,
    };
    if (sport) whereClause.sport = sport;

    const [predictions, performanceReport] = await Promise.all([
      prisma.prediction.findMany({
        where: whereClause,
        orderBy: [{ confidence: "desc" }, { date: "asc" }],
      }),
      generatePerformanceReport(90, sport || undefined),
    ]);

    const ats = performanceReport.overall.ats;
    const atsWinRate = ats?.winRate ?? 0;
    const gamesDecided = (ats?.wins ?? 0) + (ats?.losses ?? 0);
    const performanceGate = checkPerformanceGate(atsWinRate, gamesDecided);
    // Use fresh biases from report; fall back to persisted if report has none
    const biases = performanceReport.biases ?? (await loadBiasCorrection()) ?? null;

    // Strict gate: when ATS gate fails, return empty recommendations
    const hideRecsDueToGate = strictGate && !performanceGate.passed;

    const predictionIds = predictions.map((p) => p.id);
    const betPredictionIds = new Set<string>();
    if (predictionIds.length > 0) {
      const existingBets = await prisma.betRecord.findMany({
        where: { predictionId: { in: predictionIds } },
        select: { predictionId: true },
      });
      existingBets.forEach((b) => betPredictionIds.add(b.predictionId));
    }

    const recommendations: BetRecommendation[] = predictions.map((pred) => {
      const oddsSnap = pred.oddsSnapshot as OddsSnapshot | null | undefined;
      const rawInput = {
        predictedScore: (pred.predictedScore as { home: number; away: number }) ?? {
          home: 0,
          away: 0,
        },
        predictedSpread: pred.predictedSpread,
        predictedTotal: pred.predictedTotal,
        winProbability: (pred.winProbability as { home: number; away: number }) ?? {
          home: 50,
          away: 50,
        },
        confidence: pred.confidence,
        homeTeam: pred.homeTeam,
        awayTeam: pred.awayTeam,
        sport: pred.sport,
      };
      const input = applyBiasCorrection(rawInput, biases);
      const recs = hideRecsDueToGate ? [] : generateRecommendations(input, oddsSnap);

      const winProb = pred.winProbability as { home: number; away: number } | null;
      const homeWinProb =
        winProb?.home != null
          ? winProb.home > 1
            ? winProb.home
            : winProb.home * 100
          : 50;
      const awayWinProb =
        winProb?.away != null
          ? winProb.away > 1
            ? winProb.away
            : winProb.away * 100
          : 50;

      return {
        id: pred.id,
        predictionId: pred.id,
        gameId: pred.gameId,
        date: pred.date.toISOString(),
        homeTeam: pred.homeTeam,
        awayTeam: pred.awayTeam,
        sport: pred.sport,
        predictedScore: (pred.predictedScore as { home: number; away: number }) ?? {
          home: 0,
          away: 0,
        },
        predictedSpread: pred.predictedSpread,
        predictedTotal: pred.predictedTotal,
        winProbability: { home: homeWinProb, away: awayWinProb },
        confidence: pred.confidence > 1 ? pred.confidence : pred.confidence * 100,
        keyFactors: (pred.keyFactors as string[]) || [],
        alternateSpread: pred.alternateSpread as Record<string, unknown> | null,
        oddsSnapshot: pred.oddsSnapshot as Record<string, unknown> | null,
        valueBets: pred.valueBets as Record<string, unknown>[] | null,
        favorableBets: pred.favorableBets as Array<{ type: string; team?: string; recommendation: string; edge: number; confidence: number; valueRating?: string }> | null,
        recommendedBets: recs.map((r) => ({
          type: r.type,
          side: r.side,
          line: r.line,
          confidence: r.confidence,
          reasoning: r.reasoning,
          ...(r.edge != null && { edge: r.edge }),
          isModelOnly: r.isModelOnly,
          tier: r.tier,
        })),
        alreadyBet: betPredictionIds.has(pred.id),
      };
    });

    const actionableRecs = recommendations.filter((r) => r.recommendedBets.length > 0);
    const hasModelOnlyRecs = actionableRecs.some((r) =>
      r.recommendedBets.some((b) => b.isModelOnly)
    );

    return NextResponse.json({
      date: targetDate.toISOString().split("T")[0],
      totalGames: predictions.length,
      recommendations: actionableRecs,
      lowConfidence: recommendations.filter((r) => r.recommendedBets.length === 0),
      performanceGate: {
        passed: performanceGate.passed,
        atsWinRate: performanceGate.atsWinRate,
        gamesDecided: performanceGate.gamesDecided,
        threshold: performanceGate.threshold,
        strictGateUsed: strictGate,
        recsHiddenDueToGate: hideRecsDueToGate,
      },
      showModelOnlyDisclaimer: hasModelOnlyRecs,
    });
  } catch (error) {
    console.error("Error fetching bet recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
