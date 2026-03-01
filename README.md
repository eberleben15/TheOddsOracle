# The Odds Oracle - Prediction & Feedback System

## Overview

The Odds Oracle is a sophisticated sports betting prediction system that combines statistical analysis, machine learning, and continuous feedback loops to generate accurate predictions and improve over time.

## 📚 Documentation Structure

This documentation is organized into the following sections:

1. **[Prediction System Architecture](docs/PREDICTION_ARCHITECTURE.md)** - How predictions are generated
2. **[Feedback Training Loop](docs/FEEDBACK_LOOP.md)** - How the system learns and improves
3. **[ATS Feedback System](docs/IMPLEMENTATION_SUMMARY.md)** - Phase 1-4 implementation details
4. **[Strategic Direction](docs/STRATEGIC_DIRECTION.md)** - Product vision and "Brain A + Brain B" approach

## 🎯 Quick Start

### What This System Does

1. **Generates Predictions**: Analyzes team statistics, trends, and historical data to predict game outcomes
2. **Validates Performance**: Tracks actual results against predictions to measure accuracy
3. **Learns Automatically**: Continuously improves by identifying which features help or hurt performance
4. **Optimizes Portfolios**: Constructs balanced betting portfolios using advanced decision engine

### Key Concepts

- **Brain A (Prediction Engine)**: Generates probabilities and identifies value bets
- **Brain B (Decision Engine)**: Constructs optimal portfolios with risk management
- **ATS (Against The Spread)**: Measures prediction accuracy relative to betting lines
- **Feedback Loop**: Automated system that validates, trains, and improves the model

## 🔄 System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA COLLECTION                          │
│  • Team Statistics (ESPN, SportsData)                          │
│  • Betting Lines (Odds API)                                    │
│  • Historical Games & Outcomes                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PREDICTION GENERATION                        │
│  • Calculate 50+ team analytics features                       │
│  • Apply regression models                                     │
│  • Calibrate probabilities (Platt scaling)                     │
│  • Identify value bets                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PORTFOLIO CONSTRUCTION                        │
│  • Apply risk constraints                                      │
│  • Manage correlations                                         │
│  • Size positions (Kelly criterion)                            │
│  • Track config version                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    OUTCOME VALIDATION                           │
│  • Match predictions to actual results                         │
│  • Calculate ATS performance                                   │
│  • Track by sport, confidence, spread magnitude                │
│  • Store in feedback history                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FEEDBACK ANALYSIS                           │
│  • Feature importance (correlation & regression)               │
│  • Segment analysis (worst performers)                         │
│  • Bias detection                                              │
│  • Bootstrap confidence intervals                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MODEL RETRAINING                             │
│  • Fit Platt scaling coefficients                              │
│  • Update bias corrections                                     │
│  • Generate new pipeline config                                │
│  • A/B test before full rollout                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     └──────────────┐
                                    │
                     ┌──────────────┘
                     │
                     ▼
                IMPROVED PREDICTIONS (cycle repeats)
