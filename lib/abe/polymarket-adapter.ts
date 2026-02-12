/**
 * Polymarket → ABE adapter.
 * Maps Polymarket events/markets to unified ABE Contract.
 */

import type { PolymarketMarket, PolymarketEvent, PolymarketDataPosition } from "@/types/polymarket";
import type { ABEContract, ABEPosition } from "@/types/abe";
import { getFactorIdsForPolymarketMarket } from "./factors";

function parseOutcomePrices(outcomePrices?: string): [number, number] {
  if (!outcomePrices) return [0.5, 0.5];
  try {
    const arr = JSON.parse(outcomePrices) as unknown;
    if (Array.isArray(arr) && arr.length >= 2) {
      const yes = Number(arr[0]);
      const no = Number(arr[1]);
      if (Number.isFinite(yes) && Number.isFinite(no)) return [yes, no];
    }
  } catch {
    // ignore
  }
  return [0.5, 0.5];
}

/** Unique id for ABE: polymarket:{conditionId or marketId}:yes | :no */
export function polymarketMarketToABEContractId(market: PolymarketMarket, side: "yes" | "no"): string {
  const id = market.conditionId || market.id;
  return `polymarket:${id}:${side}`;
}

/**
 * Map a single Polymarket market (binary) to two ABE contracts (Yes and No).
 */
export function polymarketMarketToABEContracts(
  market: PolymarketMarket,
  event?: PolymarketEvent
): ABEContract[] {
  const [yesPrice, noPrice] = parseOutcomePrices(market.outcomePrices);
  const factorIds = getFactorIdsForPolymarketMarket(market, event);

  const yesContract: ABEContract = {
    id: polymarketMarketToABEContractId(market, "yes"),
    source: "polymarket",
    title: market.question || event?.title || "Market",
    subtitle: "Yes",
    price: yesPrice,
    bid: market.bestBid,
    ask: market.bestAsk,
    resolutionTime: market.endDateIso || market.endDate || event?.endDate,
    meta: {
      conditionId: market.conditionId,
      marketId: market.id,
      slug: market.slug,
      volumeNum: market.volumeNum,
    },
    factorIds,
  };

  const noContract: ABEContract = {
    ...yesContract,
    id: polymarketMarketToABEContractId(market, "no"),
    subtitle: "No",
    price: noPrice,
  };

  return [yesContract, noContract];
}

/**
 * Flatten an event's markets into ABE contracts.
 */
export function polymarketEventToABEContracts(event: PolymarketEvent): ABEContract[] {
  const out: ABEContract[] = [];
  for (const m of event.markets || []) {
    out.push(...polymarketMarketToABEContracts(m, event));
  }
  return out;
}

/** Resolve ABE contract id to Polymarket condition/market id. */
export function abeContractIdToPolymarketConditionId(contractId: string): string | null {
  const m = /^polymarket:(.+):(yes|no)$/.exec(contractId);
  return m ? m[1] : null;
}

/**
 * Map Polymarket Data API position to ABE contract id (polymarket:{conditionId}:yes|no).
 */
export function polymarketDataPositionToABEContractId(
  conditionId: string,
  outcome: string
): string {
  const side = outcome?.toLowerCase() === "no" ? "no" : "yes";
  return `polymarket:${conditionId}:${side}`;
}

/**
 * Convert Data API positions to ABE positions.
 */
export function polymarketDataPositionsToABEPositions(
  dataPositions: PolymarketDataPosition[]
): ABEPosition[] {
  return dataPositions.map((p) => {
    const side = p.outcome?.toLowerCase() === "no" ? "no" : "yes";
    const contractId = polymarketDataPositionToABEContractId(p.conditionId, p.outcome ?? "Yes");
    return {
      contractId,
      side,
      size: p.size,
      costPerShare: Number(p.avgPrice) || 0,
    } satisfies ABEPosition;
  });
}
