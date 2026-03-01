/**
 * Tests for ML Analytics with TensorFlow
 */

import { describe, it, expect, vi } from "vitest";
import {
  bootstrapConfidenceIntervals,
  bootstrapMetric,
} from "@/lib/ml-analytics";
import type { ATSSample } from "@/lib/ats-feedback";

// Mock TensorFlow for unit tests
vi.mock("@tensorflow/tfjs-node", () => ({
  default: {
    tensor2d: vi.fn(),
    tensor1d: vi.fn(),
    sequential: vi.fn(() => ({
      compile: vi.fn(),
      fit: vi.fn(),
      layers: [],
      dispose: vi.fn(),
    })),
    layers: {
      dense: vi.fn(),
    },
    train: {
      adam: vi.fn(),
    },
    regularizers: {
      l1: vi.fn(),
    },
  },
}));

describe("ML Analytics", () => {
  it("should calculate bootstrap confidence intervals", async () => {
    const mockSamples: ATSSample[] = Array.from({ length: 100 }, (_, i) => ({
      example: {} as any,
      cover: i < 55 ? 1 : -1, // 55% win rate
      betOnHome: true,
      lineInOurFormat: 0,
    }));

    const result = await bootstrapConfidenceIntervals(mockSamples, 100);

    expect(result.winRate).toBeCloseTo(55.0, 1);
    expect(result.lower).toBeLessThan(result.winRate);
    expect(result.upper).toBeGreaterThan(result.winRate);
    expect(result.upper - result.lower).toBeGreaterThan(0);
  });

  it("should calculate bootstrap metric with custom function", async () => {
    const mockData = Array.from({ length: 100 }, (_, i) => i + 1);
    const meanFn = (sample: number[]) =>
      sample.reduce((sum, x) => sum + x, 0) / sample.length;

    const result = await bootstrapMetric(mockData, meanFn, 100);

    expect(result.value).toBeCloseTo(50.5, 1); // Mean of 1-100
    expect(result.lower).toBeLessThan(result.value);
    expect(result.upper).toBeGreaterThan(result.value);
  });

  it("should handle edge case with small sample", async () => {
    const mockSamples: ATSSample[] = [
      {
        example: {} as any,
        cover: 1,
        betOnHome: true,
        lineInOurFormat: 0,
      },
      {
        example: {} as any,
        cover: -1,
        betOnHome: true,
        lineInOurFormat: 0,
      },
    ];

    const result = await bootstrapConfidenceIntervals(mockSamples, 100);

    expect(result.winRate).toBeCloseTo(50.0);
    // With only 2 samples, CI will be wide
    expect(result.upper - result.lower).toBeGreaterThan(10);
  });

  it("should handle all wins", async () => {
    const mockSamples: ATSSample[] = Array.from({ length: 10 }, () => ({
      example: {} as any,
      cover: 1,
      betOnHome: true,
      lineInOurFormat: 0,
    }));

    const result = await bootstrapConfidenceIntervals(mockSamples, 100);

    expect(result.winRate).toBe(100.0);
  });

  it("should handle all losses", async () => {
    const mockSamples: ATSSample[] = Array.from({ length: 10 }, () => ({
      example: {} as any,
      cover: -1,
      betOnHome: true,
      lineInOurFormat: 0,
    }));

    const result = await bootstrapConfidenceIntervals(mockSamples, 100);

    expect(result.winRate).toBe(0.0);
  });
});
