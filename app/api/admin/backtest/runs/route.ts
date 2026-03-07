/**
 * Admin API: List Backtest Runs
 * GET /api/admin/backtest/runs
 * Query params: limit (default 20)
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") ?? "20", 10) || 20,
      100
    );

    const runs = await prisma.backtestRun.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { positions: true } },
      },
    });

    const result = runs.map((r) => ({
      id: r.id,
      name: r.name,
      strategyType: r.strategyType,
      strategyParams: r.strategyParams,
      dateRangeStart: r.dateRangeStart.toISOString(),
      dateRangeEnd: r.dateRangeEnd.toISOString(),
      sport: r.sport,
      metrics: r.metrics as Record<string, unknown>,
      createdAt: r.createdAt.toISOString(),
      positionCount: r._count.positions,
    }));

    return NextResponse.json({ runs: result });
  } catch (error) {
    console.error("[backtest/runs] Error:", error);
    return NextResponse.json(
      { error: "Failed to load backtest runs" },
      { status: 500 }
    );
  }
}
