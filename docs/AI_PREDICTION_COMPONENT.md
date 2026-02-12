# AI-Powered Prediction Component

## What it is

The **AI-Powered Prediction** block is the main prediction card on the matchup page. It shows:

1. **Win probabilities** – Chance each team wins (e.g. Away 38.5%, Home 61.5%), with progress bars.
2. **Predicted final score** – Whole-number score (e.g. 87–88) and **predicted spread** (e.g. “Texas Tech -1”).
3. **Key factors** – Short bullets explaining what drove the prediction (pace, eFG%, TOV%, etc.).
4. **Confidence** – A single “X% Confidence” badge for the overall prediction.

All of this comes from one shared prediction object produced by `predictMatchup()` in `lib/advanced-analytics.ts`.

---

## Where it lives in the UI

- **Component:** `components/AdvancedAnalytics.tsx`
- **Section:** Card titled “AI-Powered Prediction” with trophy icon and confidence chip.
- **Data flow:**  
  `awayTeamStats` / `homeTeamStats` + `game` (for sport) → `calculateTeamAnalytics()` → `predictMatchup()` → `prediction` (win prob, scores, spread, key factors, confidence).  
  That `prediction` is also passed into value-bet logic and favorable-bet analysis.

So the same “AI prediction” is used for the card, for tracking (feedback loop), and for bet recommendations.

---

## How the prediction is produced (unified model)

We use a **single, unified pipeline** so win probability and predicted score always agree on who wins.

### 1. Win probability (“who wins”)

- **With Four Factors (CBB/SportsData):**  
  Four Factors (eFG%, TOV%, ORB%, FTR) + tempo adjustment + home advantage + momentum → a single “totalScore” → logistic → `homeWinProb` / `awayWinProb`.
- **Without Four Factors (e.g. ESPN-only):**  
  Net rating + matchup (off vs def) + momentum + home → same kind of `totalScore` → same logistic → win probabilities.

So “who the model favors” is determined here.

### 2. Expected total (“how many points”)

- **Tempo-free model:**  
  For each team: (offensive efficiency / 100) × expected pace, with opponent defensive adjustment and sport-specific bounds (CBB vs NBA vs NHL).  
  This gives `homePredicted` and `awayPredicted` and thus an **expected game total** (sum of the two).  
  Sport-specific league constants keep totals in line with sportsbook/ESPN (e.g. CBB ~70 pace, NBA ~99).

### 3. Margin from win probability (unification)

- We keep the **total** from step 2.
- We turn **win probability** into an **implied point spread**:  
  `impliedSpread = k * log(homeWinProb / (1 - homeWinProb))` (clamped).  
  So higher home win prob → positive spread (home favored).
- New scores:  
  `homePredicted = (rawTotal + impliedSpread) / 2`,  
  `awayPredicted = (rawTotal - impliedSpread) / 2`,  
  then clamped to sport-specific min/max.

So:

- **Total** = from tempo-free (efficiency × pace).
- **Margin** = from win probability (Four Factors / net rating / momentum / home).

Win prob and predicted score always have the same winner; no more “61% home but away wins by 1” inconsistency.

### 4. Rounding and tie-breaking

- Scores are rounded to integers. If they’re equal, the team with higher win probability gets +1 so we never show a tie and the “winner” in the score matches the “winner” in win prob.

---

## Summary

| Output              | Source                                                                 |
|---------------------|------------------------------------------------------------------------|
| Win probability     | Four Factors (or net rating) + home + momentum → logistic              |
| Expected total      | Tempo-free (efficiency × pace), sport-specific constants              |
| Point spread/margin | Implied from win probability (so score winner = win-prob winner)     |
| Key factors         | Same inputs (eFG%, pace, net rating, momentum, etc.)                   |
| Confidence          | Data quality + consistency + distance from 50% win prob                |

The **AI-Powered Prediction** component is a read-only view of this single prediction object; it does not compute anything itself. Unifying total (tempo-free) and margin (win-prob–implied) in `predictMatchup()` is what makes the displayed win probabilities and predicted final score logically consistent.
