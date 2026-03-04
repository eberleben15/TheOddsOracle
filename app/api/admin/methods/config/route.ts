/**
 * Admin API: Update Calibration Method Config
 *
 * PATCH: Set active calibration method (platt | isotonic)
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import {
  ensureCalibrationConfig,
  saveCalibrationConfig,
} from "@/lib/prediction-feedback-batch";
import { setCalibrationConfig, setRecalibrationParams } from "@/lib/recalibration";
import type { CalibrationMethodId } from "@/lib/methods/registry";

export async function PATCH(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const method = body.activeMethod as string | undefined;

    if (!method || (method !== "platt" && method !== "isotonic")) {
      return NextResponse.json(
        { error: "activeMethod must be 'platt' or 'isotonic'" },
        { status: 400 }
      );
    }

    const config = await ensureCalibrationConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Need 20+ validated predictions. Run batch sync or Train Model first." },
        { status: 400 }
      );
    }

    const updated: typeof config = {
      ...config,
      activeMethod: method as CalibrationMethodId,
    };

    await saveCalibrationConfig(updated);

    if (method === "platt" && config.platt) {
      setRecalibrationParams(config.platt);
      setCalibrationConfig({ method: "platt", params: { method: "platt", ...config.platt } });
    } else if (method === "isotonic" && config.isotonic?.bins?.length) {
      setRecalibrationParams(null);
      setCalibrationConfig({
        method: "isotonic",
        params: { method: "isotonic", bins: config.isotonic.bins },
      });
    }

    return NextResponse.json({ success: true, activeMethod: method });
  } catch (error) {
    console.error("Methods config update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
