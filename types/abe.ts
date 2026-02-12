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
 * Output of the portfolio risk engine: exposure, concentration, and warnings.
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
}
