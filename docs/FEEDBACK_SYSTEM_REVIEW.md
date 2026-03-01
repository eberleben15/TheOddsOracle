# ATS Feedback System Review & Gap Analysis

**Date:** February 25, 2026  
**Purpose:** Comprehensive review of the ATS feedback loop to identify gaps and propose improvements  
**Reviewer:** AI System Architect

---

## Executive Summary

The ATS feedback system is **functionally complete** for its core purpose: diagnosing model performance, identifying underperforming segments, and automatically adjusting recommendations. However, there are **significant opportunities** to deepen the loop, increase automation, and better integrate with the two-brain architecture strategy.

**Overall Grade:** B+ (Strong foundation, room for maturity)

**Key Strengths:**
- ✅ Complete end-to-end pipeline (data → analysis → config → application)
- ✅ Rich feature attribution (50+ features tracked)
- ✅ Automated recommendations with severity levels
- ✅ Real-time config application in production
- ✅ Admin UI for visibility and control

**Critical Gaps:**
- ⚠️ No temporal tracking of feedback trends
- ⚠️ Missing A/B testing framework
- ⚠️ Limited integration with Brain B (decision engine)
- ⚠️ No alert system for performance degradation
- ⚠️ Feature weights unused (defined but not applied)

---

## 1. System Architecture Review

### 1.1 Data Collection ✅ COMPLETE
**Status:** Strong  
**Components:**
- `prediction-tracker.ts`: Stores `TeamAnalytics` at prediction time
- `prediction-generator.ts`: Captures 50+ upstream features
- `prisma/schema.prisma`: `teamAnalytics` JSON column persists analytics

**Gaps:**
- No tracking of *which config version* was active when prediction was made
- Missing metadata about market conditions (closing line value, steam moves)

**Recommendations:**
1. Add `configVersion` to `Prediction` model
2. Track `closingLineMovement` and `marketVolatility` indicators
3. Store recommendation tier (high/medium/low) at prediction time

---

### 1.2 Feature Engineering ✅ STRONG
**Status:** Excellent  
**Components:**
- 50+ features from `TeamAnalytics`
- Derived features (spreads, differentials, game context)
- Correlation analysis with ATS outcomes

**Gaps:**
- No engineered *interaction features* (e.g., `homeAdvantage × sosDiff`)
- Missing time-based features (day of week, rest days, back-to-back)
- No opponent-specific features (historical matchup performance)

**Recommendations:**
1. **Add interaction terms:** `momentumDiff × homeAdvantage`, `netRatingDiff × recentForm`
2. **Temporal features:** `daysRest`, `isBackToBack`, `dayOfWeek`
3. **Matchup history:** Track team A vs team B last 3 games, ATS record

---

### 1.3 Analysis Layer ✅ COMPLETE
**Status:** Strong  
**Components:**
- `ats-feedback.ts`: Correlation analysis, segmentation, bias analysis
- Feature importance ranking
- Automatic recommendation generation

**Gaps:**
- **Simple correlation only** — no regression analysis or feature selection
- **No confidence intervals** on win rates (small sample problem)
- **Segmentations are fixed** — no dynamic segment discovery
- **No causal inference** (only correlations)

**Recommendations:**
1. **Regression-based feature importance:** Use L1/L2 regularized logistic regression to identify truly predictive features
2. **Bootstrap confidence intervals:** Show win rate ranges (e.g., 45-52% at 95% CI)
3. **Hierarchical clustering:** Auto-discover segments beyond pre-defined buckets
4. **Simpson's paradox detection:** Check if segments reverse when combined

---

### 1.4 Configuration System ✅ FUNCTIONAL
**Status:** Good (but underutilized)  
**Components:**
- `feedback-pipeline-config.ts`: Sport, spread, total, confidence multipliers
- Auto-generation from feedback
- Real-time application in `recommended-bets-aggregator.ts`

**Gaps:**
- **Feature weights defined but never used** (`featureWeights.overrides`)
- **No gradual rollout** — config changes are all-or-nothing
- **No rollback mechanism** if new config performs worse
- **Hard-coded thresholds** (35% disable, 45% downweight) — should be data-driven

**Recommendations:**
1. **Use feature weight overrides:** Apply in `predictMatchup()` or as post-prediction adjustment
2. **Gradual rollout:** Apply new config to 20% of recommendations first
3. **Auto-rollback:** Monitor next 50 bets; revert if ATS drops >5%
4. **Dynamic thresholds:** Calibrate disable/downweight thresholds based on overall win rate

---

### 1.5 Feedback Loop Closure ⚠️ PARTIAL
**Status:** Needs work  
**Components:**
- Config auto-updates on each training run
- Applied in real-time to recommendations

