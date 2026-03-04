import { describe, it, expect } from "vitest";
import { fitIsotonic, applyIsotonic } from "@/lib/methods/isotonic-calibration";

describe("fitIsotonic", () => {
  it("returns default bins for fewer than 20 samples", () => {
    const pairs = Array(10)
      .fill(null)
      .map((_, i) => ({ predicted: 0.5 + i * 0.05, actual: i % 2 }));
    const params = fitIsotonic(pairs);
    expect(params.method).toBe("isotonic");
    expect(params.bins.length).toBe(2);
  });

  it("returns monotone bins for 20+ samples", () => {
    const pairs = Array(25)
      .fill(null)
      .map((_, i) => ({
        predicted: 0.2 + (i / 25) * 0.6,
        actual: i < 12 ? 0 : 1,
      }));
    const params = fitIsotonic(pairs);
    expect(params.method).toBe("isotonic");
    expect(params.bins.length).toBeGreaterThan(0);
    for (let i = 1; i < params.bins.length; i++) {
      expect(params.bins[i].calibrated).toBeGreaterThanOrEqual(params.bins[i - 1].calibrated - 0.001);
    }
  });

  it("covers full [0,1] range", () => {
    const pairs = Array(30)
      .fill(null)
      .map((_, i) => ({ predicted: (i + 1) / 31, actual: i % 2 }));
    const params = fitIsotonic(pairs);
    const first = params.bins[0];
    const last = params.bins[params.bins.length - 1];
    expect(first.lower).toBeLessThanOrEqual(0.1);
    expect(last.upper).toBeGreaterThanOrEqual(0.9);
  });
});

describe("applyIsotonic", () => {
  const params = {
    method: "isotonic" as const,
    bins: [
      { lower: 0, upper: 0.3, calibrated: 0.2 },
      { lower: 0.3, upper: 0.6, calibrated: 0.5 },
      { lower: 0.6, upper: 1, calibrated: 0.8 },
    ],
  };

  it("returns calibrated value within bin", () => {
    expect(applyIsotonic(0.2, params)).toBe(0.2);
    expect(applyIsotonic(0.45, params)).toBe(0.5);
    expect(applyIsotonic(0.8, params)).toBe(0.8);
  });

  it("clamps input to [0,1]", () => {
    const out = applyIsotonic(1.5, params);
    expect(out).toBeGreaterThanOrEqual(0);
    expect(out).toBeLessThanOrEqual(1);
  });

  it("handles boundary at 1", () => {
    const out = applyIsotonic(1, params);
    expect(out).toBe(0.8);
  });
});
