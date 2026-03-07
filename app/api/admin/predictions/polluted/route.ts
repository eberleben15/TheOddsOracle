/**
 * Admin API: List polluted predictions
 *
 * Polluted = predicted after game started (predictedAt > commenceTime).
 * These used closing-line odds instead of pre-game odds.
 *
 * GET /api/admin/predictions/polluted
 */

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tracked = await prisma.trackedGame.findMany({
      where: {
        predictedAt: { not: null },
        predictionId: { not: null },
      },
    });

    const polluted = tracked.filter((tg) => {
      const predictedAt = tg.predictedAt;
      const commenceTime = tg.commenceTime;
      if (!predictedAt || !commenceTime) return false;
      return predictedAt > commenceTime;
    });

    const items = polluted.map((tg) => {
      const minutesAfter =
        tg.predictedAt && tg.commenceTime
          ? (tg.predictedAt.getTime() - tg.commenceTime.getTime()) / (1000 * 60)
          : null;
      return {
        id: tg.id,
        externalId: tg.externalId,
        predictionId: tg.predictionId,
        sport: tg.sport,
        homeTeam: tg.homeTeam,
        awayTeam: tg.awayTeam,
        commenceTime: tg.commenceTime.toISOString(),
        predictedAt: tg.predictedAt?.toISOString() ?? null,
        minutesAfterStart: minutesAfter,
      };
    });

    return NextResponse.json({
      count: items.length,
      polluted: items,
    });
  } catch (error) {
    console.error("Error fetching polluted predictions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch polluted predictions",
      },
      { status: 500 }
    );
  }
}
