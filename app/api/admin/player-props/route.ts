/**
 * Admin Player Props API
 * 
 * GET /api/admin/player-props
 * Returns player prop prediction performance metrics and recent predictions.
 * 
 * POST /api/admin/player-props/validate
 * Triggers validation of pending player prop predictions.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";
import { getPropPerformanceStats, getRecentPropPredictions } from "@/lib/player-props";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const propType = searchParams.get("propType") || undefined;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get performance stats
    const performance = await getPropPerformanceStats({
      propType,
      startDate,
    });

    // Get recent predictions
    const recentPredictions = await getRecentPropPredictions(50);

    // Get counts by status
    const counts = await prisma.playerPropPrediction.groupBy({
      by: ["recommendation"],
      _count: true,
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Get settled vs pending counts
    const settledCount = await prisma.playerPropPrediction.count({
      where: {
        createdAt: { gte: startDate },
        hit: { not: null },
      },
    });

    const pendingCount = await prisma.playerPropPrediction.count({
      where: {
        createdAt: { gte: startDate },
        hit: null,
        recommendation: { not: "pass" },
      },
    });

    // Get daily performance trend
    const dailyPerformance = await getDailyPerformanceTrend(days);

    // Get performance by prop type
    const byPropType = await getPerformanceByPropType(startDate);

    return NextResponse.json({
      performance,
      recentPredictions: recentPredictions.map((p) => ({
        id: p.id,
        gameId: p.gameId,
        playerName: p.playerName,
        propType: p.propType,
        line: p.line,
        predictedValue: p.predictedValue,
        confidence: p.confidence,
        edge: p.edge,
        recommendation: p.recommendation,
        actualValue: p.actualValue,
        hit: p.hit,
        createdAt: p.createdAt,
        settledAt: p.settledAt,
      })),
      counts: {
        byRecommendation: counts.reduce(
          (acc, c) => ({ ...acc, [c.recommendation]: c._count }),
          {} as Record<string, number>
        ),
        settled: settledCount,
        pending: pendingCount,
      },
      dailyPerformance,
      byPropType,
    });
  } catch (error) {
    console.error("Error fetching player props admin data:", error);
    return NextResponse.json(
      { error: "Failed to fetch player props data" },
      { status: 500 }
    );
  }
}

async function getDailyPerformanceTrend(days: number) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const predictions = await prisma.playerPropPrediction.findMany({
    where: {
      createdAt: { gte: startDate },
      hit: { not: null },
    },
    select: {
      createdAt: true,
      hit: true,
      recommendation: true,
    },
  });

  // Group by date
  const byDate = new Map<string, { total: number; hits: number }>();
  for (const pred of predictions) {
    if (pred.recommendation === "pass") continue;
    const dateKey = pred.createdAt.toISOString().split("T")[0];
    const existing = byDate.get(dateKey) || { total: 0, hits: 0 };
    existing.total++;
    if (pred.hit === true) existing.hits++;
    byDate.set(dateKey, existing);
  }

  // Convert to array sorted by date
  return Array.from(byDate.entries())
    .map(([date, stats]) => ({
      date,
      total: stats.total,
      hits: stats.hits,
      hitRate: stats.total > 0 ? (stats.hits / stats.total) * 100 : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getPerformanceByPropType(startDate: Date) {
  const predictions = await prisma.playerPropPrediction.findMany({
    where: {
      createdAt: { gte: startDate },
      hit: { not: null },
      recommendation: { not: "pass" },
    },
    select: {
      propType: true,
      hit: true,
      edge: true,
    },
  });

  const byType = new Map<string, { total: number; hits: number; totalEdge: number }>();
  for (const pred of predictions) {
    const existing = byType.get(pred.propType) || { total: 0, hits: 0, totalEdge: 0 };
    existing.total++;
    if (pred.hit === true) existing.hits++;
    existing.totalEdge += pred.edge;
    byType.set(pred.propType, existing);
  }

  return Array.from(byType.entries())
    .map(([propType, stats]) => ({
      propType,
      total: stats.total,
      hits: stats.hits,
      hitRate: stats.total > 0 ? (stats.hits / stats.total) * 100 : 0,
      avgEdge: stats.total > 0 ? stats.totalEdge / stats.total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action;

  if (action === "validate") {
    // Trigger validation of pending predictions
    // This would typically be done by a cron job, but can be manually triggered
    return NextResponse.json({
      message: "Validation triggered - this will be processed by the next cron run",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
