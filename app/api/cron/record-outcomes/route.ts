/**
 * Cron Job: Record Game Outcomes + Train Model
 *
 * Batch job that:
 * 1. Checks ALL unvalidated predictions whose game date has passed
 * 2. Fetches scores for each date and records outcomes
 * 3. Trains model (Platt scaling) from validated predictions and persists params
 *
 * Scheduled to run daily at 2:00 AM (after games complete).
 * Can also be triggered manually via POST /api/admin/predictions/batch-sync
 */

import { NextRequest, NextResponse } from "next/server";
import { runBatchSync } from "@/lib/prediction-feedback-batch";
import { logJobExecution } from "@/lib/job-logger";

function verifyCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      { error: "Unauthorized. Set CRON_SECRET and send Bearer token." },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  console.log("\n📊 Starting batch outcome recording + training job...\n");

  const result = await runBatchSync();

  await logJobExecution({
    jobName: "record-outcomes",
    status: result.success ? "success" : "failed",
    startedAt: new Date(startTime),
    completedAt: new Date(),
    error: result.errors?.length ? result.errors.join("; ") : undefined,
    metadata: {
      unvalidatedChecked: result.unvalidatedChecked,
      outcomesRecorded: result.outcomesRecorded,
      trainingRan: result.trainingRan,
      validatedCount: result.validatedCount,
    },
  });

  console.log(
    `✅ Batch complete: ${result.outcomesRecorded} outcomes recorded, ` +
      `training ${result.trainingRan ? "ran" : "skipped"} (${result.validatedCount} validated)\n`
  );

  if (!result.success && result.errors?.length) {
    return NextResponse.json(
      { ...result, duration: result.duration },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...result,
    duration: result.duration,
  });
}
