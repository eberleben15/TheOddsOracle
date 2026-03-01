/**
 * Decision Engine Tracking
 *
 * Tracks decision engine runs and validates outcomes for portfolio-level feedback.
 * Enables learning from portfolio construction decisions.
 */

import { prisma } from "./prisma";
import type {
  DecisionEngineResult,
  DecisionEngineConstraints,
} from "./abe/decision-engine-types";

export interface DecisionEngineRunInput {
  userId: string;
  bankroll: number;
  sport: string;
  configVersion: number;
  candidateCount: number;
}

/**
 * Track a decision engine run.
 * Returns the run ID for later validation.
 */
export async function trackDecisionEngineRun(
  inputs: DecisionEngineRunInput,
  result: DecisionEngineResult,
  constraints: DecisionEngineConstraints
): Promise<string> {
  const run = await prisma.decisionEngineRun.create({
    data: {
      userId: inputs.userId,
      bankroll: inputs.bankroll,
      sport: inputs.sport,
      configVersion: inputs.configVersion,
      candidateCount: inputs.candidateCount,
      selectedCount: result.positions.length,
      selectedSlate: result.positions as any,
      alternatives: result.excludedWithLabels as any,
      constraints: constraints as any,
    },
  });
  
  return run.id;
}

/**
 * Validate a decision engine run with actual outcomes.
 */
export async function validateDecisionEngineRun(
  runId: string,
  outcomes: Array<{
    positionIndex: number;
    predictionId: string;
    atsResult: 1 | -1 | 0;
    netUnits: number;
  }>
): Promise<void> {
  // Record individual outcomes
  for (const outcome of outcomes) {
    const run = await prisma.decisionEngineRun.findUnique({
      where: { id: runId },
    });
    
    if (!run) continue;
    
    const position = (run.selectedSlate as any)[outcome.positionIndex];
    
    await prisma.decisionEngineOutcome.create({
      data: {
        runId,
        positionIndex: outcome.positionIndex,
        candidateId: position.candidateId || `pos_${outcome.positionIndex}`,
        stakeUsd: position.stakeUsd || 0,
        expectedValue: position.expectedValue || 0,
        predictionId: outcome.predictionId,
        atsResult: outcome.atsResult,
        netUnits: outcome.netUnits,
      },
    });
  }
  
  // Aggregate portfolio metrics
  const totalNetUnits = outcomes.reduce((sum, o) => sum + o.netUnits, 0);
  const atsWins = outcomes.filter(o => o.atsResult === 1).length;
  const atsLosses = outcomes.filter(o => o.atsResult === -1).length;
  const decidedCount = atsWins + atsLosses;
  const atsRate = decidedCount > 0 ? (atsWins / decidedCount) * 100 : 0;
  
  // Calculate drawdown
  let runningSum = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const outcome of outcomes) {
    runningSum += outcome.netUnits;
    if (runningSum > peak) peak = runningSum;
    const drawdown = peak - runningSum;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  await prisma.decisionEngineRun.update({
    where: { id: runId },
    data: {
      validated: true,
      actualATS: atsRate,
      actualNetUnits: totalNetUnits,
      maxDrawdown,
    },
  });
}

/**
 * Analyze decision engine performance for a config version.
 */
export async function analyzeDecisionEnginePerformance(
  configVersion: number,
  days: number = 30
): Promise<{
  avgPositions: number;
  portfolioWinRate: number;
  avgNetUnits: number;
  vsControl: { improvement: number };
  runCount: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const runs = await prisma.decisionEngineRun.findMany({
    where: {
      configVersion,
      validated: true,
      timestamp: { gte: since },
    },
  });
  
  if (runs.length === 0) {
    return {
      avgPositions: 0,
      portfolioWinRate: 0,
      avgNetUnits: 0,
      vsControl: { improvement: 0 },
      runCount: 0,
    };
  }
  
  const avgPositions = runs.reduce((sum, r) => sum + r.selectedCount, 0) / runs.length;
  const avgNetUnits = runs.reduce((sum, r) => sum + (r.actualNetUnits ?? 0), 0) / runs.length;
  const avgATS = runs.reduce((sum, r) => sum + (r.actualATS ?? 0), 0) / runs.length;
  
  // Compare to previous version if available
  let improvement = 0;
  if (configVersion > 1) {
    const previousRuns = await prisma.decisionEngineRun.findMany({
      where: {
        configVersion: configVersion - 1,
        validated: true,
        timestamp: { gte: since },
      },
    });
    
    if (previousRuns.length > 0) {
      const previousAvgNetUnits = previousRuns.reduce((sum, r) => sum + (r.actualNetUnits ?? 0), 0) / previousRuns.length;
      improvement = avgNetUnits - previousAvgNetUnits;
    }
  }
  
  return {
    avgPositions,
    portfolioWinRate: avgATS,
    avgNetUnits,
    vsControl: { improvement },
    runCount: runs.length,
  };
}

/**
 * Get unvalidated decision engine runs.
 */
export async function getUnvalidatedDecisionEngineRuns() {
  return await prisma.decisionEngineRun.findMany({
    where: { validated: false },
    orderBy: { timestamp: "asc" },
  });
}

/**
 * Calculate regret for a decision engine run.
 * Regret = performance of rejected bets that would have won.
 */
export async function calculateRegret(runId: string): Promise<{
  rejectedCount: number;
  rejectedWouldWinCount: number;
  rejectedNetUnits: number;
}> {
  const run = await prisma.decisionEngineRun.findUnique({
    where: { id: runId },
  });
  
  if (!run || !run.alternatives) {
    return {
      rejectedCount: 0,
      rejectedWouldWinCount: 0,
      rejectedNetUnits: 0,
    };
  }
  
  // This would require matching alternatives to actual game outcomes
  // For now, return placeholder
  return {
    rejectedCount: 0,
    rejectedWouldWinCount: 0,
    rejectedNetUnits: 0,
  };
}
