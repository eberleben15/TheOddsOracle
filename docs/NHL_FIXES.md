# NHL Prediction Fixes

Documents fixes applied after the NHL audit (90-day review).

## Audit Findings (90 days)

- **Validated games:** 61
- **Closing line coverage:** 82.0% (adequate)
- **Blended ATS:** 36.7% (22-38-1)
- **True ATS (market line only):** 38.0% (19-31-0)
- **SU winner accuracy:** 54.1%
- **Spread MAE:** 2.08 goals
- **Within 3 pts (spread):** 75.4%
- **Biases:** Home +0.56, Away +0.74, Total +1.30 goals (slight over-prediction)
- **Polluted predictions:** 7

## Implemented Fixes

### 1. Per-Sport Bias Correction (NHL)

NHL bias is stored under `bias_correction_icehockey_nhl`. Small correction for over-prediction.

- **Values:** homeTeamBias: 0.56, awayTeamBias: 0.74, scoreBias: 1.3 (goals)

To apply:
```bash
npm run apply-nhl-bias
```

To edit in Admin: Model Performance → select NHL → Edit Config → set bias values.

### 2. Polluted Predictions

7 NHL predictions were made after the game started. To correct (fetch historical odds and update CLV):

```bash
npx tsx scripts/correct-polluted-predictions.ts --sport icehockey_nhl --dry-run  # preview
npx tsx scripts/correct-polluted-predictions.ts --sport icehockey_nhl            # apply
```

### 3. ATS Performance Note

True ATS is 38.0% — below break-even. Bias correction addresses score/spread calibration; improving ATS may require model or feature changes beyond bias. Continue monitoring with the audit script.

## Audit Commands

```bash
npm run audit-nhl
# or
npx tsx scripts/audit-predictions.ts --sport icehockey_nhl
```
