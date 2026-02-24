/**
 * Admin API: Update Model Config
 *
 * PATCH: Save recalibration params and/or bias corrections
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import {
  saveRecalibrationParams,
  saveBiasCorrection,
} from "@/lib/prediction-feedback-batch";
import { setRecalibrationParams } from "@/lib/recalibration";
import type { BiasCorrection } from "@/lib/recommendation-engine";

export async function PATCH(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.recalibration != null) {
      const { A, B } = body.recalibration;
      if (typeof A !== "number" || typeof B !== "number") {
        return NextResponse.json(
          { error: "recalibration must have A and B as numbers" },
          { status: 400 }
        );
      }
      const params = { A, B };
      setRecalibrationParams(params);
      await saveRecalibrationParams(params, {
        trainedAt: new Date().toISOString(),
        validatedCount: 0,
        metrics: undefined,
      });
    }

    if (body.biasCorrection != null) {
      const b = body.biasCorrection as Record<string, unknown>;
      const bias: BiasCorrection = {};
      if (typeof b.homeTeamBias === "number") bias.homeTeamBias = b.homeTeamBias;
      if (typeof b.awayTeamBias === "number") bias.awayTeamBias = b.awayTeamBias;
      if (typeof b.scoreBias === "number") bias.scoreBias = b.scoreBias;
      await saveBiasCorrection(bias);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Model config update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
