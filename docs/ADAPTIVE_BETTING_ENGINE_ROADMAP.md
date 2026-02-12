# Odds Oracle — Adaptive Betting Engine (ABE) Roadmap

**Positioning:** *We optimize your betting operation.* Not picks. Not predictions. Optimization + decision control.

**Strategic wedge:** Prediction markets first (cleaner structure, explicit probabilities, portfolio-natural, smaller but sharper audience). Core engine designed for both prediction markets and sportsbooks via adapters.

---

## 1. Vision & Non-Goals

| We are NOT | We ARE |
|------------|--------|
| Generic "AI picks" | Engineering-heavy, workflow-driven tooling |
| Public model-based predictions | Portfolio-level optimization + risk engine |
| Another odds comparison screen | Correlation-aware exposure & capital efficiency |
| Another bankroll tracker | Condition-based action engine (programmable automation) |
| Content / insights | **Tool** that tangibly increases user EV and has high switching cost |

**Moat:** Same math layer (portfolio optimization, risk, simulation, correlation); different data ingestion via **adapters** (sportsbook adapter, prediction market adapter).

---

## 2. The Adaptive Betting Engine (ABE) — High Level

ABE is a **personal betting operating system** that learns from behavior and optimizes strategy automatically.

It tells users:
- When they are **deviating from +EV strategy**
- When a bet is **mis-sized**
- When a market is **mispriced relative to their profile**
- When they’re **emotionally tilting**
- When they’re **underutilizing capital**
- **Portfolio-level impact** of a bet

→ Risk-adjusted betting autopilot advisor.

---

## 3. Core Components (Priority Order)

### 3.1 Build First: Portfolio-Level Risk & Exposure Engine

**Why first:** Rare in consumer apps; treats betting like portfolio theory. Fits prediction markets and sports.

**Scope:**
- **Correlation-aware portfolio:** Covariance across legs/contracts, effective exposure, true variance curve, overexposure warnings.
- **Prediction-market translation:** e.g. "Republican wins presidency" + "GOP Senate" + "Trump Iowa" + "Trump Florida" → single macro factor exposure and over-concentration risk.
- **Outputs:** Effective exposure by factor/event, variance curve, concentration risk score.

**Existing touchpoints:** Extend from single-bet `favorable-bet-engine` and odds logic; net-new portfolio/correlation layer.

---

### 3.2 Dynamic Bankroll Intelligence

**Not just tracking.** Deliver:
- Adaptive Kelly sizing (fractional, risk-profile adjusted).
- Drawdown simulation.
- Risk-of-ruin projection.
- Capital velocity metric.

**Example output:** *"If you continue at current variance and stake size, P(30% drawdown in next 45 days) = 42%."*

---

### 3.3 Condition-Based Action Engine

**Beyond "odds changed" alerts.** User-defined rules, e.g.:

*"If spread moves to +4 AND public money > 70% AND my model edge > 2% → notify me."*

**Positioning:** Zapier for bettors — programmable betting automation. High lock-in.

**Scope:** Rule DSL or UI, event triggers (odds/market/portfolio), actions (notify, log, suggest).

---

### 3.4 “What If” Simulator (Strategy-Level)

**Beyond single-bet "if I bet $100."** Strategy comparison over many trials:
- Monte Carlo over next N bets (e.g. 100 bets, 10k runs).
- Strategy comparison: e.g. Flat vs 0.5 Kelly vs 0.25 Kelly + CLV threshold.
- Outputs: Median outcome, 5th/95th percentile, max drawdown distribution.

**Existing touchpoints:** `lib/monte-carlo-simulation.ts` is game/score-level; extend to **strategy-level** simulation (sequence of bets, bankroll evolution).

---

### 3.5 Strategy DNA System

**User profile:** Risk tolerance, sport/market bias, CLV, edge accuracy, behavioral tendencies.

**Output:** "Your betting DNA" + comparison to long-term profitable bettors, sharp vs square patterns, historical success clusters.

**Purpose:** Sticky, identity-level product; behavioral correction and lock-in.

---

## 4. Prediction-Market-Specific Features

