/**
 * Kalshi API types for prediction markets.
 * @see https://docs.kalshi.com/api-reference/market/get-markets
 */

export type KalshiMarketStatus =
  | "unopened"
  | "open"
  | "active" // API may return "active" for tradeable markets
  | "paused"
  | "closed"
  | "settled"
  | "initialized";

export interface KalshiMarket {
  ticker: string;
  event_ticker: string;
  market_type: string;
  title: string;
  subtitle?: string;
  yes_sub_title?: string;
  no_sub_title?: string;
  created_time: string;
  updated_time: string;
  open_time: string;
  close_time: string;
  expiration_time: string;
  latest_expiration_time?: string;
  status: KalshiMarketStatus;
  response_price_units?: string;
  yes_bid?: number;
  yes_bid_dollars?: string;
  yes_ask?: number;
  yes_ask_dollars?: string;
  no_bid?: number;
  no_bid_dollars?: string;
  no_ask?: number;
  no_ask_dollars?: string;
  last_price?: number;
  last_price_dollars?: string;
  volume?: number;
  volume_fp?: string;
  volume_24h?: number;
  volume_24h_fp?: string;
  result?: "yes" | "no";
  can_close_early?: boolean;
  open_interest?: number;
  open_interest_fp?: string;
  notional_value?: number;
  notional_value_dollars?: string;
  liquidity?: number;
  liquidity_dollars?: string;
  expiration_value?: string;
  tick_size?: number;
  rules_primary?: string;
  rules_secondary?: string;
  expected_expiration_time?: string;
  settlement_value?: number;
  settlement_value_dollars?: string;
  settlement_ts?: string;
}

export interface KalshiMarketsResponse {
  markets: KalshiMarket[];
  cursor: string;
}

export interface GetMarketsParams {
  limit?: number;
  cursor?: string;
  status?: KalshiMarketStatus;
  event_ticker?: string;
  series_ticker?: string;
  tickers?: string;
  /** "exclude" = skip MVE combo markets (bad titles, 0 prices). Use for browse. */
  mve_filter?: "only" | "exclude";
}

/** Series = template for recurring events (e.g. "Monthly Jobs Report", "NFL Wins") */
export interface KalshiSeries {
  ticker: string;
  title: string;
  category?: string;
  frequency?: string;
  tags?: string[] | null;
  volume?: number;
  volume_fp?: string;
}

export interface KalshiSeriesListResponse {
  series: KalshiSeries[];
  cursor: string;
}

export interface GetSeriesListParams {
  limit?: number;
  cursor?: string;
  category?: string;
}

/** Event from GET /events - template for one occurrence (e.g. "Jan 2026 Jobs Report") */
export interface KalshiEvent {
  event_ticker: string;
  series_ticker: string;
  title: string;
  category?: string;
  markets?: KalshiMarket[];
}

export interface KalshiEventsResponse {
  events: KalshiEvent[];
  cursor: string;
}

export interface GetEventsParams {
  limit?: number;
  cursor?: string;
  status?: "open" | "closed" | "settled";
  series_ticker?: string;
  with_nested_markets?: boolean;
}

// --- Authenticated portfolio endpoints ---

/** Single market position from GET /portfolio/positions. position > 0 = yes shares, < 0 = no shares. */
export interface KalshiMarketPosition {
  ticker: string;
  total_traded?: number;
  total_traded_dollars?: string;
  position: number;
  position_fp?: string;
  market_exposure?: number;
  market_exposure_dollars?: string;
  realized_pnl?: number;
  realized_pnl_dollars?: string;
  resting_orders_count?: number;
  fees_paid?: number;
  fees_paid_dollars?: string;
  last_updated_ts?: string;
}

export interface GetPositionsResponse {
  market_positions: KalshiMarketPosition[];
  event_positions?: unknown[];
  cursor: string;
}

/** Single settlement from GET /portfolio/settlements (past/resolved). */
export interface KalshiSettlement {
  ticker: string;
  event_ticker?: string;
  market_result?: "yes" | "no";
  yes_count?: number;
  yes_count_fp?: string;
  yes_total_cost?: number;
  no_count?: number;
  no_count_fp?: string;
  no_total_cost?: number;
  revenue?: number;
  settled_time?: string;
  fee_cost?: string;
  value?: number;
}

export interface GetSettlementsResponse {
  settlements: KalshiSettlement[];
  cursor: string;
}

/** Credentials for authenticated Kalshi API (API Key ID + PEM private key). */
export interface KalshiCredentials {
  apiKeyId: string;
  privateKeyPem: string;
}
