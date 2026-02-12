/**
 * Polymarket Data API — user positions (no auth; requires wallet address).
 * @see https://docs.polymarket.com/developers/misc-endpoints/data-api-get-positions
 */

import type { PolymarketDataPosition } from "@/types/polymarket";

const DATA_API_BASE = "https://data-api.polymarket.com";

function isValidEthAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

/**
 * Fetch current positions for a wallet address.
 * User = Polymarket profile address (0x + 40 hex chars).
 */
export async function getPolymarketPositions(
  userAddress: string,
  options?: { limit?: number; offset?: number }
): Promise<PolymarketDataPosition[]> {
  const trimmed = userAddress.trim();
  if (!isValidEthAddress(trimmed)) {
    throw new Error("Invalid wallet address: must be 0x followed by 40 hex characters");
  }

  const params = new URLSearchParams({ user: trimmed });
  if (options?.limit != null) params.set("limit", String(Math.min(500, options.limit)));
  if (options?.offset != null) params.set("offset", String(options.offset));

  const url = `${DATA_API_BASE}/positions?${params.toString()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const res = await fetch(url, {
    signal: controller.signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "TheOddsOracle/1.0 (https://theoddsoracle.com)",
    },
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Polymarket Data API error ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<PolymarketDataPosition[]>;
}
