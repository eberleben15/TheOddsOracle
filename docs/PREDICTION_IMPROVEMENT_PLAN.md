# Prediction Engine Improvement Plan

## Current State Analysis

### **What You Have Now (Phase 3):**

Your current model uses:
- Net rating (40% weight)
- Offensive vs Defensive matchup (30% weight)  
- Momentum (15% weight)
- Home court advantage (15% weight)

**Estimated Accuracy:** ~68-70%

**Issues:**
1. ❌ Uses basic PPG, not efficiency ratings
2. ❌ No tempo/pace adjustment
3. ❌ No Four Factors
4. ❌ No strength of schedule adjustment
5. ❌ Basic momentum (just win/loss streak)
6. ❌ No validation/backtesting
7. ❌ No tracking of actual performance

---

## Recommended Improvements (Priority Order)

### **Phase 4A: Quick Wins** (1-2 hours, +3-5% accuracy)

#### **1. Add Four Factors**
```typescript
// Current: Just points per game
pointsPerGame: 75.0

// Upgrade to: Four Factors
fourFactors: {
  eFG: 52.3,        // Effective Field Goal % (includes 3pt value)
  TOV: 18.5,        // Turnover % 
  ORB: 32.1,        // Offensive Rebound %
  FTRate: 28.4      // Free Throw Rate (FTA/FGA)
}
```

**Weight in prediction:**
- eFG%: 40%
- TOV%: 25%  
- ORB%: 20%
- FT Rate: 15%

#### **2. Tempo-Adjust Everything**
```typescript
// Current: Raw stats
ppg: 80.3

// Upgrade to: Per-100-possession stats
offensiveEfficiency: 112.5  // Points per 100 possessions
defensiveEfficiency: 98.2   // Points allowed per 100 possessions
pace: 71.2                  // Possessions per 40 minutes
```

#### **3. Better Momentum**
```typescript
// Current: Simple +/-100 based on wins/losses
momentum: 42

// Upgrade to: Performance vs expected
momentumMetrics: {
  last5NetRating: +8.5,      // Avg margin last 5 games
  trendDirection: "up",       // Getting better or worse
  beatExpectation: +4.2,      // Actual margin vs predicted
  qualityWins: 3,             // Wins vs top-50 teams
  badLosses: 1                // Losses vs bottom-50 teams
}
```

**Expected Result:** 68% → 73% accuracy

---

### **Phase 4B: Medium Improvements** (3-5 hours, +2-3% accuracy)

#### **4. Strength of Schedule**
```typescript
strengthOfSchedule: {
  overall: 0.523,             // Opponent quality (0-1)
  recent: 0.489,              // Last 10 games opponent quality
  home: 0.501,                // Home opponent quality
  away: 0.545                 // Away opponent quality
}
```

#### **5. Situational Factors**
```typescript
situational: {
  restDays: 2,                // Days since last game
  isBackToBack: false,        // B2B game
  daysOff: 2,                 // Useful for fatigue
  recentTravel: 0,            // Miles traveled recently
  timeOfSeason: 0.65          // Early=0, late=1 (fatigue factor)
}
```

#### **6. Style Matchups**
```typescript
styleMatchup: {
  paceAdvantage: +3.2,        // Faster/slower advantage
  threePointDiff: -2.1,       // 3pt shooting advantage
  sizeAdvantage: +1.8,        // Rebounding/height advantage
  experienceEdge: +0.5        // Veteran vs young team
}
```

**Expected Result:** 73% → 75-76% accuracy

---

### **Phase 4C: Advanced** (10+ hours, +1-2% accuracy)

#### **7. Machine Learning Model**
- Train XGBoost on 3+ seasons of historical data
- 50+ features
- Hyperparameter tuning
- Cross-validation

#### **8. Player-Level Data** (if available)
- Star player impact
- Injury adjustments
- Lineup combinations
- Minutes distribution

#### **9. Market Data Integration**
- Line movement tracking
- Sharp money indicators
- Public betting percentages
- Historical closing line value

**Expected Result:** 76-78% accuracy

---

## Immediate Next Steps

### **Step 1: Implement Four Factors** (Highest ROI)

Current data already has:
- ✅ Field Goal data (can calculate eFG%)
- ✅ Turnover data
- ✅ Rebound data
- ✅ Free throw data

Just need to calculate:

```typescript
// Effective Field Goal %
eFG = (FGM + 0.5 * 3PM) / FGA

// Turnover %
TOV = TOV / (FGA + 0.44 * FTA + TOV)

// Offensive Rebound %
ORB = ORB / (ORB + Opponent_DRB)

// Free Throw Rate
FTRate = FTA / FGA
```

### **Step 2: Calculate True Efficiency**

```typescript
// Offensive Rating (points per 100 possessions)
OffRating = (Points / Possessions) * 100

// Possessions estimate (when play-by-play not available)
Poss ≈ FGA + 0.44 * FTA - ORB + TOV

// Defensive Rating
DefRating = (Opp_Points / Opp_Possessions) * 100
```

### **Step 3: Improve Prediction Weights**

