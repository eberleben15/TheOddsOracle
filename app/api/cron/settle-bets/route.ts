/**
 * Cron Job: Settle Bets Automatically
 *
 * Fetches pending bet records, gets completed game scores from The Odds API,
 * resolves each bet (win/loss/push) and updates the record.
 *
 * Run periodically after games complete (e.g. every 4 hours).
 * Can be triggered manually via Admin > Cron jobs > "settle bets".
 */

import { NextRequest, NextResponse } from "next/server";
import { runSettleBets } from "@/lib/bet-settlement";
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
  console.log("\n🎲 Starting automatic bet settlement job...\n");

  const result = await runSettleBets(1);

  await logJobExecution({
    jobName: "settle-bets",
    status: result.success ? "success" : "failed",
    startedAt: new Date(startTime),
    completedAt: new Date(),
    error: result.errors?.length ? result.errors.join("; ") : undefined,
    metadata: {
      settled: result.settled,
      errorsCount: result.errors.length,
    },
  });

  console.log(
    `✅ Settle bets complete: ${result.settled} bet(s) settled in ${result.duration}ms\n`
  );

  if (!result.success && result.errors.length) {
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
