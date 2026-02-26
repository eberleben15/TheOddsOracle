# Kalshi & Polymarket Sourcing — Gaps and Fixes

We're fetching too few markets. This doc summarizes the API docs and what to change.

---

## 1. Kalshi

### API reference
- Base: `https://api.elections.kalshi.com/trade-api/v2` (all markets, not just elections)
- Get markets: `GET /markets?status=open&limit=1000&cursor=...`
- Supports pagination via `cursor` (empty string = no more pages)
- Max limit: 1000 per request

### Current behavior
| Use case | Current | Problem |
|----------|---------|---------|
| Decision engine | `getOpenMarkets(30)` | Single request, 30 markets, no pagination |
| Series browse | `getAllSeriesWithOpenMarketsByCategory` (Events-based) | ✅ Fixed: uses GET /events?status=open to discover series with open markets |
| getMarketsByCategory | Events API with nested markets | ✅ Fixed: uses GET /events?status=open&with_nested_markets=true, filters by category |

### Recommended changes

1. **Add `getAllOpenMarkets(maxMarkets?: number)`** — Paginate `GET /markets?status=open&limit=1000` with cursor until we have enough or cursor is empty.

2. **Decision engine** — Call `getAllOpenMarkets(kalshiLimit)` instead of `getOpenMarkets(kalshiLimit)` so we paginate and get the requested number (or all if more).

3. **Optional: category filter** — Kalshi doesn’t filter by category on `/markets`; category lives on series. To get “Sports” markets, we’d need to fetch series by category, then markets by `series_ticker`. Alternatively, fetch all open markets and filter client-side by series metadata (if returned). Check response for `series_ticker` or `event_ticker`.

---

## 2. Polymarket

### API reference (Gamma API)
- Base: `https://gamma-api.polymarket.com`
- List events: `GET /events?active=true&closed=false&limit=100&offset=0`
- Supports pagination: `limit` + `offset`
- Ordering: `order=volume_24hr` (or `volume`, `liquidity`, `start_date`, etc.), `ascending=false` for highest first
- Docs: [Fetching Markets](https://docs.polymarket.com/market-data/fetching-markets.md)

### Current behavior
| Use case | Current | Problem |
|----------|---------|---------|
| Polymarket browse | 100 events per page, order=volume, Load More | ✅ Fixed: paginated, ordered by volume |
| Decision engine | `getAllActiveEvents(polymarketLimit)` | Uses paginated events with order=volume |

### Recommended changes

1. **Add `getAllActiveEvents(maxEvents?: number)`** — Paginate `GET /events?active=true&closed=false&limit=100&offset=...` until we have enough or get fewer than `limit` results. Use `order=volume_24hr&ascending=false` for highest-volume first.

2. **Add `order` and `ascending` to GetEventsParams** — Polymarket client already supports these; ensure we pass them for discovery.

3. **Decision engine** — Call `getAllActiveEvents(polymarketLimit)` with ordering by volume.

4. **Optional: tag filtering** — Use `GET /tags` to get tag IDs, then `?tag_id=X` to filter events by category/sport. Improves relevance if we want only politics, sports, etc.

---

## 3. Summary of code changes

| Component | Change |
|-----------|--------|
| `KalshiClient` | Add `getAllOpenMarkets(maxMarkets?: number)` that paginates with cursor |
| `PolymarketClient` | Add `getAllActiveEvents(maxEvents?: number, order?: string)` that paginates with offset, default `order=volume_24hr` |
| Decision engine API | Use `getAllOpenMarkets` and `getAllActiveEvents` instead of single-page calls |
| Types | Add `order` / `ascending` to Polymarket `GetEventsParams` if missing |

---

## 4. Kalshi base URL note

We use `api.elections.kalshi.com`. Kalshi also has `api.kalshi.com`; verify which returns the full market set. If elections is a subset, we may need to switch or add a fallback.
