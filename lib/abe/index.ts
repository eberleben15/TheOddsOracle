/**
 * Adaptive Betting Engine (ABE) — core + adapters.
 */

export {
  kalshiMarketToABEContracts,
  abeContractIdToKalshiTicker,
  kalshiTickerToABEContractId,
  kalshiMarketPositionsToABEPositions,
} from "./kalshi-adapter";

export {
  polymarketMarketToABEContracts,
  polymarketEventToABEContracts,
  polymarketMarketToABEContractId,
  abeContractIdToPolymarketConditionId,
  polymarketDataPositionsToABEPositions,
} from "./polymarket-adapter";

export {
  ABE_FACTORS,
  getFactorIdsForKalshiMarket,
  getFactorById,
  getFactorName,
} from "./factors";

export { runPortfolioRiskAnalysis } from "./portfolio-risk-engine";

export {
  fullKellyBinary,
  kellyStakeUsd,
  buildBankrollSummary,
  totalNotionalFromPositions,
  heuristicP30Drawdown45Days,
  computeAvgLockupDays,
} from "./bankroll-engine";

export {
  runStrategyComparison,
  generateRandomBets,
} from "./strategy-simulator";

export {
  evaluateRule,
  runRules,
  buildNotificationsForRule,
} from "./rule-engine";

export {
  buildBettingDNA,
  computeEdgeAccuracyFromPredictions,
  buildComparisonSummary,
} from "./dna-engine";

// Decision engine (Brain B): plug-in contract — see docs/STRATEGIC_DIRECTION.md
export type {
  CandidateBet,
  CandidateCorrelation,
  DecisionEngineConstraints,
  SelectedPosition,
  DecisionEngineResult,
  DecisionEngineOptimizer,
} from "./decision-engine-types";

export { recommendedBetsToCandidates, kalshiMarketsToCandidates, polymarketMarketsToCandidates, polymarketEventsToCandidates } from "./candidates-adapter";
export { runDecisionEngine } from "./decision-engine-runner";
export {
  GreedyOptimizer,
  defaultGreedyOptimizer,
  GREEDY_OPTIMIZER_NAME,
} from "./greedy-optimizer";
