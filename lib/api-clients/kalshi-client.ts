/**
 * Kalshi API client for prediction market data.
 * Market data endpoints are public; portfolio endpoints require API key auth.
 * @see https://docs.kalshi.com/
 */

import type {
  KalshiMarketsResponse,
  GetMarketsParams,
  KalshiSeriesListResponse,
  GetSeriesListParams,
  KalshiMarket,
  KalshiSeries,
  KalshiMarketStatus,
  GetPositionsResponse,
  GetSettlementsResponse,
  KalshiCredentials,
} from "@/types/kalshi";
import { getKalshiAuthHeaders } from "@/lib/kalshi-auth";

// Public market data uses elections subdomain (all markets, not just elections)
const KALSHI_API_BASE = "https://api.elections.kalshi.com/trade-api/v2";
/** Path prefix for request signing (must match URL path after origin). */
const SIGNING_PATH_PREFIX = "/trade-api/v2";

export class KalshiClient {
  private baseUrl: string;

  constructor(baseUrl: string = KALSHI_API_BASE) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an authenticated GET request to a portfolio (or other) endpoint.
   */
  private async authenticatedGet<T>(
    credentials: KalshiCredentials,
    path: string,
    query?: Record<string, string>
  ): Promise<T> {
    const pathWithQuery = query && Object.keys(query).length > 0
      ? `${path}?${new URLSearchParams(query).toString()}`
      : path;
    const signPath = SIGNING_PATH_PREFIX + path;
    const headers = getKalshiAuthHeaders(
      credentials.apiKeyId,
      credentials.privateKeyPem,
      "GET",
      signPath
    );

    const url = `${this.baseUrl}${pathWithQuery}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "TheOddsOracle/1.0 (https://theoddsoracle.com)",
        ...headers,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Kalshi API error ${res.status}: ${text || res.statusText}`);
    }

    const json = (await res.json()) as T;
    return json;
  }

  /**
   * Fetch all pages of positions (active market positions).
   */
  async getPositions(credentials: KalshiCredentials): Promise<GetPositionsResponse> {
    const limit = 200;
    const allMarketPositions: GetPositionsResponse["market_positions"] = [];
    let cursor: string | undefined;

    do {
      const query: Record<string, string> = { limit: String(limit) };
      if (cursor) query.cursor = cursor;
      const path = "/portfolio/positions";
      const res = await this.authenticatedGet<GetPositionsResponse>(
        credentials,
        path,
        Object.keys(query).length > 0 ? query : undefined
      );
      allMarketPositions.push(...(res.market_positions ?? []));
      cursor = res.cursor && res.cursor.length > 0 ? res.cursor : undefined;
    } while (cursor);

    return {
      market_positions: allMarketPositions,
      event_positions: [],
      cursor: "",
    };
  }

  /**
   * Fetch settlements (past/resolved positions) with optional pagination limit.
   */
  async getSettlements(
    credentials: KalshiCredentials,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<GetSettlementsResponse> {
    const query: Record<string, string> = {};
    if (options.limit != null) query.limit = String(Math.min(200, options.limit));
    if (options.cursor) query.cursor = options.cursor;

    return this.authenticatedGet<GetSettlementsResponse>(
      credentials,
      "/portfolio/settlements",
      Object.keys(query).length > 0 ? query : undefined
    );
  }

  /**
   * Fetch markets with optional filters.
   * Public endpoint - no API key required.
   */
  async getMarkets(params: GetMarketsParams = {}): Promise<KalshiMarketsResponse> {
    const searchParams = new URLSearchParams();

    if (params.limit != null) {
      searchParams.set("limit", String(Math.min(1000, Math.max(1, params.limit))));
    }
    if (params.cursor) {
      searchParams.set("cursor", params.cursor);
    }
    if (params.status) {
      searchParams.set("status", params.status);
    }
    if (params.event_ticker) {
      searchParams.set("event_ticker", params.event_ticker);
    }
    if (params.series_ticker) {
      searchParams.set("series_ticker", params.series_ticker);
    }
    if (params.tickers) {
      searchParams.set("tickers", params.tickers);
    }

    const url = `${this.baseUrl}/markets?${searchParams.toString()}`;
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
      throw new Error(`Kalshi API error ${res.status}: ${text || res.statusText}`);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new Error("Kalshi API returned invalid JSON");
    }
    if (!json || typeof json !== "object") {
      throw new Error("Invalid Kalshi API response: not an object");
    }
    const obj = json as Record<string, unknown>;
    const markets = Array.isArray(obj.markets) ? obj.markets : [];
    const cursor = typeof obj.cursor === "string" ? obj.cursor : "";
    return { markets, cursor };
  }

  /**
   * Get open markets (default for display).
   */
  async getOpenMarkets(limit = 100, cursor?: string): Promise<KalshiMarketsResponse> {
    return this.getMarkets({ status: "open", limit, cursor });
  }

  /**
   * Fetch series list (templates for events). Can filter by category.
   * Public endpoint - no API key required.
   */
  async getSeriesList(params: GetSeriesListParams = {}): Promise<KalshiSeriesListResponse> {
    const searchParams = new URLSearchParams();
    if (params.limit != null) {
      searchParams.set("limit", String(Math.min(500, Math.max(1, params.limit))));
    }
    if (params.cursor) searchParams.set("cursor", params.cursor);
    if (params.category) searchParams.set("category", params.category);

    const url = `${this.baseUrl}/series?${searchParams.toString()}`;
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
      throw new Error(`Kalshi API error ${res.status}: ${text || res.statusText}`);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new Error("Kalshi API returned invalid JSON");
    }
    if (!json || typeof json !== "object") {
      throw new Error("Invalid Kalshi API response: not an object");
    }
    const obj = json as Record<string, unknown>;
    const series = Array.isArray(obj.series) ? obj.series : [];
    const cursor = typeof obj.cursor === "string" ? obj.cursor : "";
    return { series, cursor };
  }

  /**
   * Returns series that have at least one open market in the given category.
   * Used to filter the browse view so we only show series with tradeable markets.
   * Builds from per-category data to avoid global vs per-category list mismatch.
   */
  async getSeriesWithOpenMarkets(
    category: string,
    options: { maxSeries?: number } = {}
  ): Promise<KalshiSeries[]> {
    const maxSeries = Math.min(30, options.maxSeries ?? 20);
    const { series } = await this.getSeriesList({ category, limit: 50 });
    const toCheck = series.slice(0, maxSeries);
    const withOpen: KalshiSeries[] = [];

    await Promise.all(
      toCheck.map(async (s) => {
        try {
          const { markets } = await this.getMarkets({
            series_ticker: s.ticker,
            status: "open",
            limit: 1,
          });
          if (markets.length > 0) withOpen.push(s);
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[Kalshi] getMarkets(series=${s.ticker}) failed:`, err);
          }
        }
      })
    );

    return withOpen;
  }

  /**
   * Fetch markets for all series in a category (aggregates multiple API calls).
   * Use when you want to show only contracts in e.g. "Sports" or "Politics".
   */
  async getMarketsByCategory(
    category: string,
    options: { status?: KalshiMarketStatus; limit?: number } = {}
  ): Promise<KalshiMarketsResponse> {
    const status = options.status ?? "open";
    const limit = Math.min(150, Math.max(1, options.limit ?? 80));

    const { series } = await this.getSeriesList({ category, limit: 50 });
    const tickers = series.map((s) => s.ticker).slice(0, 20); // cap series to avoid timeout

    const allMarkets: KalshiMarket[] = [];
    const seen = new Set<string>();

    await Promise.all(
      tickers.map(async (seriesTicker) => {
        try {
          const { markets } = await this.getMarkets({
            series_ticker: seriesTicker,
            status,
            limit: 40,
          });
          for (const m of markets) {
            if (!seen.has(m.ticker)) {
              seen.add(m.ticker);
              allMarkets.push(m);
            }
          }
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[Kalshi] getMarkets(series=${seriesTicker}) failed:`, err);
          }
        }
      })
    );

    // Sort by close_time ascending (soonest first), then by volume
    allMarkets.sort((a, b) => {
      const aClose = a.close_time ? new Date(a.close_time).getTime() : 0;
      const bClose = b.close_time ? new Date(b.close_time).getTime() : 0;
      if (aClose !== bClose) return aClose - bClose;
      return (b.volume ?? 0) - (a.volume ?? 0);
    });

    return {
      markets: allMarkets.slice(0, limit),
      cursor: "",
    };
  }
}

let defaultClient: KalshiClient | null = null;

export function getKalshiClient(): KalshiClient {
  if (!defaultClient) {
    defaultClient = new KalshiClient(
      process.env.KALSHI_API_BASE_URL || undefined
    );
  }
  return defaultClient;
}
