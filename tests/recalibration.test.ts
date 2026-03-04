import { describe, it, expect, beforeEach } from "vitest";
import {
  applyPlattScaling,
  fitPlattScaling,
  fitFromValidations,
  setRecalibrationParams,
  setCalibrationConfig,
  applyCalibration,
  isRecalibrationActive,
} from "@/lib/recalibration";

describe("applyPlattScaling", () => {
  it("returns passthrough when params are default (A=1, B=0)", () => {
    expect(applyPlattScaling(0.5, { A: 1, B: 0 })).toBeCloseTo(0.5);
    expect(applyPlattScaling(0.7, { A: 1, B: 0 })).toBeCloseTo(0.7);
  });

  it("clamps input to valid probability range", () => {
    const result = applyPlattScaling(1.5, { A: 1, B: 0 });
    expect(result).toBeGreaterThanOrEqual(0.01);
    expect(result).toBeLessThanOrEqual(0.99);
  });

  it("adjusts probability when A differs from 1", () => {
    const raw = 0.7;
    const calibrated = applyPlattScaling(raw, { A: 1.5, B: 0 });
    expect(calibrated).not.toBe(raw);
  });
});

describe("fitPlattScaling", () => {
  it("returns passthrough for fewer than 20 samples", () => {
    const pairs = Array(10)
      .fill(null)
      .map((_, i) => ({
        predictedHomeWinProb: 0.6,
        actualHomeWin: i % 2,
      }));
    const params = fitPlattScaling(pairs);
    expect(params.A).toBe(1);
    expect(params.B).toBe(0);
  });

  it("returns fitted params for 20+ samples", () => {
    const pairs = Array(25)
      .fill(null)
      .map((_, i) => ({
        predictedHomeWinProb: 0.5 + (i % 5) * 0.1,
        actualHomeWin: i % 3 === 0 ? 1 : 0,
      }));
    const params = fitPlattScaling(pairs);
    expect(params.A).toBeGreaterThan(0);
    expect(params.A).toBeLessThanOrEqual(2);
    expect(params.B).toBeGreaterThanOrEqual(-0.5);
    expect(params.B).toBeLessThanOrEqual(0.5);
  });
});

describe("fitFromValidations", () => {
  it("converts homeWinProb 0-100 to 0-1 and actualWinner to 0/1", () => {
    const validations = Array(25)
      .fill(null)
      .map((_, i) => ({
        homeWinProb: 60 + i,
        actualWinner: (i % 2 === 0 ? "home" : "away") as "home" | "away",
      }));
    const params = fitFromValidations(validations, false);
    expect(params).toHaveProperty("A");
    expect(params).toHaveProperty("B");
  });
});

describe("applyCalibration", () => {
  beforeEach(() => {
    setRecalibrationParams(null);
    setCalibrationConfig(null);
  });

  it("uses Platt when calibration config is platt", () => {
    setCalibrationConfig({
      method: "platt",
      params: { method: "platt", A: 1, B: 0 },
    });
    expect(applyCalibration(0.5)).toBeCloseTo(0.5);
  });

  it("uses isotonic when calibration config is isotonic", () => {
    setCalibrationConfig({
      method: "isotonic",
      params: {
        method: "isotonic",
        bins: [
          { lower: 0, upper: 0.5, calibrated: 0.4 },
          { lower: 0.5, upper: 1, calibrated: 0.6 },
        ],
      },
    });
    const out = applyCalibration(0.3);
    expect(out).toBe(0.4);
  });

  it("falls back to legacy Platt params when config is null", () => {
    setRecalibrationParams({ A: 1, B: 0 });
    expect(applyCalibration(0.7)).toBeCloseTo(0.7);
  });

  it("clamps output to valid range", () => {
    setCalibrationConfig(null);
    setRecalibrationParams(null);
    const out = applyCalibration(0.001);
    expect(out).toBeGreaterThanOrEqual(0.01);
  });
});

describe("isRecalibrationActive", () => {
  beforeEach(() => {
    setRecalibrationParams(null);
    setCalibrationConfig(null);
  });

  it("returns true when calibration config is set", () => {
    setCalibrationConfig({
      method: "platt",
      params: { method: "platt", A: 1, B: 0 },
    });
    expect(isRecalibrationActive()).toBe(true);
  });

  it("returns true when Platt params differ from passthrough", () => {
    setRecalibrationParams({ A: 1.2, B: 0 });
    expect(isRecalibrationActive()).toBe(true);
  });

  it("returns false when only passthrough Platt", () => {
    setRecalibrationParams({ A: 1, B: 0 });
    expect(isRecalibrationActive()).toBe(false);
  });
});
