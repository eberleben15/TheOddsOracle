/**
 * Admin API: Prediction Methods Registry & Config
 *
 * GET: Returns methods metadata, current calibration config, calibration chart,
 * factor contributions, and Platt vs Isotonic comparison.
 */

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { getAllMethodsMetadata } from "@/lib/methods/registry";
import { applyPlatt, applyIsotonic } from "@/lib/methods";
import {
  ensureCalibrationConfig,
  loadRecalibrationWithMetadata,
} from "@/lib/prediction-feedback-batch";
import { generatePerformanceReport } from "@/lib/validation-dashboard";
import { buildTrainingDataset } from "@/lib/training-dataset";
import { brierScore, logLoss } from "@/lib/evaluation-harness";
function avgAbs(values: (number | null | undefined)[]): number {
  const filtered = values.filter((v) => v != null) as number[];
  if (filtered.length === 0) return 0;
  return filtered.reduce((s, v) => s + Math.abs(v), 0) / filtered.length;
}

export async function GET() {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [methods, calibrationConfig, recal, performanceReport, examples] =
      await Promise.all([
        Promise.resolve(getAllMethodsMetadata()),
        ensureCalibrationConfig(),
        loadRecalibrationWithMetadata(),
        generatePerformanceReport(90),
        buildTrainingDataset({ limit: 500 }),
      ]);

    const calibrationBins = performanceReport.overall.calibration?.bins ?? [];
    const calibrationMetrics = performanceReport.overall.calibration
      ? {
          brierScore: performanceReport.overall.calibration.brierScore,
          expectedCalibrationError:
            performanceReport.overall.calibration.expectedCalibrationError,
        }
      : null;

    // Build calibration config for display (support both new config and legacy)
    let activeMethod: "platt" | "isotonic" = "platt";
    let plattParams: { A: number; B: number } | null = null;
    let isotonicParams: { binCount: number } | null = null;
    let metadata: { trainedAt?: string; validatedCount?: number; brierScore?: number; logLoss?: number } | null = null;

    if (calibrationConfig) {
      activeMethod = calibrationConfig.activeMethod;
      metadata = calibrationConfig.metadata ?? null;
      if (calibrationConfig.platt) {
        plattParams = calibrationConfig.platt;
      }
      if (calibrationConfig.isotonic?.bins) {
        isotonicParams = { binCount: calibrationConfig.isotonic.bins.length };
      }
    } else if (recal) {
      plattParams = recal.params;
      metadata = recal.metadata ?? null;
    }

    // Factor contribution chart: average |value| across examples with trace
    const withTrace = examples.filter(
      (ex) =>
        ex.fourFactorsScore != null ||
        ex.efficiencyScore != null ||
        ex.tempoAdjustment != null
    );
    const factorContributions = withTrace.length > 0
      ? [
          { factor: "Four Factors", value: avgAbs(withTrace.map((e) => e.fourFactorsScore)) },
          { factor: "Efficiency", value: avgAbs(withTrace.map((e) => e.efficiencyScore)) },
          { factor: "Tempo", value: avgAbs(withTrace.map((e) => e.tempoAdjustment)) },
          { factor: "Home Adv", value: avgAbs(withTrace.map((e) => e.homeAdvantage)) },
          { factor: "Momentum", value: avgAbs(withTrace.map((e) => e.momentumScore)) },
        ].filter((f) => f.value > 0)
      : [];

    // Platt vs Isotonic comparison (when both available)
    let methodComparison: {
      platt: { brierScore: number; logLoss: number };
      isotonic: { brierScore: number; logLoss: number };
    } | null = null;
    if (
      calibrationConfig?.platt &&
      calibrationConfig?.isotonic?.bins?.length &&
      examples.length >= 10
    ) {
      const plattExamples = examples.map((ex) => ({
        ...ex,
        homeWinProb: applyPlatt(ex.homeWinProbRaw, {
          method: "platt",
          A: calibrationConfig!.platt!.A,
          B: calibrationConfig!.platt!.B,
        }),
      }));
      const isotonicExamples = examples.map((ex) => ({
        ...ex,
        homeWinProb: applyIsotonic(ex.homeWinProbRaw, {
          method: "isotonic",
          bins: calibrationConfig!.isotonic!.bins,
        }),
      }));
      methodComparison = {
        platt: {
          brierScore: brierScore(plattExamples),
          logLoss: logLoss(plattExamples),
        },
        isotonic: {
          brierScore: brierScore(isotonicExamples),
          logLoss: logLoss(isotonicExamples),
        },
      };
    }

    return NextResponse.json({
      methods,
      calibration: {
        activeMethod,
        platt: plattParams,
        isotonic: isotonicParams,
        metadata,
      },
      calibrationChart: calibrationBins.map((b) => ({
        bucket: b.bucket,
        predicted: b.predicted,
        actual: b.actual,
        count: b.count,
      })),
      calibrationMetrics,
      factorContributions,
      methodComparison,
      traceSampleCount: examples.length,
    });
  } catch (error) {
    console.error("Methods API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
