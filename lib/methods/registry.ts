/**
 * Prediction Methods Registry
 *
 * Central registry of methods and metadata for admin API and traceability.
 */

import type { MethodMetadata } from "./types";
import { PLATT_METADATA } from "./platt-calibration";
import { ISOTONIC_METADATA } from "./isotonic-calibration";

export type CalibrationMethodId = "platt" | "isotonic";

const CALIBRATION_METHODS: Record<CalibrationMethodId, MethodMetadata> = {
  platt: PLATT_METADATA,
  isotonic: ISOTONIC_METADATA,
};

/** Win probability method metadata (current: Four Factors + efficiency) */
export const WIN_PROB_METADATA: MethodMetadata = {
  id: "fourFactors",
  version: "1.0.0",
  name: "Four Factors + Efficiency",
  description:
    "Dean Oliver Four Factors (eFG%, TOV%, ORB%, FTR) with schedule-adjusted efficiency blend. Logistic link for win prob.",
  formula:
    "homeWinProb = 1 / (1 + exp(-totalScore/8)); totalScore = fourFactors + tempo + homeAdv + momentum",
  references: [
    "Dean Oliver, Basketball on Paper",
    "docs/PREDICTION_METHODOLOGY.md",
  ],
  parameters: {
    efgWeight: 0.4,
    tovWeight: 0.125,
    orbWeight: 0.15,
    ftrWeight: 0.09,
    divisor: 8,
  },
};

/** Spread cover method metadata (current: tanh on z-score) */
export const SPREAD_COVER_METADATA: MethodMetadata = {
  id: "spreadTanh",
  version: "1.0.0",
  name: "Spread Cover (Tanh Z-Score)",
  description:
    "P(cover) = 0.5 + 0.5*tanh(z) where z = (predictedMargin - marginNeeded) / stdDev. Fixed stdDev=10.",
  formula: "P(cover) = 0.5 + 0.5 * tanh((predictedMargin - marginNeeded) / 10)",
  references: ["lib/recommendation-engine.ts", "lib/favorable-bet-engine.ts"],
  parameters: { stdDev: 10 },
};

/** Total over/under method metadata */
export const TOTAL_OVER_UNDER_METADATA: MethodMetadata = {
  id: "totalTanh",
  version: "1.0.0",
  name: "Total Over/Under (Tanh)",
  description: "P(over) = 0.5 + 0.5*tanh((ourTotal - line)/10). Future: replace with fitted GLM.",
  formula: "P(over) = 0.5 + 0.5 * tanh((ourTotal - line) / 10)",
  references: ["lib/favorable-bet-engine.ts"],
  parameters: { scale: 10 },
};

/**
 * Get metadata for a calibration method.
 */
export function getCalibrationMethodMetadata(
  id: CalibrationMethodId
): MethodMetadata {
  return CALIBRATION_METHODS[id] ?? PLATT_METADATA;
}

/**
 * List all registered calibration methods.
 */
export function listCalibrationMethods(): MethodMetadata[] {
  return Object.values(CALIBRATION_METHODS);
}

/**
 * List all prediction methods (for admin display).
 */
export function getAllMethodsMetadata(): {
  calibration: MethodMetadata[];
  winProb: MethodMetadata;
  spreadCover: MethodMetadata;
  totalOverUnder: MethodMetadata;
} {
  return {
    calibration: listCalibrationMethods(),
    winProb: WIN_PROB_METADATA,
    spreadCover: SPREAD_COVER_METADATA,
    totalOverUnder: TOTAL_OVER_UNDER_METADATA,
  };
}
