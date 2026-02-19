/**
 * Prediction feedback batch - tests for score parsing and batch flow.
 * Uses mocks for external deps (Odds API, ESPN, Prisma).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external deps before importing the module
vi.mock("@/lib/odds-api", () => ({
  getCompletedScoresBySport: vi.fn(),
}));
vi.mock("@/lib/sportsdata-api", () => ({
  getGamesByDate: vi.fn(),
}));
vi.mock("@/lib/prediction-tracker", () => ({
  getUnvalidatedPredictions: vi.fn(),
  recordOutcomeByMatchup: vi.fn(),
  recordOutcomeByGameId: vi.fn(),
  getValidatedPredictions: vi.fn(),
  getTrackingStats: vi.fn(),
}));
vi.mock("@/lib/recalibration", () => ({
  fitFromValidations: vi.fn(() => ({ A: 1.1, B: -0.05 })),
  setRecalibrationParams: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { modelConfig: { findUnique: vi.fn(), upsert: vi.fn() } },
}));

import { getCompletedScoresBySport } from "@/lib/odds-api";
import {
  getUnvalidatedPredictions,
  recordOutcomeByGameId,
  getValidatedPredictions,
  getTrackingStats,
} from "@/lib/prediction-tracker";
import { runBatchSync } from "@/lib/prediction-feedback-batch";

describe("runBatchSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns early when no past predictions", async () => {
    vi.mocked(getUnvalidatedPredictions).mockResolvedValue([]);
    vi.mocked(getTrackingStats).mockResolvedValue({
      total: 0,
      validated: 0,
      unvalidated: 0,
      oldestPrediction: null,
      newestPrediction: null,
    });

    const result = await runBatchSync();

    expect(result.success).toBe(true);
    expect(result.unvalidatedChecked).toBe(0);
    expect(result.outcomesRecorded).toBe(0);
    expect(getCompletedScoresBySport).not.toHaveBeenCalled();
  });

  it("matches Odds API completed games by gameId and records outcomes", async () => {
    const pastPred = {
      id: "p1",
      gameId: "abc123",
      date: "2020-01-01T00:00:00Z", // clearly in the past
      homeTeam: "Duke",
      awayTeam: "UNC",
      sport: "basketball_ncaab",
    } as any;
    vi.mocked(getUnvalidatedPredictions).mockResolvedValue([pastPred]);
    vi.mocked(getCompletedScoresBySport)
      .mockResolvedValueOnce({
        games: [
          {
            id: "abc123",
            home_team: "Duke",
            away_team: "UNC",
            scores: [
              { name: "Duke", score: "78" },
              { name: "UNC", score: "72" },
            ],
          } as any,
        ],
      })
      .mockResolvedValueOnce({ games: [] });
    vi.mocked(recordOutcomeByGameId).mockResolvedValue(true);
    vi.mocked(getValidatedPredictions).mockResolvedValue([]);
    vi.mocked(getTrackingStats).mockResolvedValue({
      total: 1,
      validated: 0,
      unvalidated: 1,
      oldestPrediction: 1,
      newestPrediction: 2,
    });

    const result = await runBatchSync();

    expect(result.outcomesRecorded).toBe(1);
    expect(recordOutcomeByGameId).toHaveBeenCalledWith("abc123", 78, 72);
    expect(result.diagnostics?.oddsApiMatched).toBe(1);
  });
});
