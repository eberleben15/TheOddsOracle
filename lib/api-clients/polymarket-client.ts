/**
 * Polymarket Gamma API client (market discovery, no auth).
 * @see https://docs.polymarket.com/quickstart/fetching-data
 */

import type {
  PolymarketEvent,
  PolymarketMarket,
  GetEventsParams,
  GetMarketsParams,
} from "@/types/polymarket";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

export class PolymarketClient {
  private baseUrl: string;

  constructor(baseUrl: string = GAMMA_API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const searchParams = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") searchParams.set(k, String(v));
      }
    }
    const url = `${this.baseUrl}${path}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
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
      throw new Error(`Polymarket API error ${res.status}: ${text || res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Fetch all active events with pagination, ordered by 24h volume (highest first).
   * Use this when you need broad coverage (e.g. decision engine, discovery).
   */
  async getAllActiveEvents(
    maxEvents?: number,
    order: string = "volume_24hr"
  ): Promise<PolymarketEvent[]> {
    const cap = maxEvents ?? 200;
    const all: PolymarketEvent[] = [];
    let offset = 0;
    const limit = 100;

    while (offset < cap) {
      const res = await this.getEvents({
        active: true,
        closed: false,
        limit,
        offset,
        order,
        ascending: false,
      });
      if (res.length === 0) break;
      all.push(...res);
      if (res.length < limit) break;
      offset += limit;
      if (all.length >= cap) break;
    }

    return all.slice(0, cap);
  }

  /**
   * Fetch active events (live, tradable).
   */
  async getEvents(params: GetEventsParams = {}): Promise<PolymarketEvent[]> {
    const limit = Math.min(100, Math.max(1, params.limit ?? 24));
    const query: Record<string, string | number | boolean> = {
      limit,
      active: params.active ?? true,
      closed: params.closed ?? false,
    };
    if (params.offset != null) query.offset = params.offset;
    if (params.tag_id) query.tag_id = params.tag_id;
    if (params.order) query.order = params.order;
    if (params.ascending != null) query.ascending = params.ascending;

    return this.get<PolymarketEvent[]>("/events", query);
  }

  /**
   * Fetch markets (optionally by slug).
   */
  async getMarkets(params: GetMarketsParams = {}): Promise<PolymarketMarket[]> {
    const query: Record<string, string | number | boolean> = {};
    if (params.limit != null) query.limit = Math.min(200, params.limit);
    if (params.offset != null) query.offset = params.offset;
    if (params.closed != null) query.closed = params.closed;
    if (params.slug) query.slug = params.slug;

    return this.get<PolymarketMarket[]>("/markets", query);
  }

  /**
   * Get a single market by slug.
   */
  async getMarketBySlug(slug: string): Promise<PolymarketMarket | null> {
    const list = await this.getMarkets({ slug, limit: 1 });
    return list[0] ?? null;
  }

  /**
   * Fetch markets (and parent events) for given condition IDs.
   * Used by portfolio analysis to resolve Polymarket positions to contracts.
   */
  async getMarketsForConditionIds(
    conditionIds: string[]
  ): Promise<Map<string, { market: PolymarketMarket; event: PolymarketEvent }>> {
    const want = new Set(conditionIds);
    if (want.size === 0) return new Map();

    const result = new Map<string, { market: PolymarketMarket; event: PolymarketEvent }>();

    const collectFromEvents = async (closed: boolean) => {
      let offset = 0;
      const limit = 100;
      while (offset < 300 && want.size > result.size) {
        const events = await this.getEvents({ limit, offset, active: !closed, closed });
        if (events.length === 0) break;
        for (const event of events) {
          for (const market of event.markets ?? []) {
            const cid = market.conditionId ?? market.id;
            if (cid && want.has(cid) && !result.has(cid)) {
              result.set(cid, { market, event });
            }
          }
        }
        if (events.length < limit) break;
        offset += limit;
      }
    };

    await collectFromEvents(false);
    if (result.size < want.size) await collectFromEvents(true);
    return result;
  }
}

let defaultClient: PolymarketClient | null = null;

export function getPolymarketClient(): PolymarketClient {
  if (!defaultClient) {
    defaultClient = new PolymarketClient(
      process.env.POLYMARKET_GAMMA_API_URL || undefined
    );
  }
  return defaultClient;
}
