/**
 * Tests for Decision Engine Tracking
 */

import { describe, it, expect, vi } from "vitest";
import {
  trackDecisionEngineRun,
  validateDecisionEngineRun,
  analyzeDecisionEnginePerformance,
} from "@/lib/decision-engine-tracking";
import type { DecisionEngineResult, DecisionEngineConstraints } from "@/lib/abe/decision-engine-types";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    decisionEngineRun: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    decisionEngineOutcome: {
      create: vi.fn(),
    },
  },
}));

describe("Decision Engine Tracking", () => {
  const mockResult: DecisionEngineResult = {
    positions: [
      { candidateId: "bet1", stakeUsd: 100, expectedValue: 5.0, gameId: "game1" },
      { candidateId: "bet2", stakeUsd: 100, expectedValue: 3.0, gameId: "game2" },
    ],
    excludedWithLabels: [],
    aggregateMetrics: {
      totalStake: 200,
      expectedProfit: 8.0,
      expectedROI: 4.0,
    },
  };

  const mockConstraints: DecisionEngineConstraints = {
    maxPositionSize: 0.05,
    maxCorrelation: 0.7,
    maxConcentration: 0.3,
    maxDrawdown: 0.2,
  };

  it("should track decision engine run", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.decisionEngineRun.create).mockResolvedValue({
      id: "run1",
    } as any);

    const runId = await trackDecisionEngineRun(
      {
        userId: "user1",
        bankroll: 10000,
        sport: "cbb",
        configVersion: 1,
        candidateCount: 10,
      },
      mockResult,
      mockConstraints
    );

    expect(runId).toBe("run1");
    expect(prisma.decisionEngineRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user1",
        bankroll: 10000,
        sport: "cbb",
        configVersion: 1,
        selectedCount: 2,
      }),
    });
  });

  it("should validate decision engine run with outcomes", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.decisionEngineRun.findUnique).mockResolvedValue({
      id: "run1",
      selectedSlate: mockResult.positions,
    } as any);

    await validateDecisionEngineRun("run1", [
      { positionIndex: 0, predictionId: "pred1", atsResult: 1, netUnits: 0.91 },
      { positionIndex: 1, predictionId: "pred2", atsResult: -1, netUnits: -1.0 },
    ]);

    expect(prisma.decisionEngineOutcome.create).toHaveBeenCalledTimes(2);
    expect(prisma.decisionEngineRun.update).toHaveBeenCalledWith({
      where: { id: "run1" },
      data: expect.objectContaining({
        validated: true,
        actualATS: 50.0, // 1 win, 1 loss = 50%
      }),
    });
    
    // Check net units separately due to floating point precision
    const updateCall = vi.mocked(prisma.decisionEngineRun.update).mock.calls[0][0];
    expect(updateCall.data.actualNetUnits).toBeCloseTo(-0.09, 2);
  });

  it("should analyze decision engine performance", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.decisionEngineRun.findMany)
      .mockResolvedValueOnce([
        {
          id: "run1",
          selectedCount: 5,
          actualATS: 60.0,
          actualNetUnits: 2.5,
        },
        {
          id: "run2",
          selectedCount: 7,
          actualATS: 55.0,
          actualNetUnits: 1.5,
        },
      ] as any)
      .mockResolvedValueOnce([]);

    const performance = await analyzeDecisionEnginePerformance(1, 30);

    expect(performance.avgPositions).toBeCloseTo(6.0);
    expect(performance.portfolioWinRate).toBeCloseTo(57.5);
    expect(performance.avgNetUnits).toBeCloseTo(2.0);
    expect(performance.runCount).toBe(2);
  });

  it("should calculate drawdown correctly", async () => {
    const { prisma } = await import("@/lib/prisma");
    const mockPositions = [
      { candidateId: "bet1", stakeUsd: 100, expectedValue: 5.0, gameId: "game1" },
      { candidateId: "bet2", stakeUsd: 100, expectedValue: 3.0, gameId: "game2" },
      { candidateId: "bet3", stakeUsd: 100, expectedValue: 2.0, gameId: "game3" },
    ];
    
    vi.mocked(prisma.decisionEngineRun.findUnique).mockResolvedValue({
      id: "run1",
      selectedSlate: mockPositions,
    } as any);

    // Simulate: +2, -3, +1 units = peak 2, drawdown 3
    await validateDecisionEngineRun("run1", [
      { positionIndex: 0, predictionId: "pred1", atsResult: 1, netUnits: 2.0 },
      { positionIndex: 1, predictionId: "pred2", atsResult: -1, netUnits: -3.0 },
      { positionIndex: 2, predictionId: "pred3", atsResult: 1, netUnits: 1.0 },
    ]);

    expect(prisma.decisionEngineRun.update).toHaveBeenCalledWith({
      where: { id: "run1" },
      data: expect.objectContaining({
        maxDrawdown: 3.0,
      }),
    });
  });
});
