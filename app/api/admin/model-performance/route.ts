/**
 * Admin API: Model Performance & Config
 *
 * GET: Returns evaluation metrics, calibration chart data, config, trends
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { generatePerformanceReport } from "@/lib/validation-dashboard";
import { buildTrainingDataset, getDatasetStats } from "@/lib/training-dataset";
import { runEvaluation } from "@/lib/evaluation-harness";
import {
  loadRecalibrationWithMetadata,
  loadBiasCorrection,
  loadVarianceModel,
  loadNumSimulations,
} from "@/lib/prediction-feedback-batch";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const sport = searchParams.get("sport") || undefined;

    const [performanceReport, examples, recal, bias, varianceModel, numSimulations] = await Promise.all([
      generatePerformanceReport(90, sport),
      buildTrainingDataset({ sport, limit: 5000 }),
      loadRecalibrationWithMetadata(),
      loadBiasCorrection(),
      loadVarianceModel(),
      loadNumSimulations(),
    ]);

    const stats = getDatasetStats(examples);
    const evaluation = examples.length > 0 ? runEvaluation(examples) : null;

    const calibrationBins = performanceReport.overall.calibration?.bins ?? [];

    return NextResponse.json({
      dataset: {
        ...stats,
      },
      evaluation: evaluation
        ? {
            brierScore: evaluation.brierScore,
            logLoss: evaluation.logLoss,
            winnerAccuracy: evaluation.winnerAccuracy,
            spreadMAE: evaluation.spreadMAE,
            totalMAE: evaluation.totalMAE,
            ats: evaluation.ats,
            overUnder: evaluation.overUnder,
          }
        : null,
      calibrationChart: calibrationBins.map((b) => ({
        bucket: b.bucket,
        predicted: b.predicted,
        actual: b.actual,
        count: b.count,
      })),
      calibrationMetrics: performanceReport.overall.calibration
        ? {
            brierScore: performanceReport.overall.calibration.brierScore,
            expectedCalibrationError:
              performanceReport.overall.calibration.expectedCalibrationError,
          }
        : null,
      trends: performanceReport.trends.slice(0, 12).reverse(),
      bySport: performanceReport.bySport
        ? Object.entries(performanceReport.bySport).map(([s, m]) => ({
            sport: s,
            gameCount: m.gameCount,
            winnerAccuracy: m.accuracy.winner,
            spreadMAE: m.meanAbsoluteError.spread,
            ats: m.ats,
          }))
        : [],
      config: {
        recalibration: recal
          ? {
              A: recal.params.A,
              B: recal.params.B,
              metadata: recal.metadata,
            }
          : null,
        biasCorrection: bias,
      },
      varianceModel: varianceModel
        ? { baseVariance: varianceModel.baseVariance, estimatedAt: varianceModel.estimatedAt }
        : null,
      numSimulations,
    });
  } catch (error) {
    console.error("Model performance API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
