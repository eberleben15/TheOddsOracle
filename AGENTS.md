# The Odds Oracle — Agent & Developer Guide

This file orients AI agents and developers to the product direction and where to hook in.

## Product direction

- **Read first:** [docs/STRATEGIC_DIRECTION.md](docs/STRATEGIC_DIRECTION.md)
- **In short:** We are building a **two-brain** system:
  - **Brain A (prediction/edge):** Odds, stats, line movement → probabilities and value bets. Already in place (recommendation engine, advanced analytics, favorable-bet engine).
  - **Brain B (decision engine):** Given many candidate bets and constraints, choose *which* positions and *what sizes* (portfolio construction). This is the next major capability. Optimizer should be **pluggable** (classical first, then heuristics/quantum-inspired/quantum if they benchmark well).

## User value (lead with these, not "quantum")

1. One-click portfolio construction from bankroll + candidate set  
2. Automatic risk controls (correlation caps, max position, liquidity-aware sizing)  
3. Cross-market coordination (sports + Kalshi + Polymarket)  
4. Execution and monitoring (alerts, rebalancing)  
5. Explainability ("why these 7, not those 12")

## Code layout relevant to strategy

| Area | Location | Notes |
|------|----------|--------|
| Edge / value bets | `lib/recommendation-engine.ts`, `lib/advanced-analytics.ts`, `lib/favorable-bet-engine.ts`, `lib/betting-utils.ts` | Brain A |
| Per-bet sizing | `lib/abe/bankroll-engine.ts` | Kelly, drawdown heuristics |
| Portfolio risk (existing positions) | `lib/abe/portfolio-risk-engine.ts` | Correlations, factor exposure, variance |
| Strategy simulation | `lib/abe/strategy-simulator.ts` | Flat vs Kelly on sequences |
| Decision engine (subset + sizes) | `lib/abe/decision-engine-types.ts` (plug-in contract); implementations TBD | To be implemented; classical first |

## When adding features

- **User-facing:** Prioritize outcomes (better portfolios, risk control, clarity). Keep existing flows (matchups, value bets, portfolio risk, bankroll, rules) intact.
- **Decision engine / optimizer:** Implement against the **optimizer plug-in contract** so we can swap classical / heuristic / quantum backends without rewriting the app. See `docs/STRATEGIC_DIRECTION.md` and `lib/abe/decision-engine-types.ts` for the `DecisionEngineOptimizer` interface.

## Proving "quantum advantage"

Aim to prove advantage on the **optimization subproblem** (same instance, same constraints, compare solvers on quality/time/scaling), not on "profit." Document in `docs/STRATEGIC_DIRECTION.md` and any benchmark repos.
