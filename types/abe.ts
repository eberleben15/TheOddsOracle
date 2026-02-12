/**
 * Adaptive Betting Engine (ABE) — unified types for the core engine.
 * Adapter-agnostic: sportsbooks and prediction markets map into these.
 */

/** Source of the contract (adapter identifier) */
export type ContractSource = "kalshi" | "polymarket" | "sportsbook";

/**
 * Unified contract: a single tradeable outcome (e.g. "Yes" on a binary market).
 * Price is always in [0, 1] (probability / decimal payoff per $1).
 */
export interface ABEContract {
  /** Unique id for this contract (e.g. Kalshi ticker, or book + market id) */
  id: string;
  source: ContractSource;
  /** Human-readable title */
  title: string;
  /** Optional subtitle (e.g. "Yes" / "No" label) */
  subtitle?: string;
  /** Current mid/implied probability in [0, 1]. For binary: payoff $1 if win, $0 if lose. */
  price: number;
  /** Optional bid/ask for spread */
  bid?: number;
  ask?: number;
  /** When the contract resolves (ISO string). Used for lockup and scenario timing. */
  resolutionTime?: string;
  /** External identifiers for the adapter (e.g. event_ticker, series_ticker) */
  meta?: Record<string, string | number | boolean | undefined>;
  /** Assigned factor ids for exposure (e.g. ["republican_performance", "elections"]) */
  factorIds?: string[];
}

/**
 * User position in a contract: size (in contracts/shares) and cost basis.
 * For prediction markets: 1 share = $1 if win, $0 if lose.
 */
export interface ABEPosition {
  contractId: string;
  /** "yes" | "no" for binary; for sports could be "over" | "under" etc. */
  side: "yes" | "no";
  /** Number of contracts/shares */
  size: number;
  /** Average cost per share in [0, 1] (e.g. 0.65 = 65¢) */
  costPerShare: number;
  /** Optional: when the position was opened (for lockup duration) */
  openedAt?: string;
}

/**
 * Portfolio: set of positions + optional contract details for risk computation.
 * The engine can work with just positions + a list of contracts (from adapters).
 */
export interface ABEPortfolio {
  positions: ABEPosition[];
  /** If not provided, engine may fetch or use cached contract data */
  contracts?: ABEContract[];
}

/**
 * Factor: a thematic cluster (e.g. "Republican performance", "Fed policy").
 * Used for factor decomposition and concentration risk.
 */
export interface ABEFactor {
  id: string;
  name: string;
  description?: string;
  /** Optional parent factor for hierarchy */
  parentId?: string;
}

/**
 * Exposure to a single factor: how much of the portfolio is tied to this factor.
 */
export interface FactorExposure {
  factorId: string;
  factorName: string;
  /** Notional exposure in dollars (sum of position size × price or cost) */
  notional: number;
  /** Fraction of total portfolio notional in this factor [0, 1] */
  fraction: number;
  /** Contract ids in this factor */
  contractIds: string[];
}

/**
 * Pairwise correlation between two contracts (or implied from same event/factor).
 */
export interface ContractCorrelation {
  contractIdA: string;
  contractIdB: string;
  /** Correlation in [-1, 1]. Same-event contracts are often near 1. */
  correlation: number;
  /** Why we assigned this (e.g. "same_event", "same_factor", "estimated") */
  reason?: string;
}

/**
 * Variance curve: portfolio P&L volatility and percentile range (from correlation-aware variance).
 */
export interface VarianceCurve {
  /** Portfolio volatility in USD (1 standard deviation of P&L) */
  volatilityUsd: number;
  /** Approx. 5th percentile P&L (worst-case band) in USD */
  p5PnlUsd: number;
  /** Approx. 95th percentile P&L (best-case band) in USD */
  p95PnlUsd: number;
}

/**
 * Output of the portfolio risk engine: exposure, concentration, warnings, and variance curve.
 */
export interface PortfolioRiskReport {
  /** Total notional (sum of |position| × cost or size × price) */
  totalNotional: number;
  /** Exposure per factor */
  factorExposures: FactorExposure[];
  /** Pairwise correlations (top N or all) */
  correlations: ContractCorrelation[];
  /** Concentration: fraction of notional in single largest factor [0, 1] */
  concentrationRisk: number;
  /** Human-readable warnings (e.g. overexposure to one factor) */
  warnings: string[];
  /** Suggested max exposure per factor for balance (optional) */
  suggestedFactorCap?: number;
  /** Variance curve (volatility and P&L range) when positions have notional */
  varianceCurve?: VarianceCurve;
  /** Capital lockup: avg days to resolution (notional-weighted) when contracts have resolutionTime */
  avgLockupDays?: number;
}

/** Risk profile: influences default Kelly and interpretation of metrics. */
export type RiskProfile = "conservative" | "moderate" | "aggressive";

/** User bankroll settings (persisted per user). */
export interface BankrollSettings {
  bankrollUsd: number;
  /** Fraction of full Kelly to use (e.g. 0.25 = quarter Kelly). */
  kellyFraction: number;
  /** Optional risk profile (conservative / moderate / aggressive). */
  riskProfile?: RiskProfile | null;
}