**Gaps:**
- **No tracking of config effectiveness** — can't tell if v2 > v1
- **No before/after comparison** — config changes with no performance tracking
- **No human review** — automated config goes live immediately
- **No A/B testing** — can't validate improvements experimentally

**Recommendations:**
1. **Config history table:** Track version, timestamp, performance metrics for each config
2. **Shadow mode:** Run new config in parallel; compare results before switching
3. **Human review gate:** Flag high-severity changes for manual approval
4. **A/B testing framework:** Route 50% to old config, 50% to new; compare ATS after 100 bets

---

## 2. Integration with Two-Brain Architecture

### 2.1 Current State
**Brain A (Prediction/Edge):**
- ✅ Feedback loop fully integrated
- ✅ Config adjusts recommendation confidence
- ✅ Underperforming segments filtered

**Brain B (Decision Engine):**
- ❌ **No integration** with feedback system
- ❌ Decision engine uses raw candidate set (no config filtering)
- ❌ Portfolio construction ignores ATS feedback

### 2.2 Gap: Decision Engine Doesn't Use Feedback
**Problem:** The decision engine (`greedy-optimizer.ts`) receives candidates from `recommended-bets-aggregator.ts`, which *do* apply config. But:
- No visibility into *why* certain candidates were filtered
- No feedback on *decision engine performance* (did selected slate outperform alternatives?)
- No learning from portfolio-level outcomes

**Impact:** We optimize individual bet selection but not portfolio composition.

### 2.3 Recommendations for Brain B Integration
1. **Track decision engine outcomes:**
   - Store selected slate + alternatives
   - Record portfolio-level ATS, variance, max drawdown
   - Compare actual vs expected portfolio performance

