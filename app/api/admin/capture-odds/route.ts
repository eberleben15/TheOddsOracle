/**
 * Admin API: Manually trigger odds capture
 * 
 * POST /api/admin/capture-odds - Capture odds for all sports
 * GET /api/admin/capture-odds - Get odds history stats
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { captureAllOdds, getOddsHistoryStats, markClosingLines } from "@/lib/odds-history";

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
      // No body or invalid JSON - capture all sports
    }

    const result = await captureAllOdds(sports);
    const closingLinesMarked = await markClosingLines();
    
    return NextResponse.json({
      success: true,
      ...result,
      closingLinesMarked,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getOddsHistoryStats();
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
