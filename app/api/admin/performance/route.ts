/**
 * Admin API: Get Performance Metrics
 * 
 * Admin-only endpoint for fetching prediction performance data
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import { generatePerformanceReport } from "@/lib/validation-dashboard";
import { getTrackingStats } from "@/lib/prediction-tracker";

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin();

    // Get query params
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "90");

    // Get performance data
    const [report, stats] = await Promise.all([
      generatePerformanceReport(days),
      getTrackingStats(),
    ]);

    return NextResponse.json({
      stats,
      performance: report,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    console.error("Error fetching performance metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance metrics" },
      { status: 500 }
    );
  }
}