2. **Decision-aware feedback:**
   - Segment by "position in slate" (1st pick vs 5th pick)
   - Analyze correlation estimate accuracy
   - Track "regret" (bets we didn't take that would have won)

3. **Portfolio-level config:**
   - Add `portfolioConfig` to tune diversification vs concentration
   - Learn optimal `maxFactorFraction` from historical portfolio performance

---

## 3. Missing Capabilities

### 3.1 Temporal Trend Analysis ⚠️ HIGH PRIORITY
**Gap:** No tracking of how feedback metrics evolve over time.

**Current:** Single-point-in-time report  
**Needed:** 
- Win rate trend over last 30/60/90 days
- Feature importance stability analysis
- Config version performance comparison

**Implementation:**
```typescript
interface FeedbackTrend {
  timestamp: string;
  configVersion: number;
  overall: { winRate: number; netUnits: number };
  bySport: Record<string, { winRate: number; sampleCount: number }>;
}
// Store in new table: FeedbackHistory
```

**Benefit:** Detect performance degradation early, validate config improvements

---

### 3.2 Alert System ⚠️ MEDIUM PRIORITY
**Gap:** No proactive alerts when performance degrades.

**Needed:**
- Email/Slack alert when overall ATS drops below 50%
- Warning when a segment crosses into critical territory (< 35%)
- Notification when config auto-updates

**Implementation:**
- Add alert thresholds to `FeedbackPipelineConfig`
- Check thresholds in `runATSFeedbackReport()`
- Send via existing notification infrastructure

---

### 3.3 Feature Selection / Engineering ⚠️ MEDIUM PRIORITY
**Gap:** No systematic feature selection; all 50+ features used equally.

**Current:** Correlation analysis, but all features stay in model  
**Needed:**
- Identify and remove *harmful* features (negative ATS correlation with high confidence)
- Detect redundant features (high multicollinearity)
- Suggest new engineered features

**Implementation:**
- L1 regularization to identify sparse feature set
- VIF (Variance Inflation Factor) analysis for multicollinearity
- Genetic algorithms to discover interaction terms

---

### 3.4 Opponent-Specific Adjustments ⚠️ LOW PRIORITY
**Gap:** No memory of historical matchup performance.

**Example:** Team A vs Team B last 3 meetings: Model predicted A by 5, actual results: B won twice by 10+.  
**Action:** Downweight model confidence for this specific matchup.

**Implementation:**
- Track matchup-specific prediction errors
- Add `matchupHistory` to `TrainingExample`
- Adjust confidence when historical error is high

---

### 3.5 Market Context Features ⚠️ LOW PRIORITY
**Gap:** No integration of market behavior signals.

**Missing:**
- Line movement direction/magnitude
- Betting volume indicators
- Public vs sharp money splits
- Injury report timing

**Benefit:** Detect when model is contrarian vs consensus; adjust accordingly.

---

## 4. Code Quality & Maintainability

### 4.1 Strengths
- ✅ Well-documented interfaces
- ✅ Clear separation of concerns
- ✅ Type-safe TypeScript throughout
- ✅ Comprehensive admin UI

### 4.2 Weaknesses
- ⚠️ Hard-coded thresholds scattered across files
- ⚠️ No unit tests for feedback analysis logic
- ⚠️ Config schema lacks validation
- ⚠️ Large functions (`runATSFeedbackReport` is 400+ lines)

### 4.3 Recommendations
1. **Extract thresholds to config:** Move magic numbers to `DEFAULT_PIPELINE_CONFIG`
2. **Add tests:** Jest tests for correlation, segmentation, config generation
3. **Schema validation:** Zod schema for `FeedbackPipelineConfig`
4. **Refactor large functions:** Break `runATSFeedbackReport` into smaller modules

---

## 5. Proposed Improvements (Prioritized)

### Tier 1: High Impact, Low Effort

| # | Improvement | Impact | Effort | Priority |
|---|-------------|--------|--------|----------|
| 1 | **Track config version on predictions** | Enables before/after analysis | Low | 🔥 Critical |
| 2 | **Add confidence intervals to win rates** | Better decision-making on small samples | Low | 🔥 Critical |
| 3 | **Alert system for performance drops** | Proactive issue detection | Low | High |
| 4 | **Persist feedback history** | Trend analysis, config validation | Medium | High |

### Tier 2: High Impact, Medium Effort

| # | Improvement | Impact | Effort | Priority |
|---|-------------|--------|--------|----------|
| 5 | **A/B testing framework** | Rigorous config validation | Medium | High |
| 6 | **Decision engine feedback integration** | Portfolio-level learning | Medium | High |
| 7 | **Regression-based feature importance** | Better feature selection | Medium | Medium |
| 8 | **Shadow mode for config changes** | Risk mitigation | Medium | Medium |

### Tier 3: Medium Impact, Higher Effort

| # | Improvement | Impact | Effort | Priority |
|---|-------------|--------|--------|----------|
| 9 | **Interaction feature engineering** | Deeper signal extraction | High | Medium |
| 10 | **Hierarchical segment discovery** | Find non-obvious patterns | High | Low |
| 11 | **Opponent-specific memory** | Matchup-aware adjustments | High | Low |
| 12 | **Market context features** | Contrarian signal detection | High | Low |

---

## 6. Detailed Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Enable proper tracking and validation

```typescript
// 1. Add to Prediction model
model Prediction {
  // ... existing fields
  configVersion    Int?      // Track which config was active
  recommendationTier String?  // "high" | "medium" | "low"
  closingLineValue Float?    // CLV = (closing spread - predicted spread)
}

// 2. Create FeedbackHistory table
model FeedbackHistory {
  id           String   @id @default(cuid())
  timestamp    DateTime @default(now())
  configVersion Int
  sport        String?
  overall      Json     // ATSFeedbackReport.overall
  bySport      Json     // segmentations.bySport
  topFeatures  Json     // top 10 feature importance
}

// 3. Update trackPrediction()
export async function trackPrediction(
  options: TrackPredictionOptions & { 
    configVersion?: number; 
    tier?: string;
  }
) {
  // Save configVersion, tier to DB
}
```

**Deliverable:** Config version tracking, feedback history persistence

---

### Phase 2: Validation Layer (Weeks 3-4)

**Goal:** A/B testing and shadow mode

```typescript
// 1. Config with validation tracking
interface FeedbackPipelineConfig {
  // ... existing
  validationMode?: "live" | "shadow" | "ab_test";
  abTestSplit?: number; // 0.5 = 50/50 split
  shadowStartedAt?: string;
}

// 2. In recommended-bets-aggregator.ts
export async function getRecommendedBets(
  sport: Sport,
  limit: number,
  options?: { configOverride?: FeedbackPipelineConfig }
) {
  const activeConfig = options?.configOverride || await getPipelineConfigForRecommendations();
  
  if (activeConfig.validationMode === "ab_test") {
    const userId = getUserId(); // from session
    const bucket = hashUserId(userId) % 100;
    const useNewConfig = bucket < (activeConfig.abTestSplit || 50) * 100;
    // Apply old or new config
  }
  
  if (activeConfig.validationMode === "shadow") {
    // Run both configs, return live results, log shadow results
  }
}

// 3. Comparison API
GET /api/admin/ats-feedback/compare?v1=5&v2=6
// Returns side-by-side comparison of two config versions
```

**Deliverable:** Safe config deployment with validation

---

### Phase 3: Advanced Analytics (Weeks 5-6)

**Goal:** Deeper insights via regression and clustering

```typescript
// 1. Feature selection via L1 regression
export function selectSignificantFeatures(
  examples: TrainingExample[]
): string[] {
  // Use logistic regression with L1 penalty
  // Return features with non-zero coefficients
}

// 2. Dynamic segmentation
export function discoverSegments(
  samples: ATSSample[],
  maxSegments: number = 10
): SegmentationResult[] {
  // K-means or decision tree to find natural clusters
  // Return segments with highest win rate variance
}

// 3. Causal inference (basic)
export function testSegmentCausality(
  segment: SegmentationResult,
  examples: TrainingExample[]
): { isSignificant: boolean; pValue: number } {
  // Permutation test: shuffle segment labels, recompute win rate
  // Return whether observed difference is statistically significant
}
```

**Deliverable:** Regression-based feature importance, auto-segment discovery

---

### Phase 4: Decision Engine Integration (Weeks 7-8)

**Goal:** Portfolio-level feedback loop

```typescript
// 1. Track decision engine outcomes
model DecisionEngineRun {
  id              String   @id @default(cuid())
  timestamp       DateTime @default(now())
  bankroll        Float
  sport           String
  configVersion   Int
  selectedCount   Int
  candidateCount  Int
  
  // Store selected slate
  selectedSlate   Json     // PortfolioPosition[]
  alternatives    Json?    // Top 5 rejected candidates
  
  // Outcomes (populated later)
  actualATS       Float?
  actualNetUnits  Float?
  maxDrawdown     Float?
}

// 2. Portfolio-level analysis
export function analyzeDecisionEnginePerformance(
  runs: DecisionEngineRun[]
): {
  avgPositionCount: number;
  portfolioWinRate: number;
  vsAlternatives: { betterThanAvg: number }; // regret analysis
} {
  // Compare selected slate vs alternatives
}

// 3. Decision-aware config
interface DecisionEngineConfig {
  preferDiversification: boolean;  // True = more positions, lower concentration
  regressionAversion: number;      // 0-1: how much to avoid previously bad decisions
}
```

**Deliverable:** Closed-loop learning for decision engine

---

## 7. Success Metrics

### Short-term (Phase 1-2, 4 weeks)
- ✅ Config version tracked on 100% of predictions
- ✅ Feedback history stored for 90+ days
- ✅ A/B test framework functional
- ✅ At least one config improvement validated via A/B test

### Medium-term (Phase 3-4, 8 weeks)
- ✅ Regression-based feature selection identifies <20 core features
- ✅ Shadow mode catches at least one bad config before it goes live
- ✅ Decision engine performance tracking on 100% of slates
- ✅ Portfolio-level win rate measurably improves vs naive selection

### Long-term (12+ weeks)
- ✅ Automated config updates improve ATS by 2+ percentage points
- ✅ Feature engineering discovers 3+ novel interaction terms
- ✅ Alert system prevents ATS from dropping below 48% for >7 days
- ✅ Decision engine + feedback loop achieves top-quartile risk-adjusted returns

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Over-optimization** (config overfits recent data) | High | High | A/B test all changes; maintain 30-day validation window |
| **False positives** (small sample, spurious correlations) | Medium | Medium | Confidence intervals; min sample = 30 |
| **Config thrashing** (frequent changes hurt stability) | Medium | Medium | Rate-limit auto-updates to 1/week max |
| **Alert fatigue** (too many notifications) | Low | Medium | Tier alerts; only email on critical thresholds |
| **Feature engineering backfires** (interaction terms add noise) | Medium | Low | Test new features in shadow mode first |

---

## 9. Conclusion

The ATS feedback system is **functionally complete and operational**. It successfully:
- Diagnoses model performance
- Identifies underperforming segments
- Auto-generates and applies configuration adjustments
- Provides admin visibility

However, it is **not yet mature** as a closed-loop learning system:
- No historical tracking (can't tell if configs improve)
- No validation framework (changes go live untested)
- Limited integration with Brain B (portfolio construction)
- Missing advanced analytics (regression, causality, clustering)

**Recommended Path Forward:**
1. **Immediate (2 weeks):** Add config version tracking + feedback history
2. **Near-term (4 weeks):** Build A/B testing framework
3. **Mid-term (8 weeks):** Integrate decision engine feedback
4. **Long-term (12+ weeks):** Advanced feature engineering and causal inference

**ROI Estimate:**
- Phase 1-2: +1-2% ATS improvement (high confidence)
- Phase 3-4: +2-3% ATS improvement (medium confidence)
- Total: ~5% ATS improvement = moving from 50% → 55% = very significant $$ impact

This system is **ready for production** but would benefit greatly from the validation and learning infrastructure proposed above.

---

**Next Steps:**
1. Review this document with team
2. Prioritize Tier 1 improvements (4 items, <2 weeks)
3. Plan Phase 1 implementation (config tracking + history)
4. Define success metrics and monitoring dashboard

---

**Document Version:** 1.0  
**Last Updated:** February 25, 2026  
**Next Review:** After Phase 1 completion
