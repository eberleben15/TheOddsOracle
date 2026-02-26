# Polymarket Sourcing Root Cause Analysis

## Problem

Only a handful of Polymarket events appear in the browse view (4–24), despite Polymarket having hundreds of active markets across many categories.

## API Verification (Feb 2025)

| Endpoint | Result |
|----------|--------|
| `GET /events?active=true&closed=false&limit=100&offset=0` | Returns 100 events |
| `GET /events?limit=100&offset=2000` | Returns 100 events — pagination works |
| `order=volume&ascending=false` | ✅ Valid — sorts by total volume (highest first) |
| `order=volume24hr&ascending=false` | ✅ Valid — sorts by 24h volume |
| `order=volume_24hr` (snake_case) | ❌ Validation error — Gamma API uses camelCase |
| `order=liquidity&ascending=false` | ✅ Valid |
| Tag filter: `tag_id=...` | Supported — use `GET /tags` to discover tag IDs |

**Gamma API base:** `https://gamma-api.polymarket.com`  
**Docs:** https://docs.polymarket.com/developers/gamma-markets-api/get-events

## Root Causes

### 1. Low Limit — Only 24 Events Requested

- `PolymarketBrowseClient` fetches `/api/polymarket/events?limit=24&active=true&closed=false`
- The API supports up to 100 per request; we request 24.
- Result: At most 24 events (often fewer after filtering to events with open markets).

### 2. No Pagination

- No `offset` parameter; no “Load more” button.
- Users see only the first page.
- Gamma API supports `limit` + `offset` for pagination.

### 3. No Ordering

- We don’t pass `order` or `ascending`.
- Results come in arbitrary order — can include low-volume or stale events first.
- Docs recommend `order=volume` or `order=volume24hr`, `ascending=false` for highest-volume first.

### 4. API Route Doesn’t Expose Order/Offset

- `/api/polymarket/events` accepts `limit`, `active`, `closed`, `tag_id`.
- It does not accept `order`, `ascending`, or `offset`.

### 5. Unused Pagination Logic in Client

- `PolymarketClient` has `getAllActiveEvents(maxEvents?, order)` that paginates correctly.
- `PolymarketBrowseClient` bypasses it and calls the API directly with fixed `limit=24`.

## Correct Pattern (per Polymarket Docs)

**Events endpoint is the right discovery path:**

1. `GET /events?active=true&closed=false&limit=100&offset=0&order=volume&ascending=false`
2. Paginate with `offset` until you have enough or get fewer than `limit` results.
3. Order by `volume` or `volume24hr` for most relevant (highest-volume) events first.

**Optional: Tag filtering for categories**

- `GET /tags` to discover tag IDs.
- `GET /events?tag_id=...&active=true&closed=false` to filter by category/sport.

## Fix Summary (✅ Implemented)

| Component | Change |
|-----------|--------|
| `/api/polymarket/events` | ✅ Added `order`, `ascending`, `offset`; default limit=100, order=volume |
| `PolymarketBrowseClient` | ✅ Requests 100 events per page with `order=volume`, Load More button |
| `getAllActiveEvents` | ✅ Uses `order=volume` (Gamma API camelCase; `volume_24hr` invalid) |

## Valid Order Values (Gamma API)

- `volume` — total volume (use for discovery)
- `volume24hr` — 24h volume (camelCase, not `volume_24hr`)
- `liquidity` — market liquidity
- Others per Gamma OpenAPI; `start_date` etc. may be invalid in practice.