| Feature | Description |
|--------|--------------|
| **Factor decomposition** | Cluster contracts into factors (e.g. inflation, Republican strength, Fed policy). Show e.g. "72% of exposure is to ‘Republican overperformance’ factor." |
| **Arbitrage / mispricing detector** | Exploit cross-platform and conditional probability inconsistencies (e.g. P(A), P(A&B), P(B\|A) inconsistent). |
| **Capital efficiency engine** | $1/$0 settlement → clean EV, capital lockup duration, time-weighted / annualized expected yield. |
| **Macro scenario simulator** | Monte Carlo over **world states** (e.g. GOP wave vs split government); portfolio P&L per scenario. |

---

## 5. Architecture Principle: Core Engine + Adapters

```
┌─────────────────────────────────────────────────────────────┐
│  CORE ENGINE                                                 │
│  • Portfolio optimization  • Risk engine                    │
│  • Simulation engine       • Correlation engine             │
│  • (Same math layer)                                         │
└─────────────────────────────────────────────────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────┐            ┌──────────────────────┐
│  Prediction Market   │            │  Sportsbook           │
│  Adapter             │            │  Adapter              │
│  (Kalshi, Polymarket,│            │  (Odds feeds, books)   │
│   PredictIt, etc.)   │            │                       │
└──────────────────────┘            └──────────────────────┘
```

- **Data ingestion** and market-specific mapping live in adapters.
- **Math (EV, variance, correlation, Kelly, simulation)** lives in the core and is adapter-agnostic.

---

## 6. Phased Roadmap

### Phase 0: Foundation (current / in progress)
- [x] Prediction market data: Kalshi (and optionally Polymarket) integration.
- [x] Unified types and interfaces for “contracts” and “positions” that the core engine can consume.
- [x] Basic portfolio data model (positions, size, cost, market).

### Phase 1: Portfolio Risk & Exposure (first differentiator) — **Target: 60-day MVP slice**
- [x] Correlation model: covariance/correlation estimation across contracts (same event / same factor).
- [x] Effective exposure and concentration metrics (e.g. single-event and single-factor exposure).
- [x] Variance curve and overexposure warnings in UI.
- [x] Prediction-market first: factor clustering (e.g. political, macro) and factor exposure view.

**MVP slice (shippable in ~60 days):**  
*“Portfolio view for prediction markets: positions, correlation matrix, effective exposure and one macro factor (e.g. ‘Republican performance’), plus overexposure alerts.”*

### Phase 2: Bankroll & Risk Intelligence
- [x] Adaptive Kelly (fractional, user risk profile).
- [x] Drawdown simulation and risk-of-ruin.
- [x] Capital velocity and lockup-aware metrics.
- [x] One clear output: e.g. “P(30% drawdown in next 45 days).”

### Phase 3: Strategy Simulator
- [x] Strategy-level Monte Carlo (sequence of bets, multiple strategies).
- [x] Strategy comparison (flat vs fractional Kelly vs CLV filter).
- [x] Outputs: median, percentiles, max drawdown distribution.

### Phase 4: Condition-Based Action Engine
- [x] Rule model and DSL or UI (triggers + conditions + actions).
- [x] Event pipeline (odds/market/portfolio events).
- [x] Notifications and logging.

### Phase 5: Strategy DNA & Behavioral Layer
- [x] User risk/market/sport profile.
- [x] CLV and edge accuracy tracking.
- [x] "Betting DNA" and comparison to sharp / successful cohorts.

---

## 7. Success Criteria (How This Wins)

| Dimension | Target |
|----------|--------|
| **Hard to copy** | Portfolio optimization, correlation, simulation, and automation require real engineering and domain depth. |
| **Increases EV** | Sizing, exposure, and strategy comparison directly improve decisions and capital use. |
| **Lock-in** | DNA, rules, and workflow make switching costly. |
| **Positioning** | Move from “we give insights” to “we optimize your betting operation.” |

---

## 8. Optional Next Steps

- **Product:** Define MVP slice user flows and one key dashboard for Phase 1.
- **Math:** Specify correlation model (estimation, factor model) and exposure formulas.
- **System:** Design core engine API (inputs: positions + markets + user params; outputs: exposure, risk, suggestions).

---

*Document distilled from product/strategy conversation. Last updated: Feb 2025.*
