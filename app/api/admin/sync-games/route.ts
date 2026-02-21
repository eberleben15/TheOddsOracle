/**
 * Admin API: Game Sync Management
 * 
 * GET - Get sync statistics
 * POST - Trigger manual sync
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { syncGames, getSyncStats } from "@/lib/game-sync";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getSyncStats();
    
    // Get recent tracked games
    const recentGames = await prisma.trackedGame.findMany({
      orderBy: { discoveredAt: "desc" },
      take: 20,
      select: {
        id: true,
        externalId: true,
        sport: true,
        homeTeam: true,
        awayTeam: true,
        commenceTime: true,
        discoveredAt: true,
        predictedAt: true,
        status: true,
      },
    });

    // Get prediction coverage stats
    const predictionStats = await prisma.prediction.groupBy({
      by: ["sport"],
      _count: true,
      where: {
        validated: false,
      },
    });

    return NextResponse.json({
      stats,
      recentGames: recentGames.map((g) => ({
        ...g,
        commenceTime: g.commenceTime.toISOString(),
        discoveredAt: g.discoveredAt.toISOString(),
        predictedAt: g.predictedAt?.toISOString() ?? null,
      })),
      predictionsBySport: predictionStats.reduce(
        (acc, row) => ({ ...acc, [row.sport ?? "unknown"]: row._count }),
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse optional sports filter from body
    let sports: string[] | undefined;
    try {
      const body = await request.json();
      if (body.sports && Array.isArray(body.sports)) {
        sports = body.sports;
      }
    } catch {
      // No body or invalid JSON - sync all sports
    }

    console.log("🔄 Manual sync triggered by admin...", sports ? `Sports: ${sports.join(", ")}` : "All sports");
    const result = await syncGames(sports);
    const stats = await getSyncStats();

    return NextResponse.json({
      success: true,
      result: {
        gamesDiscovered: result.gamesDiscovered,
        newGames: result.newGames,
        predictionsGenerated: result.predictionsGenerated,
        sportBreakdown: result.sportBreakdown,
        duration: result.duration,
        errors: result.errors.slice(0, 10),
      },
      currentStats: stats,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
