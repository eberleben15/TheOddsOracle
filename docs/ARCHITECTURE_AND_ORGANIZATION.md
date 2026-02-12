# Architecture & Organization Review

Production-readiness review for The Odds Oracle: App Router, components, lib, and imports.

---

## 1. Current State Assessment

### 1.1 App Router (`app/`)

| Area | Current State | Notes |
|------|---------------|------|
| **Routes** | Flat: `page.tsx`, `dashboard/`, `matchup/[id]/`, `live/[id]/`, `chat/`, `auth/*`, `admin/`, `pricing/`, `account/`, `config-error/` | No route groups; public vs app routes mixed at top level. |
| **Layout** | Single `layout.tsx` with auth-based sidebar/header | Works; could be clarified with route groups. |
| **Loading/Error** | `loading.tsx` in dashboard and matchup; root `error.tsx`, `global-error.tsx` | Good. |
| **Client components** | `DashboardClient.tsx`, `ChatClient.tsx` next to their `page.tsx` | Good pattern. |
| **API routes** | 20+ routes under `app/api/` (auth, cron, stripe, odds, predictions, etc.) | Functional but flat; could group by domain. |

### 1.2 Components (`components/`)

- **25 components** in a single flat folder.
- **Shared vs page-specific**: Many components are used by only one page but live in the global `components/` folder:
  - **Dashboard-only**: `MatchupCard`, `LiveGameCard`, `StatsCards`, `RecommendedBetsSection`, `GameSearchAndFilter`.
  - **Matchup-only**: `StatsDisplay`, `MatchupHeader`, `BettingInsights`, `AdvancedAnalyticsWrapper`, `AdvancedAnalytics`.
- **Truly shared**: `TeamLogo`, `EmptyState`, `ErrorDisplay`, `LoadingSkeleton`, `StatusCard`, `Sidebar`, `Header`, `LandingPage`, `LandingLayout`, `PremiumGate`, etc.
- **Type in component**: `RecommendedBet` is defined in `RecommendedBets.tsx` and `ChatBetCard.tsx` and imported by **lib** (`recommended-bets-aggregator.ts`, `recommended-bets-cache.ts`). Types used by server/lib should live in `types/`.

### 1.3 Lib (`lib/`)

- **50+ modules** (flat + subdirs: `sports/`, `api-clients/`, `test-sources/`).
- Mix of core (auth, prisma, env, stripe), domain (odds, sports, betting, predictions), and utilities (utils, retry, cache).
- No formal split between “core” and “feature” libs; naming is the only cue.

### 1.4 Types (`types/`)

- Central `types/index.ts` for Odds API, Stats API, matchup types.
- `RecommendedBet` and duplicate in components cause **lib → component** imports for types (inverted dependency).

---

## 2. Target Architecture & Standardized Pattern

### 2.1 App Router

- **Route groups** (no URL change):
  - `app/(marketing)/` – landing (e.g. `page.tsx` for `/`).
  - `app/(app)/` – authenticated app: `dashboard/`, `live/`, `matchup/`, `chat/`, `account/`, `admin/`, `pricing/`, `config-error/`.
  - `app/auth/` – signin, signout, error, verify-request (unchanged).
- **Convention**:
  - Each route folder contains: `page.tsx`, optional `layout.tsx`, `loading.tsx`, `error.tsx`.
  - Page-specific client components and small helpers live in that route’s `_components/` folder (Next.js ignores `_` in URL).
- **API**: Keep `app/api/` as-is or group by domain later (e.g. `api/(cron)/`, `api/(stripe)/`) without changing paths.

### 2.2 Components

- **`components/`** – only **shared** UI used by 2+ routes or by the root layout:
  - Layout: `Sidebar`, `Header`, `LandingLayout`, `LandingPage`.
  - Shared UI: `TeamLogo`, `EmptyState`, `ErrorDisplay`, `LoadingSkeleton`, `StatusCard`, `PremiumGate`, etc.
- **Colocated** (next to the page that uses them):
  - `app/dashboard/_components/`: `MatchupCard`, `LiveGameCard`, `StatsCards`, `RecommendedBetsSection`, `GameSearchAndFilter`.
  - `app/matchup/[id]/_components/`: `StatsDisplay`, `MatchupHeader`, `BettingInsights`, `AdvancedAnalyticsWrapper`, `AdvancedAnalytics`.
- **Chat**: `ChatBetCard` is used only by chat; move to `app/chat/_components/` (and re-export types from `types/` if needed).

### 2.3 Lib

- Keep a single `lib/` tree. Optional later: `lib/core/` (auth, prisma, env, stripe) vs `lib/features/` (odds, sports, betting).
- **Naming**: Prefer domain prefixes: `odds-api`, `sports/`, `prediction-tracker`, `recommended-bets-aggregator`.
- **No lib → component imports for types**: All shared types (including `RecommendedBet`) live in `types/` and are imported by both lib and components.

### 2.4 Types

- **Single source of truth**: `types/index.ts` (or `types/odds.ts`, `types/betting.ts` if you split).
- Move `RecommendedBet` (and any other type used by lib) from components into `types/`.
- Components and lib import from `@/types` only.