```

## 📊 Key Performance Metrics

### Prediction Accuracy
- **Win Rate**: Percentage of correct predictions
- **ATS Win Rate**: Accuracy against betting spreads (target: >52.4%)
- **Brier Score**: Probability calibration quality (lower is better)
- **Closing Line Value (CLV)**: How often we beat the closing line

### Portfolio Performance
- **Net Units**: Total profit/loss at -110 juice
- **ROI**: Return on investment percentage
- **Max Drawdown**: Largest peak-to-trough decline
- **Sharpe Ratio**: Risk-adjusted returns

## 🔧 Technical Architecture

### Core Technologies
- **Next.js 16**: Full-stack React framework
- **Prisma**: Database ORM with PostgreSQL
- **TensorFlow.js**: Machine learning for feature importance
- **TypeScript**: Type-safe implementation

### Key Modules
```
lib/
├── advanced-analytics.ts       # Brain A: Prediction engine
├── ats-feedback.ts            # Feedback analysis & reporting
├── ml-analytics.ts            # TensorFlow regression & bootstrap
├── feedback-pipeline-config.ts # Configurable adjustment rules
├── feedback-history.ts        # Temporal tracking
├── ab-testing.ts              # A/B test framework
├── decision-engine-tracking.ts # Brain B: Portfolio feedback
├── prediction-tracker.ts      # Outcome validation
└── prediction-feedback-batch.ts # Automated training job
```

## 🎓 Learning Process

### 1. Feature Extraction (50+ features)
Every prediction captures rich analytics about both teams:
- **Ratings**: Net rating, offensive/defensive efficiency
- **Trends**: Recent form, momentum, win streaks
- **Context**: Strength of schedule, home advantage
- **Shooting**: FG%, 3P%, FT%
- **Other**: Rebounding, assists, turnovers, pace

### 2. Correlation Analysis
The system identifies which features correlate with ATS success:
- Positive correlation: Feature helps when high
- Negative correlation: Feature helps when low
- Neutral: Feature doesn't impact ATS performance

### 3. Segmentation Analysis
Performance is broken down by multiple dimensions:
- **By Sport**: CBB, NBA, NHL, MLB
- **By Confidence**: High (≥70), Medium (50-70), Low (<50)
- **By Spread**: Small (<3), Medium (3-7), Large (7-12), Very Large (≥12)
- **By Total**: Under 130, 130-145, 145-160, Over 160
- **By Favorite**: Home favorite vs away favorite

### 4. Automated Adjustments
Based on feedback, the system automatically:
- **Disables** segments with <35% win rate (>10 samples)
- **Downweights** segments with 35-45% win rate
- **Boosts** segments with >60% win rate
- **Maintains** segments performing near target (45-60%)

### 5. Validation Before Rollout
- **Shadow Mode**: Run new config alongside old without affecting users
- **A/B Testing**: Split users 50/50 to compare performance
- **Statistical Significance**: Only rollout if improvement is proven

## 📈 Performance Tracking

### Config Version History
Every prediction is tagged with the config version that generated it, enabling:
- Trend analysis over time
- Version comparison (v5 vs v6)
- Rollback if performance degrades

### Temporal Metrics
The system tracks daily/weekly/monthly:
- Win rate trends
- Net units accumulated
- Feature importance shifts
- Segment performance changes

## 🔬 Advanced Analytics

### Regression-Based Feature Importance
Uses TensorFlow.js logistic regression to identify:
- Which features have strongest predictive power
- Feature coefficients (positive/negative impact)
- Statistical significance (p-values)

### Bootstrap Confidence Intervals
For every metric, the system calculates:
- 95% confidence intervals via resampling
- True uncertainty bounds
- Statistical robustness

### Decision Engine Integration
Tracks portfolio-level outcomes:
- Which combinations of bets perform best
- Correlation vs individual bet quality
- Regret analysis (missed opportunities)

## 🚀 Getting Started

### For Users
1. View predictions at `/sports/[sport]`
2. See recommended bets at `/recommended-bets`
3. Check portfolio risk at `/portfolio-risk`
4. Monitor performance at `/validation-dashboard`

### For Admins
1. ATS Feedback: `/admin/ats-feedback`
2. Model Training: `/admin/model-training`
3. Decision Engine Performance: `/admin/decision-engine-performance`
4. A/B Tests: `/admin/ab-test`

### For Developers
See detailed implementation guides:
- [Prediction Architecture](docs/PREDICTION_ARCHITECTURE.md)
- [Feedback Loop](docs/FEEDBACK_LOOP.md)
- [Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)

## 📝 Data Flow Example

### Example: College Basketball Game

**Input:**
```
Game: Duke vs UNC
Date: 2024-03-01
Market Spread: Duke -5.5
```

**Feature Extraction:**
```typescript
{
  homeNetRating: 15.2,      // Duke's net rating
  awayNetRating: 12.8,      // UNC's net rating
  homeMomentum: 0.8,        // Duke on 4-game win streak
  awayMomentum: -0.2,       // UNC lost 2 of last 5
  sosDiff: 2.1,             // Duke has played tougher schedule
  homeAdvantage: 3.5,       // Duke at home
  // ... 40+ more features
}
```

**Prediction:**
```typescript
{
  predictedSpread: -7.2,    // Duke by 7.2
  confidence: 68,           // Medium-high confidence
  winProbability: {
    home: 0.72,             // 72% Duke wins
    away: 0.28              // 28% UNC wins
  },
  valueBet: true,           // Our -7.2 vs market -5.5 = 1.7 points of edge
  configVersion: 5          // Generated by config v5
}
```

**Actual Outcome:**
```
Duke 78, UNC 71
Actual Margin: +7 (Duke by 7)
ATS Result: WIN (covered the -5.5 spread)
Net Units: +0.91 (won at -110 juice)
```

**Feedback:**
```typescript
{
  atsResult: 1,             // Win
  closeLineBeat: true,      // If closing line moved to -6.5
  featuresCorrelated: [
    'homeNetRating',        // High net rating predicted win
    'homeMomentum',         // Win streak helped
    'sosDiff'               // SOS difference mattered
  ],
  configVersion: 5          // Tracked for version comparison
}
```

## 🔐 Security & Privacy

- Predictions are public (logged-out users can view)
- Betting recommendations require authentication
- Admin tools require `ADMIN_EMAIL` match
- API keys stored in environment variables
- User bankroll data encrypted at rest

## 📞 Support

- **Documentation**: See `docs/` folder
- **Issues**: Check GitHub issues
- **Admin**: Access admin panel for system health

---

**Built with ❤️ by The Odds Oracle team**

*Combining statistical rigor with machine learning to find an edge in sports betting.*
