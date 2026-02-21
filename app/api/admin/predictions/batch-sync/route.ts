/**
 * Admin API: Trigger batch outcome recording + training
 *
 * POST /api/admin/predictions/batch-sync
 * Runs the full batch: check all scored games, record outcomes, train model.
 * Admin-only.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { runBatchSync, loadRecalibrationParams } from "@/lib/prediction-feedback-batch";

export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("mode"); // "sync" | "train" | null (full)
  
  const options = {
    syncOnly: mode === "sync",
    trainOnly: mode === "train",
  };

  const result = await runBatchSync(options);
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await loadRecalibrationParams();
  return NextResponse.json({
    recalibrationParams: params,
    message: params
      ? `Platt scaling active: A=${params.A}, B=${params.B}`
      : "No recalibration params stored. Run batch sync to train.",
  });
}
