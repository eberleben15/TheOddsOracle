/**
 * Admin API: Today's Bet Recommendations
 * 
 * Returns predictions for today's games ranked by confidence/value
 * GET /api/admin/bets/recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

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

    // Default to today
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch predictions for today that haven't been validated yet (games not started)
    const whereClause: Record<string, unknown> = {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      validated: false,
    };

    if (sport) {
      whereClause.sport = sport;
    }

    const predictions = await prisma.prediction.findMany({
      where: whereClause,
      orderBy: [
        { confidence: "desc" },
        { date: "asc" },
      ],
    });

    // Get existing bet records for these predictions
    const predictionIds = predictions.map(p => p.id);
    const betPredictionIds = new Set<string>();
    if (predictionIds.length > 0) {
      const existingBets = await prisma.betRecord.findMany({
        where: {
          predictionId: { in: predictionIds },
        },
        select: { predictionId: true },
      });
      existingBets.forEach(b => betPredictionIds.add(b.predictionId));
    }

    // Build recommendations
    const recommendations: BetRecommendation[] = predictions.map(pred => {
      const confidence = pred.confidence > 1 ? pred.confidence : pred.confidence * 100;
      const predictedScore = pred.predictedScore as { home: number; away: number } | null;
      const winProb = pred.winProbability as { home: number; away: number } | null;
      const homeWinProb = winProb?.home != null
        ? (winProb.home > 1 ? winProb.home : winProb.home * 100)
        : 50;
      const awayWinProb = winProb?.away != null
        ? (winProb.away > 1 ? winProb.away : winProb.away * 100)
        : 50;
      const scoreHome = predictedScore?.home ?? 0;
      const scoreAway = predictedScore?.away ?? 0;

      // Generate recommended bets based on prediction
      const recommendedBets: BetRecommendation["recommendedBets"] = [];

      // Spread recommendation
      const predictedWinner = scoreHome > scoreAway ? "home" : "away";
      const spreadDiff = Math.abs(scoreHome - scoreAway);
      
      if (confidence >= 55) {
        recommendedBets.push({
          type: "spread",
          side: predictedWinner,
          line: pred.predictedSpread,
          confidence: confidence,
          reasoning: `${predictedWinner === "home" ? pred.homeTeam : pred.awayTeam} predicted to ${predictedWinner === "home" ? "win" : "cover"} by ${spreadDiff.toFixed(1)} points`,
        });
      }

      // Moneyline recommendation for strong favorites
      if (Math.max(homeWinProb, awayWinProb) >= 65) {
        const mlSide = homeWinProb > awayWinProb ? "home" : "away";
        recommendedBets.push({
          type: "moneyline",
          side: mlSide,
          line: null,
          confidence: Math.max(homeWinProb, awayWinProb),
          reasoning: `Strong ${Math.max(homeWinProb, awayWinProb).toFixed(0)}% win probability for ${mlSide === "home" ? pred.homeTeam : pred.awayTeam}`,
        });
      }

      // Total recommendation if we have high confidence on total
      if (pred.predictedTotal && confidence >= 60) {
        const oddsSnap = pred.oddsSnapshot as { total?: number } | null;
        const marketTotal = oddsSnap?.total;
        if (marketTotal) {
          const totalDiff = pred.predictedTotal - marketTotal;
          if (Math.abs(totalDiff) >= 2) {
            recommendedBets.push({
              type: totalDiff > 0 ? "total_over" : "total_under",
              side: totalDiff > 0 ? "over" : "under",
              line: marketTotal,
              confidence: confidence,
              reasoning: `Predicted total ${pred.predictedTotal.toFixed(0)} vs market ${marketTotal} (${totalDiff > 0 ? "+" : ""}${totalDiff.toFixed(1)})`,
            });
          }
        }
      }

      return {
        id: pred.id,
        predictionId: pred.id,
        gameId: pred.gameId,
        date: pred.date.toISOString(),
        homeTeam: pred.homeTeam,
        awayTeam: pred.awayTeam,
        sport: pred.sport,
        predictedScore: predictedScore ?? { home: scoreHome, away: scoreAway },
        predictedSpread: pred.predictedSpread,
        predictedTotal: pred.predictedTotal,
        winProbability: { home: homeWinProb, away: awayWinProb },
        confidence,
        keyFactors: (pred.keyFactors as string[]) || [],
        alternateSpread: pred.alternateSpread as Record<string, unknown> | null,
        oddsSnapshot: pred.oddsSnapshot as Record<string, unknown> | null,
        valueBets: pred.valueBets as Record<string, unknown>[] | null,
        recommendedBets,
        alreadyBet: betPredictionIds.has(pred.id),
      };
    });

    // Filter to only show games with at least one recommended bet
    const actionableRecs = recommendations.filter(r => r.recommendedBets.length > 0);

    return NextResponse.json({
      date: targetDate.toISOString().split("T")[0],
      totalGames: predictions.length,
      recommendations: actionableRecs,
      lowConfidence: recommendations.filter(r => r.recommendedBets.length === 0),
    });
  } catch (error) {
    console.error("Error fetching bet recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
