/**
 * Admin API: Manually trigger a cron job
 *
 * POST /api/admin/cron/trigger
 * Body: { job: "generate-predictions" | "record-outcomes" | "refresh-team-stats" }
 * Admin-only. Proxies to the cron endpoint with CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";

const ALLOWED_JOBS = ["generate-predictions", "record-outcomes", "refresh-team-stats"] as const;

export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set. Cannot trigger cron jobs." },
      { status: 503 }
    );
  }

  let body: { job?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const job = body.job;
  if (!job || !ALLOWED_JOBS.includes(job as (typeof ALLOWED_JOBS)[number])) {
    return NextResponse.json(
      { error: `job must be one of: ${ALLOWED_JOBS.join(", ")}` },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const base = `${url.protocol}//${url.host}`;
  const cronUrl = `${base}/api/cron/${job}`;

  try {
    const res = await fetch(cronUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error || `Cron job returned ${res.status}`, ...data },
        { status: res.status }
      );
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[Admin] Failed to trigger ${job}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to trigger cron job" },
      { status: 500 }
    );
  }
}
