/**
 * Polymarket Gamma API types.
 * @see https://docs.polymarket.com/quickstart/fetching-data
 */

export interface PolymarketTag {
  id?: string;
  label?: string;
  slug?: string;
}

/** Single market inside an event (binary Yes/No). */
export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId?: string;
  slug?: string;
  clobTokenIds?: string[]; // [yesTokenId, noTokenId]
  outcomes?: string; // JSON string e.g. '["Yes","No"]'
  outcomePrices?: string; // JSON string e.g. '["0.65","0.35"]'
  volume?: string;
  volumeNum?: number;
  liquidityNum?: number;
  endDate?: string;
  endDateIso?: string;
  active?: boolean;
  closed?: boolean;
  bestBid?: number;
  bestAsk?: number;
  lastTradePrice?: number;
}

/** Event = one question; can have multiple markets (e.g. multi-outcome). */
export interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  active?: boolean;
  closed?: boolean;
  markets: PolymarketMarket[];
  tags?: PolymarketTag[];
  endDate?: string;
  startDate?: string;
  volume?: number;
  liquidity?: number;
}

export interface GetEventsParams {
  active?: boolean;
  closed?: boolean;
  limit?: number;
  offset?: number;
  tag_id?: string;
  order?: string;
  ascending?: boolean;
}

export interface GetMarketsParams {
  limit?: number;
  offset?: number;
  closed?: boolean;
  slug?: string;
}

/** Data API position (GET https://data-api.polymarket.com/positions?user=0x...) */
export interface PolymarketDataPosition {
  proxyWallet?: string;
  asset?: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue?: number;
  currentValue?: number;
  cashPnl?: number;
  percentPnl?: number;
  totalBought?: number;
  realizedPnl?: number;
  percentRealizedPnl?: number;
  curPrice?: number;
  redeemable?: boolean;
  mergeable?: boolean;
  title?: string;
  slug?: string;
  icon?: string;
  eventSlug?: string;
  outcome?: string; // "Yes" | "No"
  outcomeIndex?: number;
  oppositeOutcome?: string;
  oppositeAsset?: string;
  endDate?: string;
  negativeRisk?: boolean;
}
