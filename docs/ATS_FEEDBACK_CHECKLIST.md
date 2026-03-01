# ATS Feedback Loop — Implementation Checklist

End-to-end feedback loop to identify features pushing or pulling ATS performance and improve model training.

## Phase 1: Diagnostic Layer

- [x] **1.1** Feature vs ATS correlation — `lib/ats-feedback.ts`
  - For each feature: ATS win rate when above vs below median
  - Correlation with cover outcome
- [x] **1.2** Segmentation analysis — `lib/ats-feedback.ts`
  - By sport, model path (fourFactors vs fallback), confidence band
  - By home/away favorite, spread magnitude, total bucket

## Phase 2: Feature Attribution

- [x] **2.1** Extend TrainingExample with upstream TeamAnalytics — `lib/prediction-features.ts`
  - 50+ features: net ratings, efficiency, momentum, SOS, shooting, rebounding, consistency
  - Derived features: netRatingDiff, momentumDiff, sosDiff, spreadMagnitude, spreadDiff
- [x] **2.2** Store TeamAnalytics at prediction time — `lib/prediction-generator.ts`
  - Schema: `teamAnalytics` JSON column in Prediction model
  - Auto-populated for all new predictions
- [x] **2.3** Feature importance — `lib/ats-feedback.ts`
  - Ranked by |correlation| with cover
  - Direction: positive / negative / neutral

## Phase 3: ATS-Aware Optimization

- [x] **3.1** Weighted bias analysis — `lib/ats-feedback.ts`
  - Segment-level weighted contribution to overall ATS
  - Net units calculation at -110 juice
- [x] **3.2** Automatic recommendations — `lib/ats-feedback.ts`
  - Disable/downweight/recalibrate suggestions based on segment performance
  - Severity ranking (high/medium/low)
- [x] **3.3** Confidence calibration check
  - Flags inverted confidence (high < medium)

## Phase 4: Configurable Pipeline

- [x] **4.1** Pipeline config — `lib/feedback-pipeline-config.ts`
  - Sport-specific confidence multipliers
  - Spread magnitude and total bucket adjustments
  - Confidence band adjustments
  - Feature weight overrides
- [x] **4.2** Config generation — `generateConfigFromFeedback()`
  - Auto-generates config based on ATS feedback
  - Disables underperforming segments, downweights marginal ones
- [x] **4.3** Config application — `applyConfigToConfidence()`
  - Apply config to adjust prediction confidence
  - Returns null to skip predictions in disabled segments

## Phase 5: Diagnostic Script

- [x] **5.1** Full report — `scripts/ats-feedback-report.ts`
  - Comprehensive output with recommendations, net units, feature coverage
  - `--export report.json` — Export raw report
  - `--generate-config config.json` — Generate pipeline config
  - `--verbose` — Show feature coverage

## Usage

```bash
# Run ATS feedback report
npm run ats-feedback

# Filter by sport, export for analysis
npm run ats-feedback -- --sport basketball_ncaab --export ats-report.json

# Generate config from feedback
npm run ats-feedback:config

# Full verbose report with config
npm run ats-feedback -- --export report.json --generate-config config.json --verbose
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PREDICTION TIME                                          │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  OddsGame → getTeamSeasonStats() → calculateTeamAnalytics() → predictMatchup()            │
│                                         │                            │                    │
│                                         ▼                            ▼                    │
│                               StoredTeamAnalytics             PredictionTrace             │
│                                         │                            │                    │
│                                         └──────────┬─────────────────┘                    │
│                                                    ▼                                      │
│                                         trackPrediction() → DB (teamAnalytics, trace)     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                  VALIDATION TIME                                          │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  recordOutcome() → actualScore, closingSpread, closingTotal                               │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                  ANALYSIS TIME                                            │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│  buildTrainingDataset() → extractFeatures() → TrainingExample (50+ features)              │
│                                                    │                                      │
│                                                    ▼                                      │
│                                         runATSFeedbackReport()                            │
│                                                    │                                      │
│                         ┌──────────────────────────┼──────────────────────────┐           │
│                         ▼                          ▼                          ▼           │
│               featureCorrelations        segmentations              recommendations       │
│               featureImportance          biasAnalysis                                     │
│                         │                          │                          │           │
│                         └──────────────────────────┼──────────────────────────┘           │
│                                                    ▼                                      │
│                                     generateConfigFromFeedback()                          │
│                                                    │                                      │
│                                                    ▼                                      │
│                                       FeedbackPipelineConfig                              │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## Phase 6: Admin Integration

- [x] **6.1** Admin API endpoint — `app/api/admin/ats-feedback/route.ts`
  - GET: Returns full ATS feedback report, current config, suggested config
  - POST: Generate config, apply config, reset to default
- [x] **6.2** Admin UI page — `app/(app)/admin/ats-feedback/page.tsx`
  - Comprehensive dashboard with win rate, net units, recommendations
  - Segmentation cards by sport, spread magnitude, total bucket, confidence
  - Feature importance visualization
  - One-click config generation and application
- [x] **6.3** Apply config at recommendation time — `lib/recommended-bets-aggregator.ts`
  - `applyConfigToConfidence()` filters/adjusts bets based on ATS feedback
  - Skips bets in disabled segments (returns null)
  - Applies multipliers to downweight underperforming segments
- [x] **6.4** Auto-update config on training — `lib/prediction-feedback-batch.ts`
  - Batch sync auto-generates and saves pipeline config
  - Logs ATS record, net units, and config version on each run
- [x] **6.5** Config persistence — `lib/feedback-pipeline-config.ts`
  - `loadPipelineConfig()` / `savePipelineConfig()` — DB persistence
  - `getPipelineConfigForRecommendations()` — Cached access for runtime use

## Next Steps (Future)

1. **Weekly cron** — Run ats-feedback and persist report for trend tracking
2. **Human review gate** — Require ATS feedback review before deploying coefficient changes
3. **A/B testing** — Compare default vs config-adjusted recommendations
4. **Alert on performance drops** — Notify when ATS win rate falls below threshold
