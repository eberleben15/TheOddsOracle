/**
 * Admin API: Get Prediction Stats
 * 
 * Returns current prediction tracking statistics including CLV metrics
 * and model performance metrics.
 * Supports filtering by sport via ?sport= query param
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { getOddsHistoryStats } from "@/lib/odds-history";
import { generatePerformanceReport } from "@/lib/validation-dashboard";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const sport = searchParams.get("sport");

    // Base where clause for sport filtering
    const sportWhere = sport ? { sport } : {};

    // Get stats filtered by sport
    const [total, validated] = await Promise.all([
      prisma.prediction.count({ where: sportWhere }),
      prisma.prediction.count({ where: { ...sportWhere, validated: true } }),
    ]);

    const stats = {
      total,
      validated,
      unvalidated: total - validated,
    };

    // Get odds history stats (filtered by sport if provided)
    const oddsHistoryStats = await getOddsHistoryStats(sport || undefined);
    
    // Get additional breakdown by sport (always return full breakdown for tabs)
    const bySport = await prisma.prediction.groupBy({
      by: ["sport"],
      _count: true,
    });

    const validatedBySport = await prisma.prediction.groupBy({
      by: ["sport"],
      where: { validated: true },
      _count: true,
    });

    const sportBreakdown: Record<string, { total: number; validated: number }> = {};
    for (const row of bySport) {
      const sportKey = row.sport ?? "unknown";
      sportBreakdown[sportKey] = { total: row._count, validated: 0 };
    }
    for (const row of validatedBySport) {
      const sportKey = row.sport ?? "unknown";
      if (sportBreakdown[sportKey]) {
        sportBreakdown[sportKey].validated = row._count;
      }
    }

    // Get CLV statistics for validated predictions (filtered by sport)
    const predictionsWithClv = await prisma.prediction.findMany({
      where: {
        ...sportWhere,
        validated: true,
        clvSpread: { not: null },
      },
      select: {
        clvSpread: true,
        sport: true,
      },
    });

    const clvStats = {
      totalWithClv: predictionsWithClv.length,
      avgClv: predictionsWithClv.length > 0
        ? predictionsWithClv.reduce((sum, p) => sum + (p.clvSpread ?? 0), 0) / predictionsWithClv.length
        : null,
      positiveCLV: predictionsWithClv.filter((p) => (p.clvSpread ?? 0) > 0).length,
      negativeCLV: predictionsWithClv.filter((p) => (p.clvSpread ?? 0) < 0).length,
      zeroCLV: predictionsWithClv.filter((p) => (p.clvSpread ?? 0) === 0).length,
    };

    // Get model performance report (filtered by sport)
    const performanceReport = await generatePerformanceReport(90, sport || undefined);

    return NextResponse.json({
      stats,
      sportBreakdown,
      oddsHistoryStats,
      clvStats,
      performance: {
        winnerAccuracy: performanceReport.overall.accuracy.winner,
        spreadMAE: performanceReport.overall.meanAbsoluteError.spread,
        spreadWithin3: performanceReport.overall.accuracy.spreadWithin3,
        spreadWithin5: performanceReport.overall.accuracy.spreadWithin5,
        gamesValidated: performanceReport.overall.gameCount,
        biases: performanceReport.biases,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
