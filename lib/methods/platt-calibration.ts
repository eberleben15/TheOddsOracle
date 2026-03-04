/**
 * Platt Scaling Calibration (Wrapper)
 *
 * Thin wrapper around lib/recalibration.ts implementing the CalibrationMethod interface.
 * Parametric calibration: p_cal = 1 / (1 + exp(-(A*logit(p) + B)))
 *
 * @see lib/recalibration.ts
 */

import { fitPlattScaling, applyPlattScaling, type RecalibrationParams } from "../recalibration";
import type {
  CalibrationParams,
  PlattCalibrationParams,
  MethodMetadata,
} from "./types";

export const PLATT_METADATA: MethodMetadata = {
  id: "platt",
  version: "1.0.0",
  name: "Platt Scaling",
  description: "Parametric logistic calibration. Fits A, B to minimize log loss on historical outcomes.",
  formula: "p_cal = 1 / (1 + exp(-(A * logit(p) + B)))",
  references: [
    "https://en.wikipedia.org/wiki/Platt_scaling",
    "Platt (1999) Probabilistic Outputs for SVMs",
  ],
};

/**
 * Fit Platt scaling from (predicted, actual) pairs.
 */
export function fitPlatt(
  pairs: { predicted: number; actual: number }[]
): PlattCalibrationParams {
  const params = fitPlattScaling(
    pairs.map((p) => ({ predictedHomeWinProb: p.predicted, actualHomeWin: p.actual }))
  );
  return { method: "platt", A: params.A, B: params.B };
}

/**
 * Apply Platt scaling to a raw probability.
 */
export function applyPlatt(prob: number, params: PlattCalibrationParams): number {
  const recalcParams: RecalibrationParams = { A: params.A, B: params.B };
  return applyPlattScaling(prob, recalcParams);
}
