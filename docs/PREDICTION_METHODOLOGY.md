# Prediction Engine Methodology

**Version:** 1.0  
**Last Updated:** 2025  
**Status:** Auditable reference for reproduction and validation

---

## 1. Overview

The Odds Oracle prediction engine produces win probabilities, score predictions, and spreads for basketball matchups. It uses a hybrid approach combining **Dean Oliver's Four Factors** (when available) with **schedule-adjusted efficiency ratings** and optional **Platt scaling** recalibration.

---

## 2. Data Sources

| Input | Source | Notes |
|-------|--------|------|
| Team stats | SportsData.io, ESPN | PPG, PAPG, eFG%, TOV%, ORB%, FTR, pace, efficiency |
| Recent games | API | Last 5–20 games for form, SOS, tier adjustment |
| League constants | `lib/advanced-analytics.ts` | CBB: 70 pace, 72 PPG; NBA: 99 pace, 112 PPG |

---

## 3. Model Architecture

### 3.1 Two Prediction Paths

1. **Four Factors path** (primary when eFG%, TOV%, ORB%, FTR available)
   - Raw stats from team season (not opponent-adjusted)
   - Disagreement check: blend with efficiency when Four Factors and net rating disagree

2. **Fallback path** (when Four Factors unavailable)
   - SOS-adjusted offensive/defensive efficiency
   - Net rating, matchup, momentum, home advantage

### 3.2 Four Factors Formula (Dean Oliver)

```
fourFactorsScore = efgScore + tovScore + orbScore + ftrScore

efgScore  = (home_eFG% - away_eFG%) × 0.40   # 40% weight
tovScore  = (away_TOV% - home_TOV%) × 0.125  # 25% (lower TOV is better)
orbScore  = (home_ORB% - away_ORB%) × 0.15   # 20%
ftrScore  = (home_FTR  - away_FTR)  × 0.09   # 15%
```

### 3.3 Efficiency Score (Schedule-Aware)

```
efficiencyScore = (home_netRating - away_netRating) × 0.04
                + matchup_term × 0.03

matchup_term = (home_Off - away_Def) - (away_Off - home_Def)
```

### 3.4 Blend Logic (Disagreement Handling)

When Four Factors favor home but efficiency favors away (or vice versa) with `|efficiencyScore| > 0.8`:

```
totalScore = efficiencyScore × 0.7 + fourFactorsTotal × 0.3
```

Otherwise: `totalScore = fourFactorsTotal`.

### 3.5 Home Court Advantage

- Base: 3.5 points (CBB), 2.5 (NBA)
- Scaled down when `fourFactorsScore < -3`:
  - `scale = max(0.4, 1 + fourFactorsScore/6)`
  - `homeAdvantage = base × scale`

### 3.6 Win Probability

```
homeWinProb = 1 / (1 + exp(-totalScore / 8))
homeWinProb = clamp(homeWinProb, 0.02, 0.98)
```

(Logistic with divisor 8; industry alternative: Pythagorean exponent 10.25 + Log5.)

### 3.7 Optional Recalibration (Platt Scaling)

When trained params are set:

```
p_cal = 1 / (1 + exp(-(A × logit(p) + B)))
```

Fitted to minimize log loss on historical (predictedProb, actualOutcome) pairs.

---

## 4. Score Prediction

- **Tempo-free:** `score = (OffensiveEfficiency / 100) × ExpectedPace`
- **Defensive adjustment:** percentile-based (elite/good/average/below/poor)
- **Margin:** `impliedSpread = 5 × log(p/(1-p))`, clamped to ±25
- **Unified:** margin drives score split; total from tempo-free

---

## 5. Validation Metrics (Industry Standard)

| Metric | Formula | Purpose |
|--------|---------|---------|
| **Brier Score** | `mean((p - y)²)` | Probability accuracy (0–1, lower better) |
| **Log Loss** | `-mean(y×log(p) + (1-y)×log(1-p))` | Penalizes overconfident errors |
| **ECE** | Weighted avg \|predicted_bin - actual_bin\| | Expected Calibration Error |
| **MAE** | Mean absolute error (spread, scores) | Point prediction accuracy |
| **Winner accuracy** | % correct winner | Betting-relevant |

---

## 6. Audit Trail (Prediction Trace)

Each prediction includes an optional `trace` with:

| Field | Description |
|-------|-------------|
| `modelPath` | `'fourFactors'` or `'fallback'` |
| `totalScore` | Input to logistic |
| `fourFactorsScore` | Raw Four Factors sum |
| `efficiencyScore` | Schedule-adjusted signal |
| `tempoAdjustment` | Pace/efficiency term |
| `homeAdvantage` | Applied home court |
| `momentumScore` | Recent form |
| `blended` | true if Four Factors + efficiency were blended |
| `homeWinProbRaw` | Before recalibration |
| `recalibrationApplied` | Whether Platt scaling was used |

---

## 7. Coefficients (Versioned)

Defined in `lib/prediction-calibration.ts`:

```ts
DEFAULT_COEFFICIENTS = {
  recentFormWeight: 0.6,
  seasonAvgWeight: 0.4,
  sosAdjustmentFactor: 0.3,
  tierAdjustedWeight: 0.7,
  weightedEffWeight: 0.3,
  baseDefensiveAdjustmentFactor: 0.12,
  percentileMultipliers: { elite: 1.5, good: 1.2, average: 1.0, belowAverage: 0.8, poor: 0.6 },
  homeAdvantage: 3.5,
}
```

---

## 8. File Reference

| File | Purpose |
|------|---------|
| `lib/advanced-analytics.ts` | `predictMatchup`, Four Factors, efficiency, trace |
| `lib/prediction-calibration.ts` | Coefficients, optimization |
| `lib/score-prediction-validator.ts` | Validation, Brier, log loss, ECE |
| `lib/recalibration.ts` | Platt scaling fit and apply |
| `lib/favorable-bet-engine.ts` | Edge calculation, market sanity checks |

---

## 9. Known Limitations

1. Four Factors use raw stats; schedule-adjusted only via blend with efficiency.
2. Logistic divisor (8) is heuristic; KenPom uses Pythagorean exponent 10.25.
3. No explicit Log5; win prob is from logistic, not Log5 on Pythagorean.
4. Recalibration params must be fitted separately (e.g. via backtest script).

---

## 10. Reproducibility Checklist

- [ ] Same `DEFAULT_COEFFICIENTS`
- [ ] Same data (team stats, recent games)
- [ ] Same `trace` for step-by-step verification
- [ ] Recalibration params (if any) recorded with version
