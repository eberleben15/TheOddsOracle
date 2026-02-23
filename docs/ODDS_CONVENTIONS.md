# Odds Conventions

Documents spread sign conventions used across the prediction system for correct CLV calculation.

## Spread Sign Convention

### Odds API (The Odds API)

- **Negative spread = favorite** (American betting convention)
- Example: Home team -5.5 means home is favored by 5.5 points
- Stored in `OddsHistory.spread` as returned by the API

### Our Prediction Model (`advanced-analytics.ts`)

- **Positive `predictedSpread` = home favored**
- Example: `predictedSpread = 5` means home favored by 5 points
- Stored in `Prediction.predictedSpread`

### CLV Calculation (`prediction-tracker.ts`)

When computing `clvSpread`, we normalize our predicted spread to Odds API format:

```ts
const predictedInOddsFormat = -prediction.predictedSpread;
clvSpread = predictedInOddsFormat - closingSpread;
```

- **Positive CLV** = we got a better line than the closing line (e.g. home -5 vs close -7)
- **Negative CLV** = the line moved against us after our prediction

### Verification

Run `npx tsx scripts/verify-odds-spread-convention.ts` to confirm the Odds API convention on live data.
