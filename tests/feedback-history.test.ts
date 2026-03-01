/**
 * Tests for Feedback History Tracking
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveFeedbackHistory,
  getFeedbackTrend,
  getFeedbackByConfigVersion,
  compareConfigVersions,
} from "@/lib/feedback-history";
import type { ATSFeedbackReport } from "@/lib/ats-feedback";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    feedbackHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("Feedback History", () => {
  const mockReport: ATSFeedbackReport = {
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

  it("should save feedback history with all metrics", async () => {
    const { prisma } = await import("@/lib/prisma");
    
    await saveFeedbackHistory(mockReport, 1, "cbb", {
      brierScore: 0.20,
      logLoss: 0.65,
      spreadMAE: 5.2,
    });

    expect(prisma.feedbackHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        configVersion: 1,
        sport: "cbb",
        brierScore: 0.20,
        logLoss: 0.65,
        spreadMAE: 5.2,
      }),
    });
  });

  it("should retrieve feedback trend for last N days", async () => {
    const { prisma } = await import("@/lib/prisma");
    const mockRows = [
      {
        timestamp: new Date(),
        configVersion: 1,
        sport: "cbb",
        overall: mockReport.overall,
        bySport: mockReport.segmentations.bySport,
        topFeatures: mockReport.featureImportance.slice(0, 10),
        brierScore: 0.20,
        logLoss: null,
        spreadMAE: null,
      },
    ];

    vi.mocked(prisma.feedbackHistory.findMany).mockResolvedValue(mockRows as any);

    const trend = await getFeedbackTrend(30, "cbb");

    expect(trend).toHaveLength(1);
    expect(trend[0].configVersion).toBe(1);
    expect(prisma.feedbackHistory.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        sport: "cbb",
      }),
      orderBy: { timestamp: "asc" },
    });
  });

  it("should compare two config versions", async () => {
    const { prisma } = await import("@/lib/prisma");
    
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

    const comparison = await compareConfigVersions(1, 2);

    expect(comparison.improvement.winRate).toBeCloseTo(5.0);
    expect(comparison.improvement.netUnits).toBeCloseTo(5.0);
  });
});
