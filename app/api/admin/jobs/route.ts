/**
 * Admin API: List recent job executions for cron monitoring
 * GET /api/admin/jobs?limit=50&jobName=generate-predictions
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { getRecentJobExecutions } from "@/lib/job-logger";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "50", 10) || 50);
  const jobName = searchParams.get("jobName") || undefined;

  const jobs = await getRecentJobExecutions(limit, jobName);
  return NextResponse.json({ jobs });
}
