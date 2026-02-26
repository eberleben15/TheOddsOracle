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
  KalshiEvent,
  KalshiEventsResponse,
  GetEventsParams,
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
    if (params.mve_filter) {
      searchParams.set("mve_filter", params.mve_filter);
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
   * Excludes MVE combo markets for browse (they have concatenated titles and 0 prices).
   */
  async getOpenMarkets(limit = 100, cursor?: string): Promise<KalshiMarketsResponse> {
    return this.getMarkets({ status: "open", limit, cursor, mve_filter: "exclude" });
  }

  /**
   * Fetch events with optional filters. Public endpoint - no API key required.
   * Events are the correct discovery path for series that have open markets.
   * @see https://docs.kalshi.com/api-reference/events/get-events
   */
  async getEvents(params: GetEventsParams = {}): Promise<KalshiEventsResponse> {
    const searchParams = new URLSearchParams();
    if (params.limit != null) {
      searchParams.set("limit", String(Math.min(200, Math.max(1, params.limit))));
    }
    if (params.cursor) searchParams.set("cursor", params.cursor);
    if (params.status) searchParams.set("status", params.status);
    if (params.series_ticker) searchParams.set("series_ticker", params.series_ticker);
    if (params.with_nested_markets === true) {
      searchParams.set("with_nested_markets", "true");
    }

    const url = `${this.baseUrl}/events?${searchParams.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

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

    const json = (await res.json()) as unknown;
    if (!json || typeof json !== "object") {
      throw new Error("Invalid Kalshi API response: not an object");
    }
    const obj = json as Record<string, unknown>;
    const events = Array.isArray(obj.events) ? obj.events : [];
    const cursor = typeof obj.cursor === "string" ? obj.cursor : "";
    return { events: events as KalshiEvent[], cursor };
  }

  /**
   * Fetch all open events with pagination.
   */
  async getAllOpenEvents(maxEvents = 500): Promise<KalshiEvent[]> {
    const all: KalshiEvent[] = [];
    let cursor: string | undefined;

    do {
      const res = await this.getEvents({
        status: "open",
        limit: 200,
        cursor,
      });
      all.push(...res.events);
      cursor = res.cursor && res.cursor.length > 0 ? res.cursor : undefined;
    } while (cursor && all.length < maxEvents);

    return all.slice(0, maxEvents);
  }

  /**
   * Fetch all open markets with pagination until we have enough or no more pages.
   * Use this when you need broad coverage (e.g. decision engine, discovery).
   */
  async getAllOpenMarkets(maxMarkets?: number): Promise<KalshiMarket[]> {
    const cap = maxMarkets ?? 500;
    const all: KalshiMarket[] = [];
    let cursor: string | undefined;

    do {
      const remaining = cap - all.length;
      if (remaining < 1) break;
      const limit = Math.min(1000, remaining);
      const res = await this.getMarkets({ status: "open", limit, cursor, mve_filter: "exclude" });
      all.push(...(res.markets ?? []));
      cursor = res.cursor && res.cursor.length > 0 ? res.cursor : undefined;
    } while (cursor && all.length < cap);

    return all.slice(0, cap);
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
   * DEPRECATED: Uses series-first discovery; GET /series ignores limit and returns
   * thousands of series in undefined order, so first 20 often have no open markets.
   * Use getSeriesWithOpenMarketsFromEvents instead.
   */
  async getSeriesWithOpenMarkets(
    category: string,
    options: { maxSeries?: number } = {}
  ): Promise<KalshiSeries[]> {
    return this.getSeriesWithOpenMarketsFromEvents(category, {
      maxEvents: options.maxSeries ? options.maxSeries * 25 : undefined,
    });
  }

  /**
   * Returns series with open markets by discovering from Events API.
   * Events are the correct source: GET /events?status=open returns only tradeable events.
   * We derive unique (series_ticker, category) from events, then join with series list for titles.
   */
  async getSeriesWithOpenMarketsFromEvents(
    category?: string,
    options: { maxEvents?: number } = {}
  ): Promise<KalshiSeries[]> {
    const byCat = await this.getAllSeriesWithOpenMarketsByCategory(options);
    if (category == null || category === "") {
      return Array.from(byCat.values()).flat();
    }
    const list = byCat.get(category) ?? [];
    return [...list].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }

  /**
   * Batch discovery: fetch open events + series list once, return series grouped by category.
   * Use this for series-browse to avoid N API calls per category.
   */
  async getAllSeriesWithOpenMarketsByCategory(options: { maxEvents?: number } = {}): Promise<Map<string, KalshiSeries[]>> {
    const maxEvents = options.maxEvents ?? 500;
    const [events, { series: allSeries }] = await Promise.all([
      this.getAllOpenEvents(maxEvents),
      this.getSeriesList({}), // No filter - get all; API ignores limit, returns full list
    ]);

    const seriesByTicker = new Map<string, KalshiSeries>();
    for (const s of allSeries) {
      seriesByTicker.set(s.ticker, s);
    }

    const byCategory = new Map<string, Map<string, KalshiSeries>>();

    for (const ev of events) {
      const cat = (ev.category ?? "").trim() || "Other";
      const key = `${ev.series_ticker}::${cat}`;

      if (!byCategory.has(cat)) byCategory.set(cat, new Map());
      const seen = byCategory.get(cat)!;
      if (seen.has(key)) continue;
      seen.set(key, seriesByTicker.get(ev.series_ticker) ?? {
        ticker: ev.series_ticker,
        title: ev.title,
        category: cat,
      });
    }

    const result = new Map<string, KalshiSeries[]>();
    for (const [cat, m] of byCategory) {
      const list = Array.from(m.values()).sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      result.set(cat, list);
    }
    return result;
  }

  /**
   * Fetch markets for a category using Events API (correct discovery path).
   * Events have category; we fetch open events with nested markets and filter by category.
   */
  async getMarketsByCategory(
    category: string,
    options: { status?: KalshiMarketStatus; limit?: number } = {}
  ): Promise<KalshiMarketsResponse> {
    const status = options.status ?? "open";
    const limit = Math.min(200, Math.max(1, options.limit ?? 80));

    if (status !== "open") {
      return this.getMarketsByCategoryLegacy(category, options);
    }

    const allMarkets: KalshiMarket[] = [];
    const seen = new Set<string>();
    let cursor: string | undefined;

    do {
      const res = await this.getEvents({
        status: "open",
        limit: 200,
        cursor,
        with_nested_markets: true,
      });

      for (const ev of res.events) {
        const cat = (ev.category ?? "").trim() || "Other";
        if (cat !== category) continue;

        for (const m of ev.markets ?? []) {
          const s = (m.status ?? "").toLowerCase();
          if (s !== "open" && s !== "active") continue;
          if (seen.has(m.ticker)) continue;
          seen.add(m.ticker);
          allMarkets.push(m);
        }
      }

      cursor = res.cursor && res.cursor.length > 0 ? res.cursor : undefined;
    } while (cursor && allMarkets.length < limit);

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

  /** Legacy series-first approach; used when status !== "open". */
  private async getMarketsByCategoryLegacy(
    category: string,
    options: { status?: KalshiMarketStatus; limit?: number } = {}
  ): Promise<KalshiMarketsResponse> {
    const limit = Math.min(150, Math.max(1, options.limit ?? 80));
    const { series } = await this.getSeriesList({ category });
    const tickers = series.map((s) => s.ticker).slice(0, 20);

    const allMarkets: KalshiMarket[] = [];
    const seen = new Set<string>();

    await Promise.all(
      tickers.map(async (seriesTicker) => {
        try {
          const { markets } = await this.getMarkets({
            series_ticker: seriesTicker,
            status: options.status ?? "open",
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

    allMarkets.sort((a, b) => {
      const aClose = a.close_time ? new Date(a.close_time).getTime() : 0;
      const bClose = b.close_time ? new Date(b.close_time).getTime() : 0;
      if (aClose !== bClose) return aClose - bClose;
      return (b.volume ?? 0) - (a.volume ?? 0);
    });

    return { markets: allMarkets.slice(0, limit), cursor: "" };
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
