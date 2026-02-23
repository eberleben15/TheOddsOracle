/**
 * Admin API: Get Single Prediction Details
 * 
 * GET /api/admin/predictions/[id] - Fetch comprehensive prediction details
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
    const prediction = await prisma.prediction.findUnique({
      where: { id },
    });

    if (!prediction) {
      return NextResponse.json({ error: "Prediction not found" }, { status: 404 });
    }

    // Get prediction history
    const history = await prisma.predictionHistory.findMany({
      where: { predictionId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Get odds history for this game
    const oddsHistory = await prisma.oddsHistory.findMany({
      where: { gameId: prediction.gameId },
      orderBy: { capturedAt: "asc" },
    });

    // Get tracked game info if available
    const trackedGame = await prisma.trackedGame.findFirst({
      where: { externalId: prediction.gameId },
    });

    return NextResponse.json({
      prediction,
      history,
      oddsHistory,
      trackedGame,
    });
  } catch (error) {
    console.error("Error fetching prediction:", error);
    return NextResponse.json(
      { error: "Failed to fetch prediction" },
      { status: 500 }
    );
  }
}
