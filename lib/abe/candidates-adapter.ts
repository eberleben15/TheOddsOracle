/**
 * Adapters to build decision-engine CandidateBet[] from existing app data.
 * Enables "build my slate" from recommended bets (sports), Kalshi, and Polymarket.
 */

import type { RecommendedBet } from "@/types";
import type { KalshiMarket } from "@/types/kalshi";
import type { PolymarketEvent, PolymarketMarket } from "@/types/polymarket";
import type { CandidateBet } from "./decision-engine-types";
import { kalshiMarketToABEContracts } from "./kalshi-adapter";
import { polymarketMarketToABEContracts } from "./polymarket-adapter";

const SPORTSBOOK_SOURCE = "sportsbook" as const;

/** Normalize probability to [0,1]. Favorable-bet-engine stores 0-100 (percentage). */
function toProb01(value: number): number {
  if (value > 1) return Math.max(0, Math.min(1, value / 100));
  return Math.max(0, Math.min(1, value));
}

/**
 * Convert RecommendedBet[] (sports value bets) to CandidateBet[].
 * Uses ourPrediction.probability as winProb, impliedProbability as price; edge in [0,1].
 * Handles both 0-1 and 0-100 (percentage) probability storage.
 */
export function recommendedBetsToCandidates(bets: RecommendedBet[]): CandidateBet[] {
  return bets.map((bet) => {
    const price = toProb01(bet.currentOdds.impliedProbability);
    const winProb = toProb01(bet.ourPrediction.probability);
    const edge = winProb - price;
    // Binary-like variance per $1: p(1-p) for probability p
    const variancePerDollar = price * (1 - price);
    // Group by game for correlation: same game = same factor
    const factorIds = [bet.gameId];

    return {
      id: bet.id,
      source: SPORTSBOOK_SOURCE,
      label: `${bet.gameTitle} — ${bet.recommendation}`,
      winProb,
      price,
      edge,
      variancePerDollar,
      factorIds,
      contractId: undefined,
      resolutionTime: undefined,
    };
  });
}

/**
 * Convert Kalshi open markets to CandidateBet[] (one per side: Yes and No).
 * Uses market mid price as winProb (no edge by default); optimizer will only include if we allow zero-edge or add edge later.
 */
export function kalshiMarketsToCandidates(markets: KalshiMarket[]): CandidateBet[] {
  const out: CandidateBet[] = [];
  for (const market of markets) {
    const contracts = kalshiMarketToABEContracts(market);
    for (const c of contracts) {
      const price = c.price;
      out.push({
        id: c.id,
        source: "kalshi",
        label: [c.title, c.subtitle].filter(Boolean).join(" — ") || c.id,
        winProb: price,
        price,
        edge: 0,
        variancePerDollar: price * (1 - price),
        factorIds: c.factorIds,
        contractId: c.id,
        resolutionTime: c.resolutionTime,
      });
    }
  }
  return out;
}

/**
 * Convert Polymarket markets (with optional event for labels/factors) to CandidateBet[].
 * One candidate per market side (Yes/No). No edge by default.
 */
export function polymarketMarketsToCandidates(
  markets: PolymarketMarket[],
  event?: PolymarketEvent
): CandidateBet[] {
  const out: CandidateBet[] = [];
  for (const market of markets) {
    const contracts = polymarketMarketToABEContracts(market, event);
    for (const c of contracts) {
      const price = c.price;
      out.push({
        id: c.id,
        source: "polymarket",
        label: [c.title, c.subtitle].filter(Boolean).join(" — ") || c.id,
        winProb: price,
        price,
        edge: 0,
        variancePerDollar: price * (1 - price),
        factorIds: c.factorIds,
        contractId: c.id,
        resolutionTime: c.resolutionTime,
      });
    }
  }
  return out;
}

/**
 * Convert Polymarket events to CandidateBet[] (all markets in each event).
 * Convenience for API: fetch events then flatten to candidates.
 */
export function polymarketEventsToCandidates(events: PolymarketEvent[]): CandidateBet[] {
  const out: CandidateBet[] = [];
  for (const event of events) {
    const markets = event.markets ?? [];
    out.push(...polymarketMarketsToCandidates(markets, event));
  }
  return out;
}
