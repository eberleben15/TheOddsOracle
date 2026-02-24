/**
 * Decision Engine — plug-in contract for portfolio construction (Brain B).
 *
 * Given a set of candidate bets and constraints, the optimizer returns
 * which positions to take and at what sizes. Designed so we can swap
 * classical MIP / heuristics / quantum-inspired / quantum without
 * rewriting the app. See docs/STRATEGIC_DIRECTION.md.
 */

import type { ContractSource } from "@/types/abe";

/** A single candidate bet/opportunity (sportsbook, Kalshi, Polymarket). */
export interface CandidateBet {
  /** Unique id (e.g. contract id or book+market+side). */
  id: string;
  source: ContractSource;
  /** Human-readable label. */
  label: string;
  /** Your estimated win probability (0–1). */
  winProb: number;
  /** Current price / cost per share (0–1). Binary: payoff $1 if win. */
  price: number;
  /** Expected value in probability space: winProb - price. */
  edge: number;
  /** Optional: variance of P&L per $1 (e.g. for binary: price * (1 - price)). */
  variancePerDollar?: number;
  /** Optional: max size allowed by liquidity (in shares or USD). */
  maxSize?: number;
  /** Optional: factor ids for correlation / concentration (e.g. same event, same sport). */
  factorIds?: string[];
  /** Optional: contract id if this maps to an ABE contract (for correlation with existing portfolio). */
  contractId?: string;
  /** Optional: resolution time (ISO) for lockup. */
  resolutionTime?: string;
}

/** Correlation between two candidate bets (or bet id and existing contract). */
export interface CandidateCorrelation {
  idA: string;
  idB: string;
  correlation: number;
  reason?: string;
}

/** User constraints for portfolio construction. */
export interface DecisionEngineConstraints {
  /** Bankroll in USD. */
  bankrollUsd: number;
  /** Fraction of full Kelly for sizing (e.g. 0.25). Default 0.25 if omitted. */
  kellyFraction?: number;
  /** Max fraction of bankroll on any single position (e.g. 0.02 = 2%). */
  maxFractionPerPosition?: number;
  /** Max number of positions to select (e.g. 12). */
  maxPositions?: number;
  /** Min number of positions (e.g. 5) — optional. */
  minPositions?: number;
  /** Max notional in USD (cap total exposure). */
  maxTotalNotional?: number;
  /** Max drawdown probability (0–1) or target; interpretation depends on solver. */
  maxDrawdownProb?: number;
  /** Max correlation between any two selected positions (e.g. 0.5). */
  maxPairwiseCorrelation?: number;
  /** Max fraction of portfolio in a single factor (e.g. 0.4). */
  maxFactorFraction?: number;
  /** Optional: only include bets with liquidity >= this. */
  minLiquidity?: number;
  /** Optional: existing positions (for correlation with candidates). */
  existingContractIds?: string[];
}

/** A selected position: which bet + size (in USD or shares). */
export interface SelectedPosition {
  candidateId: string;
  /** Size in USD (stake). */
  stakeUsd: number;
  /** Optional: size in shares/contracts (when contract size is 1:1 with $1). */
  shares?: number;
  /** Optional: short explanation for UI ("why this one"). */
  reason?: string;
}

/** Result of running the decision engine. */
export interface DecisionEngineResult {
  /** Selected positions (subset of candidates with sizes). */
  positions: SelectedPosition[];
  /** Optional: objective value achieved (e.g. expected log-growth or EV). */
  objectiveValue?: number;
  /** Optional: metrics for UI (e.g. expected drawdown, correlation score). */
  metrics?: {
    expectedReturn?: number;
    portfolioVariance?: number;
    maxDrawdownProb?: number;
    numCorrelatedPairs?: number;
  };
  /** Optional: why some candidates were excluded (for "why not those 12"). */
  excludedReasons?: Record<string, string>;
  /** Solver used (e.g. "classical-mip", "heuristic-greedy", "quantum-hybrid"). */
  solver: string;
  /** Solve time in ms (for benchmarking). */
  solveTimeMs?: number;
}

/**
 * Plug-in interface for the decision engine.
 * Implement with classical MIP, greedy/heuristic, or quantum-backed solver.
 */
export interface DecisionEngineOptimizer {
  /** Display name for logs/UI. */
  readonly name: string;

  /**
   * Solve: given candidates and constraints, return selected positions + sizes.
   * May throw if constraints are infeasible or solver fails.
   */
  solve(
    candidates: CandidateBet[],
    constraints: DecisionEngineConstraints,
    options?: {
      /** Optional: pairwise correlations between candidates (and with existing). */
      correlations?: CandidateCorrelation[];
      /** Time limit in ms. */
      timeLimitMs?: number;
    }
  ): Promise<DecisionEngineResult>;
}
