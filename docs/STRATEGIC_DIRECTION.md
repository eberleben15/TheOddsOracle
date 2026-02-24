# Strategic Direction: Two-Brain Architecture & Decision Engine

This document captures the major product and technical direction for The Odds Oracle: **prediction/edge (Brain A)** plus **decision engine (Brain B)** with a pluggable optimizer, and a realistic path to quantum advantage on the optimization subproblem.

---

## 1. What We're Building (Plain Terms)

### Two brains

| Brain | Role | Today |
|-------|-----|--------|
| **Brain A: Prediction / edge finding** | Ingest data (odds, injuries, line movement, market prices, sentiment) → produce probabilities or price estimates (“edge”). | Classical: stats APIs, recommendation engine, value bet detection, edge %. |
| **Brain B: Decision engine** | Given edges, **allocate bankroll across many possible bets** under real constraints. | Per-bet Kelly sizing + portfolio risk analysis on *existing* positions. **Not yet**: “Given N opportunities, pick best subset + sizes.” |

Users don’t show up because it’s “quantum.” They show up if the product **wins more / loses less / saves time / reduces risk / unlocks bets they couldn’t manage manually.**

---

## 2. Why the Decision Engine (Brain B) Matters

Once you add real constraints, the decision step becomes a **combinatorial optimization problem**:

- “Don’t exceed 2% bankroll on any one position”
- “Don’t take correlated bets together”
- “Max exposure per sport / per day”
- “Only place bets where liquidity is sufficient”
- “Avoid bets that share the same outcome driver”
- “Rebalance across sportsbooks + Kalshi + Polymarket”
- “Minimize tail risk while hitting a return target”

**Example:** Model finds small edges on 25 opportunities today (12 sportsbook, 8 Kalshi, 5 Polymarket). Each has EV, variance, liquidity, correlation with others. Goal: *“Pick the best set of positions + sizes that maximize expected log-growth (or EV) while keeping drawdown risk below X and obeying all constraints.”*

That is portfolio construction + knapsack + correlation constraints — too big for brute force, hard for naïve heuristics, and where **quantum or quantum-inspired optimizers** can aim to search large combination spaces efficiently.

---

## 3. User-Facing Value (Lead With This, Not “Quantum”)

1. **One-click portfolio construction** — “Here’s my bankroll. Build me a diversified slate.”
2. **Automatic risk controls** — Max daily loss, correlation caps, liquidity-aware sizing.
3. **Cross-market coordination** — Sports + prediction markets + hedges across them.
4. **Execution + monitoring** — Alerts, rebalancing, “close position if probability shifts.”
5. **Clarity** — “Why did you take these 7 positions and avoid those 12?”

If the decision engine materially improves outcomes or workflow vs “pick my own bets,” we have a product. If not, quantum won’t save it.

---

## 4. Roadmap (Stay Honest, Keep Product Viable)

| Step | What | Why |
|------|------|-----|
| **1** | **Build the product with a classical optimizer first** | Users, real constraints, real data on what matters. |
| **2** | **Design the optimizer as a plug-in** | Swap classical MIP / heuristics / quantum (or quantum-inspired) without rewriting the app. |
| **3** | **Identify one “quantum-shaped” optimization problem** | Constrained bet selection + sizing (knapsack-like), correlation-limited portfolio (graph), hedging across venues with limited liquidity (integer constraints). |
| **4** | **Benchmark like a scientist** | Same inputs, constraints, and metrics; measure scaling. If hybrid wins on some slice, we have something real. |

---

## 5. Proving “Quantum Advantage”

- **Level 1 (most realistic):** Advantage on the **optimization subproblem**. Same instance; compare classical solvers vs hybrid quantum on objective quality, time, scalability. Easiest to defend.
- **Level 2 (sometimes realistic):** Advantage in **decision latency** when lines move fast and we need a good portfolio under complex constraints quickly.
- **Level 3 (hardest):** Advantage in **actual betting profits**. Noisy (edge quality, execution, variance); avoid claiming this first.

**Bottom line:** Prove advantage on the decision engine first, not on “profit.”

Quantum becomes valuable if it **expands the feasible frontier**: better solutions, faster, under more realism (e.g. larger portfolios, more faithful correlation constraints, near–real-time re-optimization).

---

## 6. Risk: Classical Methods Are Strong

Modern classical solvers (MIP, convex optimization, metaheuristics) are very good. The quantum edge is unlikely to be “quantum beats classical on a small, clean problem.” It would need to be:

- “Quantum helps on **messy, large, constrained** instances where heuristics struggle,” or  
- “Hybrid gives **comparable solutions faster** when constraints explode.”

Picking the right optimization formulation is critical.

