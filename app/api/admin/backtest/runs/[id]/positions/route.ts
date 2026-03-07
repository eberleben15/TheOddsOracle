/**
 * Admin API: Get Backtest Positions for a Run
 * GET /api/admin/backtest/runs/[id]/positions
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const positions = await prisma.backtestPosition.findMany({
      where: { backtestRunId: id },
      orderBy: { positionIndex: "asc" },
    });

    return NextResponse.json({ positions });
  } catch (error) {
    console.error("[backtest/runs/[id]/positions] Error:", error);
    return NextResponse.json(
      { error: "Failed to load positions" },
      { status: 500 }
    );
  }
}
