/**
 * Integration Tests for Complete Feedback Loop
 *
 * Tests the end-to-end flow:
 * 1. Predictions are made and tracked
 * 2. Games complete and outcomes are recorded
 * 3. Training runs and generates feedback
 * 4. Config is updated based on feedback
 * 5. Feedback history is saved
 * 6. A/B tests can be run
 * 7. Decision engine runs are tracked
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock all dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    prediction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    modelConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    feedbackHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    aBTestAssignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    aBTestResult: {
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    decisionEngineRun: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    decisionEngineOutcome: {
      create: vi.fn(),
    },
    predictionHistory: {
      create: vi.fn(),
    },
  },
}));

describe("Complete Feedback Loop Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should flow from prediction to feedback history", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { trackPrediction } = await import("@/lib/prediction-tracker");
    const { getCurrentConfigVersion } = await import("@/lib/feedback-pipeline-config");
    const { saveFeedbackHistory } = await import("@/lib/feedback-history");
    
    // Mock config version
    vi.mocked(prisma.modelConfig.findUnique).mockResolvedValue({
      key: "ats_pipeline_config",
      value: { version: 1 },
      updatedAt: new Date(),
    } as any);

    // Mock prediction creation
    vi.mocked(prisma.prediction.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.prediction.create).mockResolvedValue({
      id: "pred1",
    } as any);

    // Step 1: Track prediction with config version
    const configVersion = await getCurrentConfigVersion();
    const predictionId = await trackPrediction(
      "game1",
      "2024-01-01T00:00:00Z",
      "Team A",
      "Team B",
      {
        predictedScore: { home: 100, away: 90 },
        predictedSpread: 10,
        winProbability: { home: 0.7, away: 0.3 },
        confidence: 75,
      },
      {
        configVersion,
        recommendationTier: "high",
      }
    );

    expect(predictionId).toBe("pred1");
    expect(prisma.prediction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        configVersion: 1,
        recommendationTier: "high",
      }),
    });

    // Step 2: Simulate feedback history save
    const mockReport = {
      overall: {
        sampleCount: 100,
        wins: 55,
        losses: 45,
        pushes: 0,
        winRate: 55.0,
        netUnits: 5.0,
      },
      featureCorrelations: [],
      featureImportance: [],
      segmentations: {
        bySport: [],
        byModelPath: [],
        byConfidenceBand: [],
        byHomeFavorite: [],
        bySpreadMagnitude: [],
        byTotalBucket: [],
      },
      biasAnalysis: [],
      recommendations: [],
    };

    await saveFeedbackHistory(mockReport, configVersion);

    expect(prisma.feedbackHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        configVersion: 1,
      }),
    });
  });

  it("should integrate A/B testing with config changes", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { assignUserToVariant, recordABTestOutcome } = await import("@/lib/ab-testing");
    
    // Mock user assignment
    vi.mocked(prisma.aBTestAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.aBTestAssignment.create).mockResolvedValue({
      userId: "user1",
      testName: "config_v2_vs_v1",
      variant: "treatment",
      assignedAt: new Date(),
    } as any);

    // Step 1: Assign user to variant
    const variant = await assignUserToVariant("user1", "config_v2_vs_v1");
    expect(variant).toBe("treatment");

    // Step 2: Record outcome for this user
    await recordABTestOutcome("config_v2_vs_v1", "user1", "treatment", {
      predictionId: "pred1",
      atsResult: 1,
      netUnits: 0.91,
    });

    expect(prisma.aBTestResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        testName: "config_v2_vs_v1",
        userId: "user1",
        variant: "treatment",
        atsResult: 1,
      }),
    });
  });

  it("should integrate decision engine tracking with predictions", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { trackDecisionEngineRun, validateDecisionEngineRun } = await import("@/lib/decision-engine-tracking");
    
    // Mock decision engine run creation
    vi.mocked(prisma.decisionEngineRun.create).mockResolvedValue({
      id: "run1",
      selectedSlate: [
        { candidateId: "bet1", gameId: "game1" },
        { candidateId: "bet2", gameId: "game2" },
      ],
    } as any);

    // Step 1: Track decision engine run
    const runId = await trackDecisionEngineRun(
      {
        userId: "user1",
        bankroll: 10000,
        sport: "cbb",
        configVersion: 1,
        candidateCount: 10,
      },
      {
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
      },
      {
        maxPositionSize: 0.05,
        maxCorrelation: 0.7,
        maxConcentration: 0.3,
        maxDrawdown: 0.2,
      }
    );

    expect(runId).toBe("run1");

    // Step 2: Mock finding the run for validation
    vi.mocked(prisma.decisionEngineRun.findUnique).mockResolvedValue({
      id: "run1",
      selectedSlate: [
        { candidateId: "bet1", gameId: "game1", stakeUsd: 100 },
        { candidateId: "bet2", gameId: "game2", stakeUsd: 100 },
      ],
    } as any);

    // Step 3: Validate with actual outcomes
    await validateDecisionEngineRun("run1", [
      { positionIndex: 0, predictionId: "pred1", atsResult: 1, netUnits: 0.91 },
      { positionIndex: 1, predictionId: "pred2", atsResult: 1, netUnits: 0.91 },
    ]);

    expect(prisma.decisionEngineOutcome.create).toHaveBeenCalledTimes(2);
    
    const updateCall = vi.mocked(prisma.decisionEngineRun.update).mock.calls[0][0];
    expect(updateCall.where.id).toBe("run1");
    expect(updateCall.data.validated).toBe(true);
    expect(updateCall.data.actualATS).toBe(100.0); // 2 wins, 0 losses
    expect(updateCall.data.actualNetUnits).toBeCloseTo(1.82, 2);
  });

  it("should track config version through entire pipeline", async () => {
    const { prisma } = await import("@/lib/prisma");
    
    // Mock config progression v1 -> v2
    vi.mocked(prisma.modelConfig.findUnique)
      .mockResolvedValueOnce({
        key: "ats_pipeline_config",
        value: { version: 1 },
        updatedAt: new Date(),
      } as any)
      .mockResolvedValueOnce({
        key: "ats_pipeline_config",
        value: { version: 2 },
        updatedAt: new Date(),
      } as any);

    const { getCurrentConfigVersion } = await import("@/lib/feedback-pipeline-config");
    const { compareConfigVersions } = await import("@/lib/feedback-history");

    // Get versions
    const v1 = await getCurrentConfigVersion();
    expect(v1).toBe(1);

    const v2 = await getCurrentConfigVersion();
    expect(v2).toBe(2);

    // Mock feedback history for comparison
    vi.mocked(prisma.feedbackHistory.findMany)
      .mockResolvedValueOnce([
        {
          timestamp: new Date(),
          configVersion: 1,
          sport: null,
          overall: { sampleCount: 100, wins: 50, losses: 50, pushes: 0, winRate: 50.0, netUnits: 0.0 },
          bySport: [],
          topFeatures: [],
          brierScore: null,
          logLoss: null,
          spreadMAE: null,
        },
      ] as any)
      .mockResolvedValueOnce([
        {
          timestamp: new Date(),
          configVersion: 2,
          sport: null,
          overall: { sampleCount: 100, wins: 55, losses: 45, pushes: 0, winRate: 55.0, netUnits: 5.0 },
          bySport: [],
          topFeatures: [],
          brierScore: null,
          logLoss: null,
          spreadMAE: null,
        },
      ] as any);

    // Compare performance
    const comparison = await compareConfigVersions(1, 2);

    expect(comparison.improvement.winRate).toBeCloseTo(5.0);
    expect(comparison.improvement.netUnits).toBeCloseTo(5.0);
  });
});
