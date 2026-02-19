# Prediction Markets API Payloads

Investigation doc for Kalshi and Polymarket API structures and how we display them.

**Run inspection:** `npx tsx scripts/inspect-prediction-markets-payloads.ts`

---

## Kalshi

**Base URL:** `https://api.elections.kalshi.com/trade-api/v2`  
**Docs:** https://docs.kalshi.com/

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /series?category=Sports&limit=50` | List series (templates) by category |
| `GET /markets?series_ticker=...&status=open&limit=100` | Markets for a series |
| `GET /markets?status=open&limit=100` | All open markets |

### Series Response (`GET /series`)

**Actual payload (Sports category):** Returns full series objects with many fields:

- `ticker`, `title`, `category`, `frequency`, `tags`
- `additional_prohibitions`, `contract_terms_url`, `contract_url`
- `settlement_sources` (array of { name, url })
- `fee_type`, `fee_multiplier`
- `volume`, `volume_fp` (when `include_volume=true`)

We use: `ticker`, `title`, `category`, `frequency`, `tags`, `volume`, `volume_fp`.

### Market Response (`GET /markets`)

**Actual payload:** API returns `status: "active"` for tradeable markets (not just "open"). We filter for both.

| Field | Type | Notes |
|-------|------|-------|
| `ticker`, `event_ticker` | string | IDs |
| `title`, `subtitle` | string | `yes_sub_title` / `no_sub_title` = outcome labels (e.g. "Santa Clara", "Sacramento St.") |
| `status` | string | `"active"` or `"open"` for tradeable; we accept both |
| `yes_bid`, `yes_ask`, `no_bid`, `no_ask` | number | 0–100 cents |
| `last_price` | number | 0–100; can be 0 for No-heavy markets |
| `volume`, `volume_fp`, `volume_24h` | number/string | |
| `close_time`, `open_time` | ISO string | |

**Our display:** `last_price` for Yes %; fallback to `(yes_bid + yes_ask) / 2` when missing.

### Flow: Browse → Series → Markets

1. **Series browse** (`/api/kalshi/series-browse`): For each category, fetches series list, then checks which have open markets. Returns series with tradeable markets.
2. **Category markets** (`/api/kalshi/markets?category=Sports`): Fetches series by category, then markets per series, merges and sorts by `close_time`.
3. **Series markets** (`/api/kalshi/markets?series_ticker=KXBASKETBALL`): Markets for one series.

---

## Polymarket

**Base URL:** `https://gamma-api.polymarket.com` (Gamma API)  
**Docs:** https://docs.polymarket.com/quickstart/fetching-data

### Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /events?limit=24&active=true&closed=false` | Active events (questions) |
| `GET /markets?slug=...` | Markets by slug |

### Event Response (`GET /events`)

```json
[
  {
    "id": "0x123...",
    "slug": "will-x-happen",
    "title": "Will X happen?",
    "subtitle": "Resolution by Jan 20",
    "active": true,
    "closed": false,
    "markets": [
      {
        "id": "0xabc...",
        "question": "Will X happen?",
        "conditionId": "0x...",
        "outcomes": "[\"Yes\",\"No\"]",
        "outcomePrices": "[\"0.65\",\"0.35\"]",
        "volume": "10000",
        "volumeNum": 10000,
        "bestBid": 0.64,
        "bestAsk": 0.66,
        "lastTradePrice": 0.65,
        "closed": false,
        "endDate": "2025-01-20",
        "endDateIso": "2025-01-20T23:59:59Z"
      }
    ],
    "volume": 10000,
    "liquidity": 50000,
    "endDate": "2025-01-20T23:59:59Z"
  }
]
```

**Price fields (0–1 decimals):**

| Field | Meaning |
|-------|---------|
| `outcomePrices` | JSON string `["0.65","0.35"]` = [Yes, No] |
| `bestBid` | Best bid (0–1) |
| `bestAsk` | Best ask (0–1) |
| `lastTradePrice` | Last trade price (0–1) |

**Our display (PolymarketEventCard):**

1. Prefer `outcomePrices` if valid (yes/no both in (0,1) and not 0/1)
2. Else: `(bestBid + bestAsk) / 2` for Yes
3. Else: `lastTradePrice` for Yes
4. Else: fallback 0.5/0.5

**Actual payload findings:**

- Events have multiple `markets` (e.g. MicroStrategy event: 3 markets for different date thresholds)
- First market can be `closed: true` with `outcomePrices: "[\"0\", \"1\"]"` (resolved)
- Open markets have `outcomePrices: "[\"0.135\", \"0.865\"]"`, `bestBid`, `bestAsk`, `lastTradePrice`
- Event-level: `volume`, `liquidity`, `endDate`; market-level: `endDateIso`, `volumeNum`, `liquidityNum`

**Common issues:**

- `outcomePrices` can be stale or resolved (`["0","1"]` / `["1","0"]`) — we skip these
- Multi-market events: we pick the first **open** market with valid prices
- `bestBid`/`bestAsk` may be missing for thin markets — fallback to `lastTradePrice`

---

## Our Category Grouping (Kalshi)

We map Kalshi categories into display groups:

| Group | Kalshi categories |
|-------|-------------------|
| Sports | Sports |
| Politics & Elections | Politics, Elections |
| Entertainment | Entertainment |
| Finance & Crypto | Economics, Crypto |
| Science & World | Climate and Weather, Science, World |
| Other | Mentions, Other |

Series are grouped by `series.category`; we then show series titles and link to their markets.

---

## Debugging

**Admin endpoint:** `GET /api/admin/debug/prediction-markets-payloads` (admin-only) returns sample raw payloads from both APIs for inspection. Use this to verify actual response shapes and fix display logic.