/** Output of bankroll intelligence: recommended sizing and risk metrics (Phase 2). */
export interface BankrollSummary {
  bankrollUsd: number;
  kellyFraction: number;
  /** Total notional at risk from current (or demo) positions. */
  totalNotional: number;
  /** Recommended max single position in USD (fraction of bankroll). */
  recommendedMaxPositionUsd: number;
  /** Approx. probability of 20% drawdown (heuristic). */
  pDrawdown20: number | null;
  /** Roadmap: P(30% drawdown in next 45 days). */
  pDrawdown30In45Days: number | null;
  /** Simple risk-of-ruin style metric (0–1). */
  riskOfRuin: number | null;
  /** Human-readable risk message. */
  riskMessage: string;
  /** True when summary was computed using demo portfolio (admin only). */
  isDemo?: boolean;
  /** Optional risk profile from settings. */
  riskProfile?: RiskProfile | null;
}

// --- Phase 3: Strategy Simulator ---

/** Single bet in a simulated sequence: your edge (winProb) vs market (price). */
export interface SimulatedBet {
  /** Your estimated probability of winning (0–1). */
  winProb: number;
  /** Market price / cost per share (0–1). Binary: payoff $1 if win. */
  price: number;
}

/** Strategy identifier for comparison. */
export type StrategySimulatorStrategy =
  | { type: "flat"; stakeUsd: number }
  | { type: "flat_fraction"; fractionOfInitial: number }
  | { type: "kelly"; kellyFraction: number };

/** Result of one Monte Carlo run: terminal bankroll and max drawdown (0–1). */
export interface StrategyRunResult {
  terminalBankrollUsd: number;
  /** Max drawdown during the run: (peak - trough) / peak. */
  maxDrawdown: number;
}

/** Aggregated stats across many runs for one strategy. */
export interface StrategyStats {
  strategy: StrategySimulatorStrategy;
  numRuns: number;
  numBetsPerRun: number;
  /** Median terminal bankroll across runs. */
  medianTerminalBankrollUsd: number;
  /** Percentiles of terminal bankroll. */
  terminalBankrollPercentiles: { p5: number; p25: number; p75: number; p95: number };
  /** Median max drawdown (0–1) across runs. */
  medianMaxDrawdown: number;
  /** Percentiles of max drawdown. */
  maxDrawdownPercentiles: { p5: number; p25: number; p75: number; p95: number };
}

/** Full comparison: one entry per strategy. */
export interface StrategyComparisonResult {
  initialBankrollUsd: number;
  strategies: StrategyStats[];
}

// --- Phase 4: Condition-Based Action Engine ---

/** Trigger type: when should the rule be evaluated. */
export type RuleTriggerType =
  | "price_above"
  | "price_below"
  | "portfolio_exposure_above"
  | "concentration_above"
  | "manual";

/** Trigger config: depends on trigger type (use rule.triggerType to discriminate). */
export type RuleTriggerConfig =
  | { contractId: string; value: number }
  | { factorId: string; value: number }
  | { value: number }
  | Record<string, never>;

/** Action when rule fires. */
export type RuleActionType = "notify" | "log";

export interface RuleAction {
  type: RuleActionType;
  /** For notify: message body (optional title in rule name). */
  message?: string;
}

/** Rule definition (UI/API shape). */
export interface ABERule {
  id: string;
  name: string;
  triggerType: RuleTriggerType;
  triggerConfig: RuleTriggerConfig;
  actions: RuleAction[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Context passed to the rule engine (current state). */
export interface RuleEngineContext {
  /** Contract id -> current price (0–1). */
  contractPrices?: Record<string, number>;
  /** Portfolio risk report when available. */
  portfolioReport?: PortfolioRiskReport;
  /** Bankroll set and non-zero. */
  bankrollSet?: boolean;
}

/** In-app notification created when a rule fires (or system). */
export interface ABENotification {
  id: string;
  ruleId?: string | null;
  ruleName?: string | null;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

// --- Phase 5: Strategy DNA & Behavioral Layer ---

/** User's market/sport focus (profile extension). */
export interface UserBettingProfile {
  preferredMarkets?: string[]; // e.g. ["kalshi", "polymarket"] or category slugs
  preferredSports?: string[];  // e.g. ["cbb", "nba"]
}

/** Edge accuracy summary from validated predictions (platform or user). */
export interface EdgeAccuracySummary {
  totalBets: number;
  wins: number;
  winRate: number; // 0–1
  /** Optional: average estimated edge on those bets (realized vs expected). */
  avgRealizedEdge?: number;
}

/** "Betting DNA" — aggregated profile for display and comparison. */
export interface BettingDNA {
  riskProfile: RiskProfile | null;
  kellyFraction: number;
  preferredMarkets: string[];
  preferredSports: string[];
  /** From validated Prediction outcomes (platform-level for now). */
  edgeSummary: EdgeAccuracySummary | null;
  /** Human-readable comparison to cohorts (e.g. "More conservative than 60% of users"). */
  comparisonSummary: string | null;
}
