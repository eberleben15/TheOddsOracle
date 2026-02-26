# Kalshi Sourcing Root Cause Analysis

## Problem

Only two market categories appear (Politics & Elections, Entertainment) with one series each, despite Kalshi having thousands of open markets across many categories.

## API Verification (Feb 2025)

| Endpoint | Result |
|----------|--------|
| `GET /series?limit=500` | Returns **8,676** series total (limit/cursor **ignored**) |
| `GET /series?category=Politics&limit=10` | Returns **3,040** series (limit **ignored**) |
| `GET /series` response | No `cursor` field — **no pagination** |
| `GET /markets?status=open&limit=1000` | Returns 1000 markets + cursor — **paginated** |
| `GET /events?status=open&limit=20` | Returns events with `series_ticker`, `category` — **correct discovery path** |

**Kalshi categories (from live API):** `""`, Climate and Weather, Companies, Crypto, Economics, Education, Elections, Entertainment, Financials, Health, Mentions, Politics, Science and Technology, Social, Sports, Transportation, World

## Root Causes

### 1. Series List API Ignores `limit` and Has No Pagination

- `GET /series` does **not** support `limit` or `cursor` per [docs](https://docs.kalshi.com/api-reference/market/get-series-list).
- Passing `limit: 50` is silently ignored; the API returns **all** matching series (e.g. 3,040 for Politics).
- Our code assumes we get a limited slice and then takes `series.slice(0, maxSeries)` (20–30 items).
- The **order** of returned series is undefined; the first 20–30 may have no open markets.

### 2. Series-First Discovery Is Wrong

- Current flow: `getSeriesList(category)` → check first 20 series for open markets via `getMarkets(series_ticker)`.
- Many series are dormant (no open markets). The first 20–30 in the list often have none.
- Result: Most categories show 0–1 series, even though thousands of series have open markets.

### 3. Category Name Mismatches

- We use `"Science"` but Kalshi uses `"Science and Technology"`.
- We lack: Financials, Companies, Education, Health, Social, Transportation.
- Series with empty `category` (`""`) are not mapped.

### 4. getMarketsByCategory Relies on Same Flawed Logic

- Uses `getSeriesList(category)` and first 20 series.
- If those 20 have few open markets, we get very few markets per category.

## Correct Approach (per Kalshi API Docs)

**Events API** is the proper discovery path:

1. `GET /events?status=open&with_nested_markets=true` — returns open events with markets.
2. Events have `series_ticker`, `category`, `title`.
3. Unique `(series_ticker, category)` from events = series that have open markets.
4. Derive series list from events instead of calling `/series` first.
5. Optionally: fetch full series list once and filter client-side to get titles for derived series.

## Fix Summary

| Component | Change |
|-----------|--------|
| `KalshiClient` | Add `getOpenEvents(params)` and `getSeriesWithOpenMarketsFromEvents()` |
| `series-browse` | Use Events-based discovery instead of `getSeriesWithOpenMarkets` |
| `getMarketsByCategory` | Use Events filtered by category instead of series-first |
| `kalshi-categories` | Add missing Kalshi categories (Financials, Science and Technology, etc.) |