---

## 7. Mapping to Our Codebase

| Concept | Current location |
|--------|------------------|
| **Brain A** | `lib/recommendation-engine.ts`, `lib/advanced-analytics.ts`, `lib/favorable-bet-engine.ts`, `lib/betting-utils.ts` (edge, value bets), `docs/PREDICTION_ENGINE_STANDARDS.md` |
| **Per-bet sizing** | `lib/abe/bankroll-engine.ts` (Kelly, drawdown heuristics) |
| **Portfolio risk (existing positions)** | `lib/abe/portfolio-risk-engine.ts` (correlations, factor exposure, variance curve) |
| **Strategy comparison** | `lib/abe/strategy-simulator.ts` (flat vs Kelly on bet sequences) |
| **Decision engine (subset + sizes)** | **Foundation in place.** Plug-in: `lib/abe/decision-engine-types.ts`. Classical greedy: `lib/abe/greedy-optimizer.ts`. Runner: `lib/abe/decision-engine-runner.ts`. Adapter: `lib/abe/candidates-adapter.ts` (RecommendedBet → CandidateBet). API: `POST /api/abe/decision-engine` (sport + bankroll → slate). |

---

## 8. “Day in the Life” Target (Concrete)

Example user story to drive the optimization formulation:

- **User:** $2,000 bankroll, wants 5–12 positions per day.
- **Constraints:** Max 3 correlated exposures, cross-market hedges allowed, max single position 2% of bankroll, liquidity minimum per market.
- **Input:** Candidate set (sports + Kalshi + Polymarket) with EV, variance, liquidity, correlation info.
- **Output:** Selected positions + sizes that maximize risk-adjusted return (e.g. expected log-growth or EV with drawdown cap) and a short “why these / not those” explanation.

This maps to variables (which bets, what size), constraints (caps, correlation, liquidity), and objective — and is where a hybrid quantum approach could slot in once the plug-in exists and we have a classical baseline.

---

## 9. Summary

- **Viable as a business?** Yes — if we lead with “best portfolio + risk engine across books and markets,” not “quantum betting.”
- **Will people use it?** Yes — if it helps them allocate capital better, manage risk, and automate execution/monitoring.
- **Can we prove quantum advantage?** Potentially — most realistically on the **portfolio optimization subproblem**, not on “profit.”
- **Is it valuable?** Only if it meaningfully improves speed/quality at realistic scale and constraints.

This direction sits **on top of** our existing user-facing features (matchups, value bets, portfolio risk, bankroll summary, rules, prediction tracking). The decision engine is the next major capability to design and build with a classical optimizer first, then a plug-in, then optional quantum/hybrid where it benchmarks well.

---

## 10. Next Implementations (backlog)

Prioritized list of follow-ups to deepen the decision engine and two-brain product:

| Priority | Item | Notes |
|----------|------|--------|
| **Done** | Build my slate UI | Dashboard section, sport select, result with positions + labels. |
| **Done** | Explainability | API returns `constraintsUsed` and `excludedWithLabels`; UI shows "Based on $X risk capital" and collapsible "Why we skipped these." |
| **Done** | Bankroll hint | Link to Settings for risk capital; show constraints used in result card. |
| **Done** | Kalshi/Polymarket candidates | Adapters in `candidates-adapter.ts`; decision-engine API accepts `includeKalshi`, `includePolymarket` and merges candidates; UI toggles on Build my slate. |
| **Done** | Constraints in Settings | `UserBankrollSettings` has optional maxPositions, maxFractionPerPosition, maxFactorFraction; Settings UI and PATCH /api/bankroll; decision-engine uses them as defaults. |
| **Done** | Benchmark script | `scripts/decision-engine-benchmark.ts`: fixed candidates + constraints, runs greedy N times, logs mean/std solveTimeMs and objectiveValue; writes `scripts/decision-engine-benchmark-result.json`. Run: `npx tsx scripts/decision-engine-benchmark.ts [runs=10]`. |
| **Done** | Export slate | Build my slate result: "Copy to clipboard" (tab-separated label, stake, reason) and "Download CSV" (label, candidateId, stakeUsd, reason). |
| **Done** | Min positions | Greedy optimizer enforces `minPositions` when provided: if first pass yields fewer than min, a second pass adds positions with 0.5× Kelly and relaxed factor cap until min is reached. Pass via `constraints.minPositions` in API. |
| **Done** | Execution/monitoring (foundation) | (1) Polymarket prices added to rules/run so price_above/price_below rules work for Polymarket positions. (2) GET /api/abe/price-moves: returns positions with significant cost vs current price movement (query ?threshold=0.1 for 10%); feeds "alerts when odds move." |

