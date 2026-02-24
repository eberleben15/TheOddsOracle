/**
 * Decision engine runner: single entry point for "build my slate."
 * Uses the plug-in optimizer (default: greedy); can swap for MIP/quantum later.
 */

import type {
  CandidateBet,
  CandidateCorrelation,
  DecisionEngineConstraints,
  DecisionEngineOptimizer,
  DecisionEngineResult,
} from "./decision-engine-types";
import { defaultGreedyOptimizer } from "./greedy-optimizer";

/**
 * Run the decision engine: select positions + sizes from candidates under constraints.
 * @param candidates - All candidate bets (from recommended bets, Kalshi, Polymarket, etc.)
 * @param constraints - Bankroll and caps (from user settings + defaults)
 * @param optimizer - Solver to use; defaults to greedy classical
 * @param options - Optional correlations and time limit
 */
export async function runDecisionEngine(
  candidates: CandidateBet[],
  constraints: DecisionEngineConstraints,
  optimizer?: DecisionEngineOptimizer | null,
  options?: {
    correlations?: CandidateCorrelation[];
    timeLimitMs?: number;
  }
): Promise<DecisionEngineResult> {
  const solver = optimizer ?? defaultGreedyOptimizer;
  return solver.solve(candidates, constraints, {
    correlations: options?.correlations,
    timeLimitMs: options?.timeLimitMs,
  });
}
