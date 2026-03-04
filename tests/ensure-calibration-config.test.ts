/**
 * Tests for ensureCalibrationConfig migration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    modelConfig: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

const createValidatedPrediction = (homeWinProb: number, actualWinner: "home" | "away") => ({
  id: "p1",
  prediction: { winProbability: { home: homeWinProb, away: 100 - homeWinProb } },
  actualOutcome: { winner: actualWinner },
} as any);

vi.mock("@/lib/prediction-tracker", () => ({
  getValidatedPredictions: vi.fn(),
}));

import { getValidatedPredictions } from "@/lib/prediction-tracker";
import { ensureCalibrationConfig } from "@/lib/prediction-feedback-batch";

describe("ensureCalibrationConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing config when calibration_config has isotonic", async () => {
    const existing = {
      activeMethod: "platt",
      platt: { A: 1.1, B: -0.05 },
      isotonic: { bins: [{ lower: 0, upper: 0.5, calibrated: 0.5 }, { lower: 0.5, upper: 1, calibrated: 0.5 }] },
    };
    mockFindUnique.mockImplementation(async (args: { where?: { key?: string } }) => {
      if (args?.where?.key === "calibration_config") {
        return { key: "calibration_config", value: existing } as any;
      }
      return null;
    });

    const result = await ensureCalibrationConfig();

    expect(result).toEqual(existing);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns null when fewer than 20 validated and no existing config", async () => {
    mockFindUnique.mockResolvedValue(null);
    vi.mocked(getValidatedPredictions).mockResolvedValue(
      Array(10).fill(null).map((_, i) => createValidatedPrediction(60 + i, i % 2 === 0 ? "home" : "away"))
    );

    const result = await ensureCalibrationConfig();

    expect(result).toBeNull();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("creates config when 20+ validated and legacy platt exists", async () => {
    mockFindUnique.mockImplementation(async (args: { where?: { key?: string } }) => {
      if (args?.where?.key === "calibration_config") return null;
      if (args?.where?.key === "recalibration_platt") {
        return { key: "recalibration_platt", value: { A: 1.1, B: -0.05 } } as any;
      }
      return null;
    });
    mockUpsert.mockResolvedValue({} as any);
    vi.mocked(getValidatedPredictions).mockResolvedValue(
      Array(25).fill(null).map((_, i) => createValidatedPrediction(0.5 + (i % 5) * 0.1, i % 2 === 0 ? "home" : "away"))
    );

    const result = await ensureCalibrationConfig();

    expect(result).not.toBeNull();
    expect(result?.activeMethod).toBe("platt");
    expect(result?.platt).toEqual({ A: 1.1, B: -0.05 });
    expect(result?.isotonic?.bins?.length).toBeGreaterThan(0);
    expect(mockUpsert).toHaveBeenCalled();
  });
});
