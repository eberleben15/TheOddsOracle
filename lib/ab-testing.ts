/**
 * A/B Testing Framework
 *
 * Implements user-based A/B testing for validating config changes.
 * Users are consistently assigned to treatment groups using deterministic hashing.
 */

import { prisma } from "./prisma";
import type { FeedbackPipelineConfig } from "./feedback-pipeline-config";

export interface ABTest {
  name: string;
  controlConfig: FeedbackPipelineConfig;
  treatmentConfig: FeedbackPipelineConfig;
  startedAt: Date;
  targetSampleSize: number;
  status: "active" | "completed" | "aborted";
}

/**
 * Assign a user to a test variant (control or treatment).
 * Uses deterministic hashing for consistent assignment.
 */
export async function assignUserToVariant(
  userId: string,
  testName: string
): Promise<"control" | "treatment"> {
  // Check existing assignment
  const existing = await prisma.aBTestAssignment.findUnique({
    where: { userId_testName: { userId, testName } },
  });
  
  if (existing) return existing.variant as "control" | "treatment";
  
  // Hash userId to get deterministic but random-looking assignment
  const hash = hashString(userId + testName);
  const variant = hash % 2 === 0 ? "control" : "treatment";
  
  await prisma.aBTestAssignment.create({
    data: { userId, testName, variant },
  });
  
  return variant;
}

/**
 * Simple string hash function for deterministic assignment.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Record an A/B test outcome.
 */
export async function recordABTestOutcome(
  testName: string,
  userId: string,
  variant: "control" | "treatment",
  outcome: {
    predictionId?: string;
    atsResult?: 1 | -1 | 0;
    netUnits?: number;
  }
): Promise<void> {
  await prisma.aBTestResult.create({
    data: {
      testName,
      userId,
      variant,
      predictionId: outcome.predictionId ?? null,
      atsResult: outcome.atsResult ?? null,
      netUnits: outcome.netUnits ?? null,
    },
  });
}

/**
 * Get aggregated A/B test results.
 */
export async function getABTestResults(testName: string) {
  const results = await prisma.aBTestResult.groupBy({
    by: ["variant"],
    where: { testName },
    _count: true,
    _avg: { netUnits: true },
  });
  
  const atsWins = await prisma.aBTestResult.groupBy({
    by: ["variant"],
    where: {
      testName,
      atsResult: 1,
    },
    _count: true,
  });
  
  const atsLosses = await prisma.aBTestResult.groupBy({
    by: ["variant"],
    where: {
      testName,
      atsResult: -1,
    },
    _count: true,
  });
  
  const control = results.find(r => r.variant === "control");
  const treatment = results.find(r => r.variant === "treatment");
  
  const controlWins = atsWins.find(r => r.variant === "control")?._count ?? 0;
  const treatmentWins = atsWins.find(r => r.variant === "treatment")?._count ?? 0;
  
  const controlLosses = atsLosses.find(r => r.variant === "control")?._count ?? 0;
  const treatmentLosses = atsLosses.find(r => r.variant === "treatment")?._count ?? 0;
  
  const controlWinRate = (controlWins + controlLosses) > 0 
    ? (controlWins / (controlWins + controlLosses)) * 100 
    : 0;
  
  const treatmentWinRate = (treatmentWins + treatmentLosses) > 0 
    ? (treatmentWins / (treatmentWins + treatmentLosses)) * 100 
    : 0;
  
  return {
    control: {
      count: control?._count ?? 0,
      avgNetUnits: control?._avg.netUnits ?? 0,
      wins: controlWins,
      losses: controlLosses,
      winRate: controlWinRate,
    },
    treatment: {
      count: treatment?._count ?? 0,
      avgNetUnits: treatment?._avg.netUnits ?? 0,
      wins: treatmentWins,
      losses: treatmentLosses,
      winRate: treatmentWinRate,
    },
    improvement: {
      netUnits: (treatment?._avg.netUnits ?? 0) - (control?._avg.netUnits ?? 0),
      winRate: treatmentWinRate - controlWinRate,
    },
  };
}

/**
 * Get all assignments for a test.
 */
export async function getTestAssignments(testName: string) {
  return await prisma.aBTestAssignment.findMany({
    where: { testName },
    select: {
      userId: true,
      variant: true,
      assignedAt: true,
    },
  });
}

/**
 * List all unique test names.
 */
export async function listTests(): Promise<string[]> {
  const tests = await prisma.aBTestAssignment.findMany({
    select: { testName: true },
    distinct: ["testName"],
  });
  return tests.map(t => t.testName);
}

/**
 * Calculate statistical significance using chi-square test.
 */
export function calculateSignificance(
  controlWins: number,
  controlLosses: number,
  treatmentWins: number,
  treatmentLosses: number
): { chiSquare: number; pValue: number; significant: boolean } {
  const n1 = controlWins + controlLosses;
  const n2 = treatmentWins + treatmentLosses;
  
  if (n1 === 0 || n2 === 0) {
    return { chiSquare: 0, pValue: 1, significant: false };
  }
  
  const pooledWinRate = (controlWins + treatmentWins) / (n1 + n2);
  const expectedControlWins = n1 * pooledWinRate;
  const expectedControlLosses = n1 * (1 - pooledWinRate);
  const expectedTreatmentWins = n2 * pooledWinRate;
  const expectedTreatmentLosses = n2 * (1 - pooledWinRate);
  
  // Chi-square statistic
  const chiSquare = 
    Math.pow(controlWins - expectedControlWins, 2) / expectedControlWins +
    Math.pow(controlLosses - expectedControlLosses, 2) / expectedControlLosses +
    Math.pow(treatmentWins - expectedTreatmentWins, 2) / expectedTreatmentWins +
    Math.pow(treatmentLosses - expectedTreatmentLosses, 2) / expectedTreatmentLosses;
  
  // Approximate p-value for 1 degree of freedom
  // Using chi-square CDF approximation
  const pValue = 1 - chiSquareCDF(chiSquare, 1);
  
  return {
    chiSquare,
    pValue,
    significant: pValue < 0.05,
  };
}

/**
 * Approximate chi-square cumulative distribution function.
 */
function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0;
  if (x > 100) return 1;
  
  // For df=1, chi-square distribution is related to standard normal
  // Chi^2(1) = Z^2, so P(Chi^2 < x) = P(|Z| < sqrt(x)) = 2*Phi(sqrt(x)) - 1
  if (df === 1) {
    const z = Math.sqrt(x);
    // Phi(z) is the standard normal CDF
    const phi = (1 + erf(z / Math.sqrt(2))) / 2;
    return 2 * phi - 1;
  }
  
  return 0.5; // Fallback
}

/**
 * Error function approximation.
 */
function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
}
