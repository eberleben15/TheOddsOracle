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

### 4. Dashboard

- The dashboard **Bankroll** card always uses **real** positions (no demo). Demo is only on the portfolio page and when explicitly requesting `/api/bankroll?demo=1` as admin.

## Multi-Tenant Guarantees

| Concern | Handling |
|--------|----------|
| Who can load demo? | Only admin (`isAdmin()`). `/api/demo-portfolio` and `?demo=1` bankroll are gated. |
| Where is demo data stored? | Nowhere. Static in `data/demo-portfolio.ts`. |
| Does demo overwrite real data? | No. Demo only replaces in-memory state on the portfolio page; “Load my real positions” restores from `/api/positions`. |
| Are other users’ positions ever used for demo? | No. Demo is fixed data; real positions are always scoped by `session.user.id` in `/api/positions` and `/api/bankroll`. |
| Bankroll settings | Stored per user in `UserBankrollSettings`; demo mode only changes which **positions** are used for the summary, not which user’s settings. |

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

## Files Touched

- `data/demo-portfolio.ts` — static demo positions and contracts.
- `app/api/demo-portfolio/route.ts` — admin-only GET.
- `app/api/bankroll/route.ts` — GET with `?demo=1` for admin, PATCH for settings.
- `app/api/me/route.ts` — returns `{ admin }` for client.
- `app/(app)/prediction-markets/portfolio/page.tsx` — demo toggle, bankroll section, analyze with demo contracts.
- `lib/abe/bankroll-engine.ts` — Kelly and P(drawdown) heuristic.
- `prisma/schema.prisma` — `UserBankrollSettings` model.
