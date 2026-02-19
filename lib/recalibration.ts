/**
 * Recalibration Module (Platt Scaling)
 *
 * Industry best practice: raw model probabilities often need recalibration.
 * Research shows calibration matters more than accuracy for betting ROI.
 * Platt scaling fits: p_cal = 1 / (1 + exp(A * logit(p) + B))
 *
 * @see https://en.wikipedia.org/wiki/Platt_scaling
 * @see "Machine Learning for Sports Betting: Calibration vs Accuracy" (2024)
 */

export interface RecalibrationParams {
  A: number; // Slope (typically 0.5-2)
  B: number; // Intercept (typically -1 to 1)
}

/** Default passthrough (no recalibration) */
const PASSTHROUGH: RecalibrationParams = { A: 1, B: 0 };

let cachedParams: RecalibrationParams | null = null;

/**
 * Fit Platt scaling parameters from historical (predictedProb, actualOutcome) pairs.
 * actualOutcome: 1 = home win, 0 = away win.
 */
export function fitPlattScaling(
  predictions: { predictedHomeWinProb: number; actualHomeWin: number }[]
): RecalibrationParams {
  if (predictions.length < 20) {
    return PASSTHROUGH;
  }

  const EPS = 1e-7;
  const clamp = (p: number) => Math.max(EPS, Math.min(1 - EPS, p));

  function logLoss(A: number, B: number): number {
    let sum = 0;
    for (const { predictedHomeWinProb, actualHomeWin } of predictions) {
      const p = clamp(predictedHomeWinProb);
      const logit = Math.log(p / (1 - p));
      const pCal = 1 / (1 + Math.exp(-(A * logit + B)));
      const pClamped = clamp(pCal);
      sum -=
        actualHomeWin * Math.log(pClamped) + (1 - actualHomeWin) * Math.log(1 - pClamped);
    }
    return sum / predictions.length;
  }

  let bestA = 1;
  let bestB = 0;
  let bestLoss = logLoss(1, 0);

  for (let A = 0.5; A <= 2; A += 0.1) {
    for (let B = -0.5; B <= 0.5; B += 0.1) {
      const loss = logLoss(A, B);
      if (loss < bestLoss) {
        bestLoss = loss;
        bestA = A;
        bestB = B;
      }
    }
  }

  return { A: bestA, B: bestB };
}

/**
 * Apply Platt scaling to a raw home win probability (0-1).
 */
export function applyPlattScaling(
  rawHomeWinProb: number,
  params: RecalibrationParams = cachedParams ?? PASSTHROUGH
): number {
  const p = Math.max(1e-7, Math.min(1 - 1e-7, rawHomeWinProb));
  const logit = Math.log(p / (1 - p));
  const pCal = 1 / (1 + Math.exp(-(params.A * logit + params.B)));
  return Math.max(0.01, Math.min(0.99, pCal));
}

/**
 * Set cached recalibration params (e.g. from a backtest job).
 * Call with null to reset to passthrough.
 */
export function setRecalibrationParams(params: RecalibrationParams | null): void {
  cachedParams = params;
}

/**
 * Get current recalibration params.
 */
export function getRecalibrationParams(): RecalibrationParams | null {
  return cachedParams;
}

/**
 * Fit recalibration from validation results and optionally set as active params.
 */
export function fitFromValidations(
  validations: { homeWinProb: number; actualWinner: 'home' | 'away' }[],
  setAsActive = true
): RecalibrationParams {
  const pairs = validations.map((v) => ({
    predictedHomeWinProb: v.homeWinProb / 100,
    actualHomeWin: v.actualWinner === 'home' ? 1 : 0,
  }));
  const params = fitPlattScaling(pairs);
  if (setAsActive) {
    cachedParams = params;
  }
  return params;
}
