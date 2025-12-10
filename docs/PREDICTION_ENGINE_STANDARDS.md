# Industry-Standard Sports Betting Prediction Models

## Overview

Professional sports betting models combine statistical analysis, machine learning, and domain expertise. Here's what the industry uses:

---

## 1. **Key Prediction Approaches**

### **A. Elo Rating System** (538, Chess.com)
- **How it works:** Each team has a rating that adjusts after each game
- **Pros:** Simple, proven, handles strength of schedule
- **Cons:** Slow to adapt to major changes
- **Accuracy:** ~68-72% for NCAA Basketball

```python
# Basic Elo formula
Expected_Score = 1 / (1 + 10^((Rating_B - Rating_A) / 400))
New_Rating = Old_Rating + K * (Actual_Score - Expected_Score)
```

### **B. Four Factors Model** (Dean Oliver, KenPom)
Basketball games are determined by 4 factors:

1. **Shooting (eFG%)** - 40% of winning
2. **Turnovers (TOV%)** - 25% of winning
3. **Rebounding (ORB%)** - 20% of winning
4. **Free Throws (FT Rate)** - 15% of winning

**KenPom uses:**
- Adjusted Offensive Efficiency (points per 100 possessions vs average D)
- Adjusted Defensive Efficiency (points allowed per 100 possessions vs average O)
- Tempo (possessions per game)
- Luck (close game record vs expected)

**Accuracy:** ~72-75% for NCAA

### **C. Regression Models** (Haslametrics, Massey Ratings)
Multiple linear regression using dozens of factors:

```
Win_Probability = β₀ + β₁(Off_Rating) + β₂(Def_Rating) + β₃(Momentum) + 
                  β₄(Home) + β₅(Rest_Days) + ... + ε
```

**Key Variables:**
- Offensive/Defensive efficiency
- Pace-adjusted stats
- Strength of schedule
- Recent performance (last 10 games)
- Home court advantage (typically 3-4 points)
- Days of rest
- Altitude (for some venues)

**Accuracy:** ~73-76% when properly tuned

### **D. Machine Learning Models** (Top Bettors, Syndicates)

**Random Forest:**
- Ensemble of decision trees
- Handles non-linear relationships
- Less prone to overfitting
- Accuracy: ~74-77%

**Gradient Boosting (XGBoost/LightGBM):**
- Industry standard for tabular data
- Handles missing data well
- Feature importance ranking
- Accuracy: ~75-78%

**Neural Networks:**
- Deep learning for complex patterns
- Requires large datasets
- Can incorporate player-level data
- Accuracy: ~76-79% (but prone to overfitting)

---

## 2. **Critical Features (Ranked by Importance)**

### **Tier 1 - Most Important (70% of prediction power)**
1. **Team Quality Metrics**
   - Adjusted Offensive Efficiency
   - Adjusted Defensive Efficiency
   - Net Rating (Offensive - Defensive)

2. **Pace & Style**
   - Possessions per game
   - Tempo adjustment

3. **Home Court Advantage**
   - Typically 3-4 points for college basketball
   - Venue-specific adjustments (altitude, court size)

### **Tier 2 - Moderately Important (20% of prediction power)**
4. **Recent Form**
   - Last 5-10 games performance
   - Momentum indicators
   - Winning/losing streaks

5. **Strength of Schedule**
   - Quality of opponents faced
   - Adjusted for home/away

6. **Matchup-Specific**
   - Head-to-head history
   - Style matchups (fast vs slow, 3pt vs inside)

### **Tier 3 - Helpful but Not Critical (10%)**
7. **Situational Factors**
   - Rest days
   - Back-to-back games
   - Travel distance
   - Time of season
   - Conference vs non-conference

8. **Public Betting Data** (if available)
   - Line movement
   - % of bets vs % of money
   - Sharp vs public action

---

## 3. **Validation & Accuracy Metrics**

### **How to Measure Your Model:**

1. **Win Probability Calibration**
   - If model says 70% win probability, team should win ~70% of the time
   - Test: Calibration plot (predicted vs actual)

2. **Against the Spread (ATS)**
   - NBA/NCAA sharp bettors aim for 54%+ ATS (52.4% is breakeven with -110 juice)
   - Top models: 55-58% ATS over large sample

3. **Return on Investment (ROI)**
   - Track profit/loss over time
   - Top models: 3-5% ROI long-term
   - 10%+ ROI is exceptional (and rare)

4. **Compare to Closing Lines**
   - Closing lines are the "wisdom of crowds"
   - If your model beats closing lines, it has edge
   - This is the gold standard test

5. **Brier Score** (probability accuracy)
   - Lower is better
   - Measures how close predicted probabilities are to actual outcomes
   - Formula: (1/N) * Σ(predicted - actual)²

---

## 4. **Industry Best Practices**

### **Data Requirements:**
- ✅ Minimum 2-3 seasons of historical data
- ✅ Play-by-play data (if available)
- ✅ Adjusted stats (not raw stats)
- ✅ Lineup data (for advanced models)

### **Model Development:**
1. **Feature Engineering**
   - Create derived metrics (efficiency, pace-adjusted)
   - Rolling averages (not single-game stats)
   - Opponent-adjusted statistics

2. **Train/Test Split**
   - Train on past seasons
   - Test on current season
   - Never train on future data (look-ahead bias)

