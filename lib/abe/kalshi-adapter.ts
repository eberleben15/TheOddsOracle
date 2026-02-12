/**
 * Kalshi → ABE adapter.
 * Maps Kalshi API types to unified ABE Contract for the core engine.
 */

import type { KalshiMarket } from "@/types/kalshi";
import type { ABEContract, ABEPosition } from "@/types/abe";
import { getFactorIdsForKalshiMarket } from "./factors";

/** Kalshi prices are in cents (0–100). Convert to probability in [0, 1]. */
function centsToProbability(cents: number | undefined): number {
  if (cents == null || Number.isNaN(cents)) return 0.5;
  return Math.max(0, Math.min(1, cents / 100));
}

/**
 * Map a Kalshi market to one or two ABE contracts (Yes and No).
 * We emit one contract per side so the engine can treat Yes and No as separate exposures.
 * id format: "kalshi:{ticker}:yes" | "kalshi:{ticker}:no"
 */
export function kalshiMarketToABEContracts(market: KalshiMarket): ABEContract[] {
  const yesPrice = centsToProbability(
    market.yes_ask != null && market.yes_bid != null
      ? (market.yes_ask + market.yes_bid) / 2
      : market.last_price ?? market.yes_bid ?? market.yes_ask
  );
  const noPrice = 1 - yesPrice;

  const yesContract: ABEContract = {
    id: `kalshi:${market.ticker}:yes`,
    source: "kalshi",
    title: market.title,
    subtitle: market.yes_sub_title ?? "Yes",
    price: yesPrice,
    bid: market.yes_bid != null ? market.yes_bid / 100 : undefined,
    ask: market.yes_ask != null ? market.yes_ask / 100 : undefined,
    resolutionTime: market.close_time || market.expiration_time,
    meta: {
      ticker: market.ticker,
      event_ticker: market.event_ticker,
      market_type: market.market_type,
      volume: market.volume,
      open_interest: market.open_interest,
    },
    factorIds: getFactorIdsForKalshiMarket(market),
  };

  const noContract: ABEContract = {
    ...yesContract,
    id: `kalshi:${market.ticker}:no`,
    subtitle: market.no_sub_title ?? "No",
    price: noPrice,
    bid: market.no_bid != null ? market.no_bid / 100 : undefined,
    ask: market.no_ask != null ? market.no_ask / 100 : undefined,
  };

  return [yesContract, noContract];
}

/**
 * Resolve a position's contractId (e.g. "kalshi:TICKER:yes") to the underlying Kalshi ticker.
 */
export function abeContractIdToKalshiTicker(contractId: string): string | null {
  const match = /^kalshi:(.+):(yes|no)$/.exec(contractId);
  return match ? match[1] : null;
}

/**
 * Build ABE contract id from Kalshi ticker and side.
 */
export function kalshiTickerToABEContractId(ticker: string, side: "yes" | "no"): string {
  return `kalshi:${ticker}:${side}`;
}

/**
 * Map Kalshi market_positions response to ABE positions.
 * position > 0 => yes shares, position < 0 => no shares. Cost per share from market_exposure_dollars / |position|.
 */
export function kalshiMarketPositionsToABEPositions(
  marketPositions: { ticker: string; position: number; market_exposure_dollars?: string }[]
): ABEPosition[] {
  const out: ABEPosition[] = [];
  for (const mp of marketPositions) {
    const pos = mp.position;
    if (pos === 0) continue;
    const side: "yes" | "no" = pos > 0 ? "yes" : "no";
    const size = Math.abs(pos);
    const exposureStr = mp.market_exposure_dollars ?? "0";
    const exposure = parseFloat(exposureStr);
    const costPerShare = Number.isFinite(exposure) && size > 0
      ? Math.max(0, Math.min(1, exposure / size))
      : 0.5; // fallback
    out.push({
      contractId: kalshiTickerToABEContractId(mp.ticker, side),
      side,
      size,
      costPerShare,
    });
  }
  return out;
}
