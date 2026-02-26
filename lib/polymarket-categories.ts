/**
 * Polymarket category tags for filtering events.
 * Tag IDs from Gamma API; events can be filtered via ?tag_id=X.
 * @see https://docs.polymarket.com/developers/gamma-markets-api/get-events
 */

export interface PolymarketCategory {
  id: string;
  label: string;
  slug: string;
}

/** Main Polymarket categories matching their nav (Finance, Politics, Sports, etc.) */
export const POLYMARKET_CATEGORIES: PolymarketCategory[] = [
  { id: "120", label: "Finance", slug: "finance" },
  { id: "2", label: "Politics", slug: "politics" },
  { id: "1", label: "Sports", slug: "sports" },
  { id: "21", label: "Crypto", slug: "crypto" },
  { id: "100265", label: "Geopolitics", slug: "geopolitics" },
  { id: "1013", label: "Earnings", slug: "earnings" },
  { id: "1401", label: "Tech", slug: "tech" },
  { id: "596", label: "Culture", slug: "pop-culture" },
  { id: "101970", label: "World", slug: "world" },
  { id: "100328", label: "Economy", slug: "economy" },
  { id: "103037", label: "Climate & Science", slug: "climate-science" },
  { id: "144", label: "Elections", slug: "elections" },
];
