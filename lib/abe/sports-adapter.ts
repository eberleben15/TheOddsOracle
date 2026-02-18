/**
 * Sports (matchup) → ABE adapter.
 * Maps game outcomes (moneyline, spread, total) to ABE position/contract for Sandbox.
 * Contract ID scheme: sandbox:sports:{gameId}:{marketType}:{outcomeKey}
 */

import type { ABEPosition, ABEContract } from "@/types/abe";

export type SportsMarketType = "moneyline" | "spread" | "total";
export type SportsOutcomeKey = "away" | "home" | "over" | "under";

function buildContractId(
  gameId: string,
  marketType: SportsMarketType,
  outcomeKey: SportsOutcomeKey
): string {
  return `sandbox:sports:${gameId}:${marketType}:${outcomeKey}`;
}

/**
 * Decimal odds → implied probability (cost per share in [0,1]).
 */
function decimalToCostPerShare(decimalOdds: number): number {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 0) return 0.5;
  return Math.max(0.01, Math.min(0.99, 1 / decimalOdds));
}

/**
 * Build ABE position for a sports outcome.
 */
export function sportsOutcomeToABEPosition(
  gameId: string,
  marketType: SportsMarketType,
  outcomeKey: SportsOutcomeKey,
  decimalPrice: number,
  size: number = 100
): ABEPosition {
  const costPerShare = decimalToCostPerShare(decimalPrice);
  return {
    contractId: buildContractId(gameId, marketType, outcomeKey),
    side: "yes",
    size,
    costPerShare,
  };
}

/**
 * Build ABE contract for a sports outcome (for display and risk).
 */
export function sportsOutcomeToABEContract(
  gameId: string,
  awayTeamName: string,
  homeTeamName: string,
  marketType: SportsMarketType,
  outcomeKey: SportsOutcomeKey,
  decimalPrice: number,
  point?: number
): ABEContract {
  const price = decimalToCostPerShare(decimalPrice);
  const id = buildContractId(gameId, marketType, outcomeKey);
  let title: string;
  if (marketType === "moneyline") {
    title = outcomeKey === "away" ? `${awayTeamName} ML` : `${homeTeamName} ML`;
  } else if (marketType === "spread") {
    const team = outcomeKey === "away" ? awayTeamName : homeTeamName;
    const pt = point != null ? (point >= 0 ? `+${point}` : `${point}`) : "";
    title = `${team} ${pt}`.trim();
  } else {
    title = outcomeKey === "over" ? `Over ${point ?? ""}`.trim() : `Under ${point ?? ""}`.trim();
  }
  return {
    id,
    source: "sportsbook",
    title,
    subtitle: marketType,
    price,
    resolutionTime: undefined,
    meta: point != null ? { point } : undefined,
  };
}