### 2.5 Import Conventions

- **Pages / route components**:  
  `@/components/...` for shared UI; `./_components/...` for colocated components.
- **Lib**: `@/types`, `./relative` within lib.
- **No**: `lib` importing from `components` (except for types; eliminate by moving types to `types/`).

---

## 3. Refactoring Checklist

1. **Types**
   - [x] Add `RecommendedBet` to `types/index.ts`.
   - [x] Remove type from `RecommendedBets.tsx` and `ChatBetCard.tsx`; import from `@/types`.
   - [x] Update `lib/recommended-bets-aggregator.ts` and `lib/recommended-bets-cache.ts` to import from `@/types`.

2. **App Router**
   - [x] Create `app/(marketing)/page.tsx` (move from `app/page.tsx`).
   - [x] Create `app/(app)/dashboard/`, `live/`, `matchup/`, `chat/`, `account/`, `admin/`, `pricing/`, `config-error/` by moving existing route folders into `(app)`.
   - [x] Delete original `app/page.tsx` and empty route folders after move.
   - [x] Verify all links and redirects (e.g. `redirect("/dashboard")`).

3. **Dashboard colocation**
   - [x] Create `app/(app)/dashboard/_components/`.
   - [x] Move `MatchupCard`, `LiveGameCard`, `StatsCards`, `RecommendedBetsSection`, `GameSearchAndFilter` from `components/` to `app/(app)/dashboard/_components/`.
   - [x] Fix internal refs (e.g. `TeamLogo`, `@/types`) and update `DashboardClient.tsx` to import from `./_components/...`.

4. **Matchup colocation**
   - [x] Create `app/(app)/matchup/[id]/_components/`.
   - [x] Move `StatsDisplay`, `MatchupHeader`, `BettingInsights`, `AdvancedAnalyticsWrapper`, `AdvancedAnalytics` from `components/` to `app/(app)/matchup/[id]/_components/`.
   - [x] Fix internal refs and update `app/(app)/matchup/[id]/page.tsx` to import from `./_components/...`.

5. **Chat colocation**
   - [x] Move `ChatBetCard` to `app/(app)/chat/_components/`; ensure type comes from `@/types`.
   - [x] Update `ChatClient.tsx` to import from `./_components/ChatBetCard`.

6. **RecommendedBets**
   - [x] Keep `RecommendedBets.tsx` in `components/` (used by dashboard `RecommendedBetsSection`). Update imports to use `@/types` for `RecommendedBet`.
   - [x] Ensure `FavorableBets`, `RecommendedBetsSection` and other consumers use `@/types` for the type.

7. **Imports**
   - [x] Global search for `@/components/MatchupCard`, `LiveGameCard`, etc., and replace with colocated imports.
   - [x] Run build and fix any remaining broken imports (FavorableBets dynamic import, AdvancedAnalytics `total` type).

8. **Optional**
   - [x] Add `docs/ARCHITECTURE_AND_ORGANIZATION.md` to the repo.
   - [ ] Introduce `lib/core/` vs `lib/features/` later if the team grows.

**Note:** Build may still fail on pre-existing errors (e.g. `lib/api-clients/api-sports-client.ts`). Fix those separately.

---

## 4. File Tree (Target)

```
app/
  layout.tsx
  providers.tsx
  globals.css
  error.tsx
  global-error.tsx
  not-found.tsx
  (marketing)/
    page.tsx
  (app)/
    dashboard/
      page.tsx
      DashboardClient.tsx
      loading.tsx
      _components/
        MatchupCard.tsx
        LiveGameCard.tsx
        StatsCards.tsx
        RecommendedBetsSection.tsx
        GameSearchAndFilter.tsx
    matchup/
      [id]/
        page.tsx
        loading.tsx
        _components/
          StatsDisplay.tsx
          MatchupHeader.tsx
          BettingInsights.tsx
          AdvancedAnalyticsWrapper.tsx
          AdvancedAnalytics.tsx
    live/
      [id]/
        page.tsx
    chat/
      page.tsx
      ChatClient.tsx
      _components/
        ChatBetCard.tsx
    account/
    admin/
    pricing/
    config-error/
  auth/
  api/
components/          # Shared only
  Sidebar.tsx
  Header.tsx
  LandingPage.tsx
  LandingLayout.tsx
  TeamLogo.tsx
  EmptyState.tsx
  ErrorDisplay.tsx
  LoadingSkeleton.tsx
  StatusCard.tsx
  ...
lib/
types/
  index.ts           # includes RecommendedBet
```

---

## 5. Summary

- **App Router**: Use `(marketing)` and `(app)` route groups; keep one root layout.
- **Components**: Shared only in `components/`; page-specific components in `app/.../ _components/`.
- **Types**: All shared types (including `RecommendedBet`) in `types/`; no lib → component imports for types.
- **Imports**: Update after every move; use `./_components/` for colocated components and `@/types` for types.

This keeps the app production-ready with a consistent, scalable structure and clear ownership per route.
