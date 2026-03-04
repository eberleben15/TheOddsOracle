/**
 * Isotonic Regression Calibration
 *
 * Nonparametric probability calibration using Pool Adjacent Violators (PAV).
 * Fits a monotone step function from predicted → calibrated probability.
 * Often outperforms Platt scaling when miscalibration is non-linear.
 *
 * @see https://en.wikipedia.org/wiki/Isotonic_regression
 * @see "Obtaining Well Calibrated Probabilities Using Bayesian Binning" (Naeini et al.)
 */

import type { CalibrationParams, IsotonicCalibrationParams, IsotonicBin, MethodMetadata } from "./types";

const MIN_SAMPLES = 20;
const EPS = 1e-7;

export const ISOTONIC_METADATA: MethodMetadata = {
  id: "isotonic",
  version: "1.0.0",
  name: "Isotonic Regression",
  description: "Nonparametric calibration via monotone step function. Learns bin boundaries and calibrated values from data.",
  formula: "p_cal = f(p) where f is monotone step function fit by PAV",
  references: [
    "https://en.wikipedia.org/wiki/Isotonic_regression",
    "Naeini et al. (2015) Obtaining Well Calibrated Probabilities Using Bayesian Binning",
  ],
};

/**
 * Fit isotonic regression from (predicted, actual) pairs.
 * Uses Pool Adjacent Violators algorithm.
 */
export function fitIsotonic(
  pairs: { predicted: number; actual: number }[]
): IsotonicCalibrationParams {
  if (pairs.length < MIN_SAMPLES) {
    return { method: "isotonic", bins: defaultBins() };
  }

  // Sort by predicted value
  const sorted = [...pairs].sort((a, b) => a.predicted - b.predicted);

  // PAV: blocks are (count, sum_y, min_x, max_x)
  type Block = { n: number; sumY: number; minX: number; maxX: number };
  const blocks: Block[] = sorted.map((p) => ({
    n: 1,
    sumY: p.actual,
    minX: Math.max(0, Math.min(1, p.predicted)),
    maxX: Math.max(0, Math.min(1, p.predicted)),
  }));

  // Pool adjacent violators (monotone increasing in mean)
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < blocks.length - 1; i++) {
      const curr = blocks[i];
      const next = blocks[i + 1];
      const meanCurr = curr.sumY / curr.n;
      const meanNext = next.sumY / next.n;
      if (meanCurr > meanNext) {
        blocks[i] = {
          n: curr.n + next.n,
          sumY: curr.sumY + next.sumY,
          minX: curr.minX,
          maxX: next.maxX,
        };
        blocks.splice(i + 1, 1);
        changed = true;
        break;
      }
    }
  }

  const bins: IsotonicBin[] = blocks.map((b) => {
    const calibrated = Math.max(0.01, Math.min(0.99, b.sumY / b.n));
    return { lower: b.minX, upper: b.maxX, calibrated };
  });

  // Ensure full [0,1] coverage with linear interpolation at edges
  if (bins.length === 0) return { method: "isotonic", bins: defaultBins() };

  const first = bins[0];
  if (first.lower > EPS) {
    bins.unshift({ lower: 0, upper: first.lower, calibrated: first.calibrated });
  }
  const last = bins[bins.length - 1];
  if (last.upper < 1 - EPS) {
    bins.push({ lower: last.upper, upper: 1, calibrated: last.calibrated });
  }

  return { method: "isotonic", bins };
}

function defaultBins(): IsotonicBin[] {
  return [
    { lower: 0, upper: 0.5, calibrated: 0.5 },
    { lower: 0.5, upper: 1, calibrated: 0.5 },
  ];
}

/**
 * Apply isotonic calibration to a raw probability.
 */
export function applyIsotonic(prob: number, params: IsotonicCalibrationParams): number {
  const p = Math.max(0, Math.min(1, prob));
  const { bins } = params;
  if (!bins || bins.length === 0) return p;

  for (const bin of bins) {
    if (p >= bin.lower && p < bin.upper) return bin.calibrated;
    if (p === 1 && bin.upper === 1) return bin.calibrated;
  }

  if (p <= bins[0].lower) return bins[0].calibrated;
  return bins[bins.length - 1].calibrated;
}
