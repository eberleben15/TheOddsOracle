/**
 * Greedy classical optimizer for the decision engine.
 * Sorts by edge, selects positions with Kelly-based sizing and constraint checks.
 * Use as the default solver; swap for MIP/heuristic/quantum when needed.
 */

import { kellyStakeUsd } from "./bankroll-engine";
import type {
  CandidateBet,
  CandidateCorrelation,
  DecisionEngineConstraints,
  DecisionEngineOptimizer,
  DecisionEngineResult,
  SelectedPosition,
} from "./decision-engine-types";

const DEFAULT_KELLY_FRACTION = 0.25;
const DEFAULT_MAX_FRACTION_PER_POSITION = 0.02;
const DEFAULT_MAX_POSITIONS = 12;

export const GREEDY_OPTIMIZER_NAME = "classical-greedy";

/**
 * Greedy optimizer: edge-first selection, Kelly sizing, per-position and correlation caps.
 */
export class GreedyOptimizer implements DecisionEngineOptimizer {
  readonly name = GREEDY_OPTIMIZER_NAME;

  async solve(
    candidates: CandidateBet[],
    constraints: DecisionEngineConstraints,
    options?: { correlations?: CandidateCorrelation[]; timeLimitMs?: number }
  ): Promise<DecisionEngineResult> {
    const start = performance.now();
    const {
      bankrollUsd,
      kellyFraction = DEFAULT_KELLY_FRACTION,
      maxFractionPerPosition = DEFAULT_MAX_FRACTION_PER_POSITION,
      maxPositions = DEFAULT_MAX_POSITIONS,
      minPositions,
      maxTotalNotional,
      maxPairwiseCorrelation,
      maxFactorFraction,
    } = constraints;

    const correlations = options?.correlations ?? [];
    const excludedReasons: Record<string, string> = {};

    // Only positive-edge candidates
    const positiveEdge = candidates.filter((c) => c.edge > 0);
    positiveEdge.forEach((c) => {
      if (c.edge <= 0) excludedReasons[c.id] = "No edge";
    });

    // Sort by edge descending
    const sorted = [...positiveEdge].sort((a, b) => b.edge - a.edge);

    const maxStakePerPosition = bankrollUsd * maxFractionPerPosition;
    const positions: SelectedPosition[] = [];
    let totalNotional = 0;
    const factorNotional = new Map<string, number>();
    const selectedIds = new Set<string>();
    const candidateById = new Map(candidates.map((c) => [c.id, c]));

    for (const c of sorted) {
      if (positions.length >= maxPositions) {
        excludedReasons[c.id] = excludedReasons[c.id] ?? "Max positions reached";
        continue;
      }

      // Correlation: same factor (e.g. same game) — limit exposure per factor
      const factorKey = c.factorIds?.[0] ?? c.id;
      const currentFactorNotional = factorNotional.get(factorKey) ?? 0;
      if (maxFactorFraction != null && maxFactorFraction > 0) {
        const cap = bankrollUsd * maxFactorFraction;
        if (currentFactorNotional >= cap) {
          excludedReasons[c.id] = "Factor cap reached";
          continue;
        }
      }

      // Pairwise: if we already have a highly correlated selection, skip or reduce
      if (maxPairwiseCorrelation != null && maxPairwiseCorrelation < 1) {
        const correlated = correlations.some(
          (r) =>
            (r.idA === c.id || r.idB === c.id) &&
            Math.abs(r.correlation) > maxPairwiseCorrelation &&
            (selectedIds.has(r.idA) || selectedIds.has(r.idB))
        );
        if (correlated) {
          excludedReasons[c.id] = "Correlation limit";
          continue;
        }
      }

      let stakeUsd = kellyStakeUsd(bankrollUsd, kellyFraction, c.winProb, c.price);
      stakeUsd = Math.min(stakeUsd, maxStakePerPosition);
      if (c.maxSize != null && c.maxSize > 0) stakeUsd = Math.min(stakeUsd, c.maxSize);

      if (stakeUsd <= 0) {
        excludedReasons[c.id] = "Kelly stake is 0";
        continue;
      }

      if (maxTotalNotional != null && totalNotional + stakeUsd > maxTotalNotional) {
        excludedReasons[c.id] = "Would exceed max notional";
        continue;
      }

      positions.push({
        candidateId: c.id,
        stakeUsd,
        shares: c.price > 0 ? stakeUsd / c.price : undefined,
        reason: `Edge ${(c.edge * 100).toFixed(1)}%`,
      });
      totalNotional += stakeUsd;
      selectedIds.add(c.id);
      factorNotional.set(factorKey, currentFactorNotional + stakeUsd);
    }

    // Second pass: if under minPositions, add more positions with relaxed factor cap (smaller stakes)
    if (
      minPositions != null &&
      minPositions > 0 &&
      positions.length < minPositions &&
      positions.length < maxPositions
    ) {
      for (const c of sorted) {
        if (positions.length >= minPositions || positions.length >= maxPositions) break;
        if (selectedIds.has(c.id)) continue;

        let stakeUsd = kellyStakeUsd(bankrollUsd, kellyFraction * 0.5, c.winProb, c.price);
        stakeUsd = Math.min(stakeUsd, maxStakePerPosition);
        stakeUsd = Math.max(stakeUsd, bankrollUsd * 0.005);
        if (c.maxSize != null && c.maxSize > 0) stakeUsd = Math.min(stakeUsd, c.maxSize);
        if (stakeUsd <= 0) continue;
        if (maxTotalNotional != null && totalNotional + stakeUsd > maxTotalNotional) continue;

        const factorKey = c.factorIds?.[0] ?? c.id;
        const currentFactorNotional = factorNotional.get(factorKey) ?? 0;
        factorNotional.set(factorKey, currentFactorNotional + stakeUsd);

        positions.push({
          candidateId: c.id,
          stakeUsd,
          shares: c.price > 0 ? stakeUsd / c.price : undefined,
          reason: `Edge ${(c.edge * 100).toFixed(1)}% (min-positions pass)`,
        });
        totalNotional += stakeUsd;
        selectedIds.add(c.id);
      }
    }
    const solveTimeMs = performance.now() - start;
    const expectedReturn = positions.reduce((sum, p) => {
      const c = candidateById.get(p.candidateId);
      if (!c) return sum;
      return sum + p.stakeUsd * c.edge * (1 / c.price - 1);
    }, 0);

    return {
      positions,
      objectiveValue: expectedReturn,
      metrics: {
        expectedReturn,
        numCorrelatedPairs: correlations.filter(
          (r) => selectedIds.has(r.idA) && selectedIds.has(r.idB)
        ).length,
      },
      excludedReasons: Object.keys(excludedReasons).length > 0 ? excludedReasons : undefined,
      solver: this.name,
      solveTimeMs,
    };
  }
}

/** Singleton default for runDecisionEngine. */
export const defaultGreedyOptimizer = new GreedyOptimizer();
