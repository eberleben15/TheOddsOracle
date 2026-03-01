/**
 * Tests for A/B Testing Framework
 */

import { describe, it, expect, vi } from "vitest";
import {
  assignUserToVariant,
  recordABTestOutcome,
  getABTestResults,
  calculateSignificance,
} from "@/lib/ab-testing";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aBTestAssignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    aBTestResult: {
      create: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

describe("A/B Testing", () => {
  it("should assign user to variant deterministically", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.aBTestAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.aBTestAssignment.create).mockResolvedValue({} as any);

    const variant1 = await assignUserToVariant("user1", "test1");
    const variant2 = await assignUserToVariant("user1", "test1");

    // Should return same variant when called twice (deterministic)
    expect(variant1).toBe(variant2);
    expect(["control", "treatment"]).toContain(variant1);
  });

  it("should split users roughly 50/50", async () => {
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.aBTestAssignment.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.aBTestAssignment.create).mockResolvedValue({} as any);

    const variants: string[] = [];
    for (let i = 0; i < 100; i++) {
      const variant = await assignUserToVariant(`user${i}`, "test1");
      variants.push(variant);
    }

    const controlCount = variants.filter(v => v === "control").length;
    const treatmentCount = variants.filter(v => v === "treatment").length;

    // Should be roughly 50/50 (allow 40-60% range)
    expect(controlCount).toBeGreaterThan(40);
    expect(controlCount).toBeLessThan(60);
    expect(treatmentCount).toBeGreaterThan(40);
    expect(treatmentCount).toBeLessThan(60);
  });

  it("should record A/B test outcome", async () => {
    const { prisma } = await import("@/lib/prisma");

    await recordABTestOutcome("test1", "user1", "control", {
      predictionId: "pred1",
      atsResult: 1,
      netUnits: 0.91,
    });

    expect(prisma.aBTestResult.create).toHaveBeenCalledWith({
      data: {
        testName: "test1",
        userId: "user1",
        variant: "control",
        predictionId: "pred1",
        atsResult: 1,
        netUnits: 0.91,
      },
    });
  });

  it("should calculate chi-square significance", () => {
    // Control: 50 wins, 50 losses (50% win rate)
    // Treatment: 60 wins, 40 losses (60% win rate)
    const result = calculateSignificance(50, 50, 60, 40);

    expect(result.chiSquare).toBeGreaterThan(0);
    expect(result.pValue).toBeGreaterThan(0);
    expect(result.pValue).toBeLessThan(1);
    
    // Chi-square = 2.02 (calculated for 10% difference with 100 samples each)
    // This is below the critical value of 3.84 at p=0.05, so not quite significant
    expect(result.chiSquare).toBeCloseTo(2.02, 1);
    expect(result.significant).toBe(false);
    
    // But with larger sample or larger effect, it would be significant
    const largerSample = calculateSignificance(150, 50, 180, 20);
    expect(largerSample.significant).toBe(true);
  });

  it("should not be significant with small sample", () => {
    // Control: 5 wins, 5 losses (50% win rate)
    // Treatment: 6 wins, 4 losses (60% win rate)
    const result = calculateSignificance(5, 5, 6, 4);

    // With only 10 samples per group, should not be significant
    expect(result.significant).toBe(false);
  });
});
