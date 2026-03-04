/**
 * Prediction Methods Layer - Type Definitions
 *
 * Typed contracts and metadata for prediction methods (calibration, win prob, etc.).
 * Enables auditability, traceability, and pluggable method swapping.
 */

/** Metadata for a method (id, version, formula, references) */
export interface MethodMetadata {
  id: string;
  version: string;
  name: string;
  description: string;
  formula?: string;
  references?: string[];
  parameters?: Record<string, number | string>;
}

/** Calibration params for Platt scaling */
export interface PlattCalibrationParams {
  method: "platt";
  A: number;
  B: number;
}

/** Single bin for isotonic calibration mapping */
export interface IsotonicBin {
  lower: number;
  upper: number;
  calibrated: number;
}

/** Calibration params for isotonic regression */
export interface IsotonicCalibrationParams {
  method: "isotonic";
  bins: IsotonicBin[];
}

/** Union of all calibration param types */
export type CalibrationParams = PlattCalibrationParams | IsotonicCalibrationParams;

/** Calibration method contract */
export interface CalibrationMethod {
  readonly metadata: MethodMetadata;
  fit(pairs: { predicted: number; actual: number }[]): CalibrationParams;
  apply(prob: number, params: CalibrationParams): number;
}

/** Stored calibration config (includes method + metadata) */
export interface CalibrationConfig {
  method: "platt" | "isotonic";
  params: CalibrationParams;
  metadata?: {
    trainedAt: string;
    sampleSize: number;
    brierScore?: number;
    logLoss?: number;
  };
}
