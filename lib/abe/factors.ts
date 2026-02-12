/**
 * Factor taxonomy for prediction markets (ABE).
 * Contracts are assigned to factors for exposure and concentration risk.
 */

import type { ABEFactor } from "@/types/abe";

/** Macro/thematic factors we use for decomposition. */
export const ABE_FACTORS: ABEFactor[] = [
  {
    id: "republican_performance",
    name: "Republican / GOP performance",
    description: "Elections and outcomes favoring Republicans",
  },
  {
    id: "democrat_performance",
    name: "Democrat performance",
    description: "Elections and outcomes favoring Democrats",
  },
  {
    id: "presidency",
    name: "Presidency",
    description: "Presidential election and administration",
  },
  {
    id: "congress",
    name: "Congress",
    description: "House and Senate outcomes",
  },
  {
    id: "fed_policy",
    name: "Fed / monetary policy",
    description: "Rates, inflation, Fed decisions",
  },
  {
    id: "inflation",
    name: "Inflation",
    description: "CPI, inflation metrics",
  },
  {
    id: "sports",
    name: "Sports",
    description: "Sports outcomes and awards",
  },
  {
    id: "crypto",
    name: "Crypto",
    description: "Crypto prices and adoption",
  },
  {
    id: "other",
    name: "Other",
    description: "Uncategorized",
  },
];

const FACTOR_IDS = new Set(ABE_FACTORS.map((f) => f.id));

/** Keywords (lowercase) that map to factor id. First match wins. */
const KEYWORD_TO_FACTOR: { keywords: string[]; factorId: string }[] = [
  { keywords: ["republican", "gop", "trump", "maga", "conservative"], factorId: "republican_performance" },
  { keywords: ["democrat", "democratic", "biden", "progressive"], factorId: "democrat_performance" },
  { keywords: ["president", "presidency", "white house", "potus"], factorId: "presidency" },
  { keywords: ["senate", "congress", "house of representatives", "house election"], factorId: "congress" },
  { keywords: ["fed", "interest rate", "rate cut", "rate hike", "fomc"], factorId: "fed_policy" },
  { keywords: ["inflation", "cpi", "pce"], factorId: "inflation" },
  { keywords: ["nfl", "nba", "mlb", "nhl", "super bowl", "world series", "championship", "mvp", "sports"], factorId: "sports" },
  { keywords: ["bitcoin", "crypto", "ethereum", "btc", "eth"], factorId: "crypto" },
];

/**
 * Assign factor ids to a Kalshi market based on title and event_ticker.
 * Returns at least ["other"] if no match.
 */
export function getFactorIdsForKalshiMarket(market: { title?: string; event_ticker?: string }): string[] {
  const text = [market.title, market.event_ticker].filter(Boolean).join(" ").toLowerCase();
  if (!text) return ["other"];

  const matched = new Set<string>();
  for (const { keywords, factorId } of KEYWORD_TO_FACTOR) {
    if (keywords.some((k) => text.includes(k))) {
      matched.add(factorId);
    }
  }

  if (matched.size === 0) matched.add("other");
  return Array.from(matched);
}

/**
 * Assign factor ids to a Polymarket market/event based on question, title, and tags.
 */
export function getFactorIdsForPolymarketMarket(
  market: { question?: string },
  event?: { title?: string; tags?: { label?: string; slug?: string }[] }
): string[] {
  const parts: string[] = [market.question, event?.title].filter(Boolean) as string[];
  if (event?.tags?.length) {
    for (const t of event.tags) {
      if (t.label) parts.push(t.label);
      if (t.slug) parts.push(t.slug);
    }
  }
  const text = parts.join(" ").toLowerCase();
  if (!text) return ["other"];

  const matched = new Set<string>();
  for (const { keywords, factorId } of KEYWORD_TO_FACTOR) {
    if (keywords.some((k) => text.includes(k))) matched.add(factorId);
  }
  if (matched.size === 0) matched.add("other");
  return Array.from(matched);
}

export function getFactorById(id: string): ABEFactor | undefined {
  return ABE_FACTORS.find((f) => f.id === id);
}

export function getFactorName(id: string): string {
  return getFactorById(id)?.name ?? id;
}
