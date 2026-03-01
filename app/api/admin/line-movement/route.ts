/**
 * Admin API: Line Movement Monitoring
 * 
 * GET /api/admin/line-movement
 *   - Returns current line movements and their status
 * 
 * POST /api/admin/line-movement
 *   - Triggers manual re-prediction for games with significant movement
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { getGamesWithSignificantMovement } from "@/lib/line-movement-reprediction";
import { runLineMovementReprediction } from "@/lib/line-movement-reprediction";
import { DEFAULT_THRESHOLDS, type LineMovementThresholds } from "@/lib/odds-movement-monitor";

const SPORTS = [
  'basketball_ncaab',
  'basketball_nba', 
  'icehockey_nhl',
  'baseball_mlb',
  'americanfootball_nfl',
  'americanfootball_ncaaf',
];

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");
  
  // Parse custom thresholds if provided
  const thresholds: LineMovementThresholds = { ...DEFAULT_THRESHOLDS };
  
  if (searchParams.get("spreadThreshold")) {
    thresholds.spreadThreshold = parseFloat(searchParams.get("spreadThreshold")!);
  }
  if (searchParams.get("totalThreshold")) {
    thresholds.totalThreshold = parseFloat(searchParams.get("totalThreshold")!);
  }
  if (searchParams.get("moneylineThreshold")) {
    thresholds.moneylineThreshold = parseFloat(searchParams.get("moneylineThreshold")!);
  }

  try {
    const sports = sport ? [sport] : SPORTS;
    const movements = await getGamesWithSignificantMovement(sports, thresholds);
    
    // Group by eligibility
    const pending = movements.filter(m => m.shouldRepredict);
    const inCooldown = movements.filter(m => !m.shouldRepredict && m.repredictionCount > 0);
    const maxedOut = movements.filter(m => m.repredictionCount >= thresholds.maxRepredictionsPerGame);
    
    return NextResponse.json({
      success: true,
      thresholds,
      summary: {
        total: movements.length,
        pendingReprediction: pending.length,
        inCooldown: inCooldown.length,
        maxedOut: maxedOut.length,
        significantSpread: movements.filter(m => m.significantSpreadMove).length,
        significantTotal: movements.filter(m => m.significantTotalMove).length,
        significantMl: movements.filter(m => m.significantMlMove).length,
      },
      movements: movements.map(m => ({
        ...m,
        gameTimeFormatted: m.gameTime.toISOString(),
        lastRepredictedAtFormatted: m.lastRepredictedAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("[Admin line-movement] Error:", error);
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
    const body = await request.json().catch(() => ({}));
    const { sports: requestSports, thresholds: customThresholds } = body;
    
    const sports = requestSports || SPORTS;
    const thresholds = customThresholds 
      ? { ...DEFAULT_THRESHOLDS, ...customThresholds }
      : DEFAULT_THRESHOLDS;
    
    const result = await runLineMovementReprediction(sports, thresholds);
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Admin line-movement] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
