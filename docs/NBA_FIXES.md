# NBA Prediction Fixes

Documents fixes applied after the NBA audit (90-day review).

## Audit Findings (90 days)

- **Validated games:** 82
- **Closing line coverage:** 69.5% (below 70%)
- **Blended ATS:** 50.6%
- **True ATS (market only):** 39.3%
- **Biases:** Home -11.35, Away -14.21, Total -25.56 pts (under-predicting)
- **Polluted predictions:** 15

## Implemented Fixes

### 1. Per-Sport Bias Correction

Bias correction is now stored and applied per sport. NBA has its own bias; CBB and others use global or their own sport-specific values.

- **Storage:** `bias_correction_basketball_nba` in ModelConfig
- **Apply:** New NBA predictions use bias at generation time; recommendations use per-sport bias
- **Values:** homeTeamBias: -11.35, awayTeamBias: -14.21, scoreBias: -25.56

To apply:
```bash
npm run apply-nba-bias
```

To edit in Admin: Model Performance → select NBA → Edit Config → set bias values.

### 2. Prediction Generator

The prediction generator now applies sport-specific bias correction before storing predictions. New NBA games will have corrected scores/spread/total.

### 3. Recommendations API

Bet recommendations load per-sport bias. When sport filter is NBA, NBA bias is used; when mixed, each prediction uses its sport's bias.

### 4. Polluted Predictions

15 NBA predictions were made after the game started. To correct (fetch historical odds and update CLV):

```bash
npx tsx scripts/correct-polluted-predictions.ts --sport basketball_nba --dry-run  # preview
npx tsx scripts/correct-polluted-predictions.ts --sport basketball_nba            # apply
```

### 5. Odds Capture (Operational)

Closing line coverage is 69.5%. To improve True ATS reliability, run the capture-odds cron every 15–30 minutes during NBA game hours.

## Audit Commands

```bash
npm run audit-nba
# or
npx tsx scripts/audit-predictions.ts --sport basketball_nba
```
