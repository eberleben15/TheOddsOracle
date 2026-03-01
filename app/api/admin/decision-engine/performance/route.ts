/**
 * Admin API: Decision Engine Performance
 *
 * GET: Retrieve performance metrics for decision engine runs
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import {
  analyzeDecisionEnginePerformance,
  calculateRegret,
} from "@/lib/decision-engine-tracking";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const configVersionParam = searchParams.get("version");
    const days = parseInt(searchParams.get("days") || "30");
    
    // Get current config version if not specified
    let configVersion = configVersionParam ? parseInt(configVersionParam) : 0;
    if (configVersion === 0) {
      const config = await prisma.modelConfig.findUnique({
        where: { key: "ats_pipeline_config" },
      });
      if (config?.value && typeof config.value === "object") {
        configVersion = (config.value as any).version ?? 1;
      }
    }
    
    const performance = await analyzeDecisionEnginePerformance(configVersion, days);
    
    // Get recent runs for details
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const recentRuns = await prisma.decisionEngineRun.findMany({
      where: {
        configVersion,
        validated: true,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: "desc" },
      take: 20,
      select: {
        id: true,
        timestamp: true,
        selectedCount: true,
        actualATS: true,
        actualNetUnits: true,
        maxDrawdown: true,
        sport: true,
      },
    });
    
    return NextResponse.json({
      configVersion,
      performance,
      recentRuns,
    });
  } catch (error) {
    console.error("Decision engine performance API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