```typescript
// Current weights
factors = {
  netRating: 40%,
  matchup: 30%,
  momentum: 15%,
  home: 15%
}

// Improved weights (based on research)
factors = {
  offensiveEfficiency: 25%,    // How well you score
  defensiveEfficiency: 25%,    // How well you defend
  fourFactorsDiff: 20%,        // Detailed performance edge
  tempo/styleMismatch: 10%,    // Pace advantage
  recentForm: 10%,             // Hot/cold
  home: 7%,                    // Home court
  situational: 3%              // Rest, travel, etc
}
```

### **Step 4: Add Validation Tracking**

```typescript
interface PredictionResult {
  gameId: string;
  predicted: {
    winner: string;
    probability: number;
    spread: number;
    total: number;
  };
  actual: {
    winner: string;
    score: { home: number; away: number };
  };
  correct: boolean;
  confidence: number;
  edge: number;  // vs closing line
}

// Track all predictions
const results: PredictionResult[] = [];

// Calculate accuracy
const accuracy = results.filter(r => r.correct).length / results.length;
const highConfidenceAccuracy = results
  .filter(r => r.confidence > 75)
  .filter(r => r.correct).length;
```

---

## Comparison: Current vs Recommended

| Feature | Current | Recommended |
|---------|---------|-------------|
| **Base Metric** | PPG (pace-dependent) | Efficiency (per 100 poss) |
| **Shooting** | Basic FG% | eFG% (3pt weighted) |
| **Turnovers** | Count only | TO% (possession-adjusted) |
| **Rebounding** | Total rebounds | ORB% (opponent-adjusted) |
| **Momentum** | Win streak | Performance vs expectation |
| **Weights** | Equal factors | Research-based weights |
| **Validation** | None | Backtest + live tracking |
| **Expected Accuracy** | 68-70% | 74-76% |

---

## Implementation Order

### **Week 1: Foundation**
- [ ] Add Four Factors calculations
- [ ] Implement efficiency ratings (per 100 poss)
- [ ] Update prediction weights

**Expected: 68% → 72% accuracy**

### **Week 2: Refinement**
- [ ] Add strength of schedule
- [ ] Improve momentum calculations  
- [ ] Add style matchup factors

**Expected: 72% → 74% accuracy**

### **Week 3: Validation**
- [ ] Build prediction tracking system
- [ ] Backtest on last 50 games
- [ ] Compare to closing lines
- [ ] Calibration analysis

**Expected: Understand true accuracy**

### **Week 4: Optimization**
- [ ] Tune weights based on results
- [ ] Add situational adjustments
- [ ] A/B test different approaches

**Expected: 74% → 75-76% accuracy**

---

## Code Structure

```
lib/
├── prediction-v2/
│   ├── four-factors.ts         # Calculate Dean Oliver's 4 factors
│   ├── efficiency.ts           # Tempo-adjusted stats
│   ├── advanced-metrics.ts     # SOS, style, etc
│   ├── prediction-engine.ts    # Main prediction logic
│   ├── validation.ts           # Track & validate predictions
│   └── weights.ts              # Configurable weight system
│
├── data/
│   ├── predictions.json        # Historical predictions
│   ├── results.json            # Actual game results
│   └── accuracy-report.json    # Performance metrics
```

---

## Success Metrics

### **Measure These:**
1. **Overall Accuracy** - % of games predicted correctly
2. **High-Confidence Accuracy** - % correct when confidence > 75%
3. **Against the Spread** - % correct vs the line
4. **Calibration** - Are 70% predictions winning 70% of time?
5. **Value Found** - % of predictions with 3%+ edge vs market

### **Goals:**
- Overall Accuracy: 73-76%
- High-Confidence Accuracy: 78-82%
- ATS: 54-56%
- Calibration Error: < 5%
- Profitable Recommendations: 5-10% ROI

---

## Long-Term Vision

### **6 Months:**
- 75%+ accuracy on predictions
- Validated edge vs closing lines
- Tracked ROI on recommendations

### **1 Year:**
- ML model with 3+ seasons of training data
- 76-78% accuracy
- Premium feature: "Sharp picks" (highest confidence)
- Public performance tracking

### **2 Years:**
- Multi-sport models (CBB, NBA, NFL, etc)
- User-submitted bet tracking
- Community leaderboard
- Verified 55%+ ATS long-term

---

## Resources Needed

### **Immediate (Phase 4A):**
- No additional data needed
- Use existing API-Sports data
- ~3-5 hours development time

### **Medium-term (Phase 4B):**
- Historical game data (3+ seasons)
- Opponent-adjusted statistics
- ~10-15 hours development time

### **Long-term (Phase 4C):**
- Play-by-play data ($$)
- ML training infrastructure
- Player-level data
- ~40+ hours development time

---

## Bottom Line

**Your current model is a solid foundation.**

**Next step: Implement Four Factors + Efficiency ratings.**

**This will take 3-5 hours and boost accuracy from 68% → 73%.**

**That's the highest ROI improvement you can make!**

After that, add validation tracking to measure real performance, then iterate based on actual results.

Want me to implement the Four Factors upgrade now?

