# Dummy Portfolio & Admin Testing (Multi-Tenant)

## Overview

The **dummy portfolio** lets the **admin user** run tests and visualize portfolio risk, bankroll intelligence, and factor exposure **without using real positions**. It is designed to be **multi-tenant safe**: only the admin can access demo data; other users never see it and their data is never mixed with demo data.

## How It Works

### 1. Demo data (static)

- **Location:** `data/demo-portfolio.ts`
- **Contents:** A fixed list of `ABEPosition[]` and `ABEContract[]` (fake Kalshi-style tickers like `DEMO-ELEC24`, `DEMO-FED25`, etc.) with notional and factor IDs so risk and bankroll math run correctly.
- **Scope:** Code-only; no per-user or per-tenant storage. Not written to the database.

### 2. Admin-only API

- **GET `/api/demo-portfolio`**  
  - **Access:** Admin only (`requireAdmin()`).  
  - **Returns:** `{ positions, contracts }` from `getDemoPortfolio()`.  
  - **Multi-tenant:** Non-admin users get 403. Demo data is not tied to any real user or tenant.

- **GET `/api/bankroll?demo=1`**  
  - **Access:** Authenticated; when `demo=1` the backend uses demo positions **only if** the current user is admin.  
  - **Returns:** `BankrollSummary` computed from demo positions (and stored bankroll settings).  
  - **Multi-tenant:** Demo is applied only for the requesting user’s session; other tenants’ bankroll and positions are unchanged.

### 3. Portfolio page (admin UX)

- **Admin-only block:** “Demo portfolio (admin)” section.
  - **“Use demo portfolio”** → calls `GET /api/demo-portfolio`, replaces the current user’s **in-memory** positions and contracts with demo data, sets a “demo mode” flag. Risk analysis and bankroll then use this in-memory state (and, for bankroll, the backend uses demo positions when the summary is fetched with `?demo=1`).
  - **“Load my real positions”** → calls `GET /api/positions`, restores real positions, clears demo mode.
- **Bankroll section:** Shows summary; when in demo mode, summary is fetched with `?demo=1` and displays an “(demo)” badge. Saving bankroll still updates the **real** user’s `UserBankrollSettings` (no demo-specific persistence).

### 4. Demo when no connections (all users)

- When a signed-in user has **no** Kalshi and **no** Polymarket connection:
  - **GET `/api/positions`** returns the demo portfolio and sets `kalshiConnected: true`, `polymarketConnected: true` so the app behaves as if both were connected.
  - **GET `/api/positions/snapshot`** returns demo positions + contracts (so portfolio risk analysis works without a saved snapshot).
  - **GET `/api/kalshi/status`** and **GET `/api/polymarket/status`** return `connected: true` so the UI shows “Kalshi · Polymarket” as connected.
  - **GET `/api/bankroll`** uses demo positions for the summary.
- As soon as the user connects either Kalshi or Polymarket, all of the above use real data; demo is only a fallback when there are no connections.

### 5. Dashboard

- The dashboard portfolio and bankroll cards use positions from the APIs above (demo when no connections, real when connected).

## Multi-Tenant Guarantees

| Concern | Handling |
|--------|----------|
| Who sees demo? | Any signed-in user with **no** Kalshi and **no** Polymarket connection sees demo portfolio and “connected” UI. Admin can also use `?demo=1` bankroll and `/api/demo-portfolio`. |
| Where is demo data stored? | Nowhere. Static in `data/demo-portfolio.ts`. |
| Does demo overwrite real data? | No. As soon as the user connects Kalshi or Polymarket, all APIs use real data. |
| Are other users’ positions ever used for demo? | No. Demo is fixed data; real positions are always scoped by `session.user.id`. |
| Bankroll settings | Stored per user in `UserBankrollSettings`; demo only changes which **positions** are used for the summary. |

## Running Tests as Admin

1. **Log in** as the admin user (email matching `ADMIN_EMAIL` in env).
2. Go to **Prediction Markets → Portfolio**.
3. In **“Demo portfolio (admin)”**, click **“Use demo portfolio”**.
4. Positions list and risk analysis now use demo data; **“Analyze portfolio”** uses demo contracts so factor exposure and correlations are meaningful.
5. **Bankroll** section shows summary with “(demo)” when in demo mode (P(drawdown), recommended max position, etc.).
6. To return to real data: click **“Load my real positions”** (or sync again from Connections).

## Optional: Seeding Real Test Data for Admin

If you want the admin to have **real** positions in the DB (e.g. for E2E tests or staging):

- **Option A:** Use Kalshi/Polymarket test accounts and connect them as the admin user in **Connections**. All data remains scoped to that user.
- **Option B:** A one-off seed script that:
  - Resolves the admin user by `ADMIN_EMAIL`.
  - Inserts only test/dummy rows (e.g. in a future `TestPosition` or similar table) linked to that user’s `userId`.
  - Never touches other users’ data.

The current implementation does **not** add a separate test-positions table; it uses the static demo portfolio so no schema or tenant data is mixed.

## Long-term storage: how we store and update positions per user

- **Live data:** When a user has Kalshi and/or Polymarket connected, **GET `/api/positions`** fetches positions from the Kalshi and Polymarket APIs on each request. No positions are stored in our DB for this path; we always use the latest from the providers.
- **Snapshot (cache):** The **`PortfolioSnapshot`** table (Prisma) stores one row per user: `userId`, `positions` (JSON), `contracts` (JSON), `fetchedAt`. This is used for:
  - **GET `/api/positions/snapshot`** — returns the last saved snapshot (or demo when no connections and no snapshot).
  - **POST `/api/positions/snapshot`** — called when the user clicks “Sync” or “Save snapshot” on the portfolio page; writes the current positions (and optional contracts) to the DB so risk analysis can use contract metadata without refetching.
- **Updating per user long-term:**
  - **Option A (current):** Rely on live API: every time the user opens the app we fetch from Kalshi/Polymarket. Snapshot is optional and used to cache contracts for the risk engine.
  - **Option B (future):** Background job or cron that, for each user with connections, fetches positions and **POST**s to `/api/positions/snapshot` periodically so the snapshot is always fresh and we can show data even if the provider API is slow or down.
- **Demo:** Demo data is never written to the DB. When the user has no connections we serve static demo from `data/demo-portfolio.ts`; when they connect, we switch to live (and optionally snapshot) data.

## Files Touched

- `data/demo-portfolio.ts` — static demo positions and contracts.
- `app/api/demo-portfolio/route.ts` — admin-only GET.
- `app/api/positions/route.ts` — GET returns demo when no connections.
- `app/api/positions/snapshot/route.ts` — GET returns demo when no snapshot and no connections.
- `app/api/kalshi/status/route.ts` — GET returns `connected: true` when no connections (demo mode).
- `app/api/polymarket/status/route.ts` — GET returns `connected: true` when no connections (demo mode).
- `app/api/bankroll/route.ts` — GET uses demo positions when no connections; `?demo=1` for admin.
- `app/api/me/route.ts` — returns `{ admin }` for client.
- `app/(app)/prediction-markets/portfolio/page.tsx` — demo toggle, bankroll section, analyze with demo contracts.
- `lib/abe/bankroll-engine.ts` — Kelly and P(drawdown) heuristic.
- `prisma/schema.prisma` — `UserBankrollSettings`, `PortfolioSnapshot` (positions + contracts per user).