3. **Cross-Validation**
   - Time-series cross-validation
   - Don't shuffle (preserves temporal order)

4. **Ensemble Methods**
   - Combine multiple models
   - Weight by historical performance
   - Reduces variance

### **What Top Models Do:**

**FiveThirtyEight (Nate Silver):**
- Elo ratings with home court adjustment
- Player-level Elo (for NBA)
- Travel, rest, and altitude adjustments
- Playoff intensity factors

**KenPom (Ken Pomeroy):**
- Adjusted efficiency ratings
- Tempo-free stats
- Strength of schedule adjustment
- Luck metric (Pythagorean expectation)

**Haslametrics:**
- Regression-based ratings
- Four Factors emphasis
- Opponent adjustments
- Recency weighting

**Professional Syndicates:**
- Proprietary ML models (XGBoost common)
- Player tracking data
- Injury impact models
- Line shopping across 20+ books
- Kelly Criterion for bet sizing

---

## 5. **Common Pitfalls to Avoid**

❌ **Using raw stats instead of adjusted stats**
   - Raw PPG doesn't account for pace or opponent strength

❌ **Overfitting on small samples**
   - Need 100+ games minimum to validate

❌ **Ignoring recency bias**
   - Recent games matter more than early season

❌ **Not accounting for regression to mean**
   - Hot/cold streaks tend to normalize

❌ **Survivorship bias**
   - Only looking at successful teams

❌ **Not tracking model performance**
   - Must backtest and validate continuously

---

## 6. **Realistic Expectations**

### **Win Probability Prediction:**
- **Good model:** 72-75% correct
- **Great model:** 76-78% correct
- **Elite model:** 79-81% correct
- **Perfect:** Impossible (variance exists)

### **Against the Spread:**
- **Breakeven:** 52.4% (with -110 juice)
- **Good:** 54-55%
- **Great:** 56-57%
- **Elite:** 58%+
- **Impossible:** 60%+ long-term

### **ROI Expectations:**
- **Good:** 2-3% ROI
- **Great:** 4-6% ROI
- **Elite:** 7-10% ROI
- **Unsustainable:** 15%+ (usually luck or small sample)

---

## 7. **Recommended Approach for Your App**

### **Phase 1: Enhanced Statistical Model** (Quick improvement)
```
Current: Basic ratings + momentum
Upgrade to: Four Factors + Adjusted Efficiency + Better weighting
Expected improvement: 68% → 73% accuracy
```

### **Phase 2: Regression Model** (Medium-term)
```
Multiple regression with 15-20 key features
Proper weighting of recent vs season-long stats
Expected accuracy: 74-76%
```

### **Phase 3: Machine Learning** (Long-term)
```
XGBoost with 50+ features
Trained on 3+ seasons of data
Expected accuracy: 76-78%
```

---

## 8. **Data Sources for Better Models**

### **Free Data:**
- Sports-Reference.com (historical stats)
- KenPom.com (efficiency ratings, some free)
- BarttTorvik.com (NCAA Basketball ratings)
- ESPN (basic stats)

### **Paid Data:**
- Synergy Sports ($$$) - Play-by-play
- Second Spectrum ($$$) - Player tracking
- SportsRadar ($$) - Real-time data
- StatsBomb ($$) - Advanced metrics

### **APIs:**
- API-Basketball (your current source)
- The Odds API (your current source)
- SportsMole
- BallDontLie (NBA only)

---

## 9. **Kelly Criterion for Bet Sizing**

When you have an edge, how much to bet:

```
Kelly % = (bp - q) / b

Where:
b = decimal odds - 1
p = probability of winning (from your model)
q = probability of losing (1 - p)

Example:
Your model: 60% win probability
Odds: +110 (2.10 decimal)
Kelly: (1.1 * 0.6 - 0.4) / 1.1 = 23.6% of bankroll

Most pros use fractional Kelly (1/4 or 1/2) to reduce variance
```

---

## 10. **Resources to Learn More**

### **Books:**
- "The Signal and the Noise" - Nate Silver
- "Basketball on Paper" - Dean Oliver (Four Factors)
- "Mathletics" - Wayne Winston
- "Sharp Sports Betting" - Stanford Wong

### **Websites:**
- KenPom.com (methodology explained)
- FiveThirtyEight.com (Elo ratings)
- Cleaning the Glass (NBA analytics)
- The Action Network (betting education)

### **Courses:**
- Coursera: Sports Analytics
- DataCamp: Sports Analytics with Python
- Kaggle: March Madness competitions

---

## Summary

**For a robust prediction engine, you need:**

1. ✅ **Adjusted efficiency ratings** (not raw stats)
2. ✅ **Proper weighting** (recent form + season-long)
3. ✅ **Four Factors** incorporation
4. ✅ **Home court advantage** (3-4 points)
5. ✅ **Strength of schedule** adjustments
6. ✅ **Validation** against actual results
7. ✅ **Continuous improvement** with backtesting

**Your current model (Phase 3) is a good start at ~68-70% accuracy.**

**Next step: Implement Four Factors + Better efficiency calculations for 73-75% accuracy.**

**Long-term: Machine learning with historical data for 76-78% accuracy.**

The key is: **Track performance religiously** and **iterate based on results**. No model is perfect, but consistent 54-55% ATS is profitable!

