# SportsData.IO Sales Call Preparation Plan

## Overview
This document outlines the plan to gather all necessary information for your SportsData.IO sales conversation.

---

## 1. USAGE ESTIMATES

### A. Number of Games Tracked Per Day

**How to Calculate:**
1. **Peak Season (CBB - Nov to Apr):**
   - Check The Odds API for average games per day during season
   - Typical CBB: 50-150 games/day during peak
   - Typical NBA: 10-15 games/day
   - Typical NFL: 10-16 games/day (Sun/Mon/Thu)
   - Typical NHL: 10-15 games/day
   - Typical MLB: 15-20 games/day (during season)

2. **Off-Season:**
   - CBB: 0-20 games/day (off-season tournaments)
   - Other sports: Varies by season

**Action Items:**
- [ ] Run a script to query The Odds API for last 7 days of games across all sports
- [ ] Calculate average games per day per sport
- [ ] Identify peak vs. off-season patterns
- [ ] Document seasonal variations

**Estimated Calculation:**
```
Peak Day (all sports active):
- CBB: 100 games/day
- NBA: 12 games/day  
- NFL: 12 games/day (weekend)
- NHL: 12 games/day
- MLB: 18 games/day
Total: ~154 games/day peak

Average Day (weighted by season):
- CBB: 60 games/day (Nov-Apr active)
- NBA: 8 games/day (Oct-Jun active)
- NFL: 4 games/day (Sep-Feb, mostly weekends)
- NHL: 8 games/day (Oct-Jun active)
- MLB: 10 games/day (Mar-Oct active)
Total: ~90 games/day average
```

### B. Frequency of API Calls

**Current Implementation Analysis:**

1. **Live Games Polling:**
   - Frequency: Every 30 seconds (`revalidate: 30`)
   - Endpoint: `/sports/{sport}/scores/`
   - Calls per day: (24 hours × 60 min × 60 sec) / 30 sec = 2,880 calls/day per sport
   - **Current:** 2,880 calls/day × 5 sports = **14,400 calls/day** (if all sports active)

2. **Matchup Page Loads:**
   - Each matchup page requires:
     - 2 team stats calls (home + away)
     - 2 recent games calls (home + away, 5 games each)
     - 1 head-to-head call (CBB only)
   - **Per matchup:** ~5 API calls
   - **Estimated page views:** 50-200 matchups viewed/day
   - **Calls:** 50-200 matchups × 5 calls = **250-1,000 calls/day**

3. **Team Stats Caching:**
   - Stats cached per season (current implementation)
   - Games cached per team per season
   - **Cache hits reduce API calls significantly**

**Action Items:**
- [ ] Add API call logging to track actual usage
- [ ] Monitor cache hit rates
- [ ] Calculate actual vs. theoretical API calls
- [ ] Document peak usage patterns (game days vs. off days)

**Estimated Monthly Calculation:**
```
Live Games Polling:
- 2,880 calls/day × 30 days = 86,400 calls/month (per sport)
- If 3 sports active: 259,200 calls/month
- If 5 sports active: 432,000 calls/month

Matchup Page Loads:
- 500 matchups/day × 5 calls = 2,500 calls/day
- 2,500 × 30 = 75,000 calls/month

Total Estimated: 334,200 - 507,000 calls/month
```

### C. Expected Monthly Call Volume

**Conservative Estimate:**
- **Low usage:** 50,000-100,000 calls/month
  - 1-2 sports active
  - Lower user traffic
  - Good caching

- **Medium usage:** 100,000-250,000 calls/month
  - 2-3 sports active
  - Moderate user traffic
  - Standard caching

- **High usage:** 250,000-500,000 calls/month
  - 4-5 sports active
  - High user traffic
  - Peak season activity

**Action Items:**
- [ ] Set up API usage tracking (add to your retry-utils or create new tracking)
- [ ] Run for 1 week to get baseline
- [ ] Project monthly based on seasonal patterns
- [ ] Add 20-30% buffer for growth

**Recommended Estimate for Sales Call:**
- **Initial:** 100,000-150,000 calls/month (start conservative)
- **Growth projection:** 200,000-300,000 calls/month (6-12 months)
- **Peak capacity needed:** 500,000 calls/month (all sports, peak season)

---

## 2. REQUIREMENTS LIST

### A. Must-Have Data Fields

**Four Factors (Critical for CBB):**
- [ ] `EffectiveFieldGoalsPercentage` (eFG%)
- [ ] `TurnOversPercentage` (TO%)
- [ ] `OffensiveReboundsPercentage` (OReb%)
- [ ] `FreeThrowAttemptRate` (FTA Rate)

**Advanced Metrics:**
- [ ] `OffensiveRating` (points per 100 possessions)
- [ ] `DefensiveRating` (points allowed per 100 possessions)
- [ ] `Possessions` (for tempo/pace calculation)
- [ ] `NetRating` (OffensiveRating - DefensiveRating)

**Basic Team Stats:**
- [ ] Wins/Losses (W-L record)
- [ ] Points Per Game (PPG)
- [ ] Points Allowed Per Game (PAPG)
- [ ] Field Goal Percentage
- [ ] Three-Point Percentage
- [ ] Free Throw Percentage
- [ ] Rebounds Per Game
- [ ] Assists Per Game
- [ ] Turnovers Per Game

**Game Data:**
- [ ] Game scores (home/away)
- [ ] Game dates/times
- [ ] Game status (scheduled, live, final)
- [ ] Team names (consistent across endpoints)
- [ ] Venue information

**Recent Games:**
- [ ] Last 5-10 games per team
- [ ] Win/loss results
- [ ] Scores
- [ ] Opponents

**Head-to-Head:**
- [ ] Historical matchups between two teams
- [ ] Win/loss record in H2H
- [ ] Game dates and scores

**Action Items:**
- [ ] Review SportsData.IO API documentation for exact field names
- [ ] Test API responses to verify field availability
- [ ] Create mapping document (SportsData field → Your app field)
- [ ] Identify any missing fields that need workarounds

### B. Update Frequency Needs

**Real-Time Requirements:**
- [ ] **Live games:** Updates every 30 seconds (current implementation)
- [ ] **Game scores:** Real-time or near real-time (< 1 minute delay)
- [ ] **Game status:** Real-time (scheduled → live → final)

**Near Real-Time Requirements:**
- [ ] **Team stats:** Updated within 1 hour after game completion
- [ ] **Recent games:** Updated within 1 hour after game completion
- [ ] **Standings:** Updated daily or after each game day

**Daily Requirements:**
- [ ] **Schedules:** Updated daily for upcoming games
- [ ] **Team rosters:** Updated as needed (less frequent)

**Action Items:**
- [ ] Document your current update frequency expectations
- [ ] Ask SportsData.IO about their update latency
- [ ] Verify if webhooks are available for real-time updates
- [ ] Determine if polling is acceptable or if webhooks are needed

**Recommended Questions for Sales:**
- "How quickly are scores updated after a play/quarter ends?"
- "Do you offer webhooks for live game updates?"
- "What's the typical delay between game completion and stats availability?"
- "Can I poll more frequently than your standard rate limits for live games?"

### C. Sports You Plan to Support

**Current Implementation:**
- [x] **CBB (College Basketball)** - Primary focus, fully implemented
- [x] **NBA** - Configured, ready to implement
- [x] **NFL** - Configured, ready to implement
- [x] **NHL** - Configured, ready to implement
- [x] **MLB** - Configured, ready to implement

**Priority Order:**
1. **CBB** - Launch with this (highest priority)
2. **NBA** - Add within 3-6 months
3. **NFL** - Add within 6-12 months
4. **NHL** - Add within 12-18 months
5. **MLB** - Add within 12-18 months

**Action Items:**
- [ ] Confirm SportsData.IO supports all 5 sports
- [ ] Verify data quality/coverage for each sport
- [ ] Check if pricing is per-sport or bundled
- [ ] Ask about multi-sport discounts

**Questions for Sales:**
- "Do you offer a multi-sport package discount?"
- "Can I add sports incrementally, or do I need to subscribe to all at once?"
- "What's the data quality difference between CBB and professional sports?"
- "Are there any sports you don't cover that I should know about?"

---

## 3. TIMELINE

### A. When You Need to Make a Decision

**Decision Timeline:**
- [ ] **Target decision date:** [Fill in your target date]
- [ ] **Latest decision date:** [Fill in your deadline]
- [ ] **Factors affecting timeline:**
  - Current API (API-Sports.io) subscription expiration date
  - Launch date requirements
  - Budget approval timeline
  - Technical integration time needed

**Recommended Timeline:**
```
Week 1: Initial sales call + get trial access
Week 2: Test API integration + verify data quality
Week 3: Compare pricing/features with alternatives
Week 4: Make decision + negotiate contract
```

**Action Items:**
- [ ] Set a target decision date (recommend: 2-4 weeks from first call)
- [ ] Check when current API subscription expires
- [ ] Determine how long you need for integration testing
- [ ] Factor in budget approval process if needed

### B. When You Plan to Launch/Go Live

**Launch Timeline:**
- [ ] **Soft launch date:** [Fill in]
- [ ] **Public launch date:** [Fill in]
- [ ] **Full feature launch:** [Fill in]

**Recommended Phases:**
```
Phase 1: CBB Only (Launch)
- Target: [Your target date]
- Features: Basic stats, matchups, odds
- Users: Beta/limited

Phase 2: Enhanced CBB (3 months post-launch)
- Features: Advanced analytics, Four Factors
- Users: Public

Phase 3: Multi-Sport (6-12 months post-launch)
- Add: NBA, NFL
- Features: Cross-sport analytics

Phase 4: Full Platform (12-18 months)
- Add: NHL, MLB
- Features: Complete multi-sport platform
```

**Action Items:**
- [ ] Set target launch date for CBB
- [ ] Plan integration timeline (1-2 weeks for testing)
- [ ] Account for buffer time before launch
- [ ] Consider soft launch vs. public launch

**Questions for Sales:**
- "Can I get API access immediately after signing?"
- "How long does onboarding typically take?"
- "Do you offer integration support for new customers?"
- "What's the typical time from signup to production-ready?"

---

## 4. ADDITIONAL CONSIDERATIONS

### A. Budget Planning

**Questions to Answer:**
- [ ] What's your monthly budget for sports data APIs?
- [ ] Are you willing to pay more for better data quality?
- [ ] Do you need to stay within a specific price range?
- [ ] Is annual payment an option for discounts?

**Action Items:**
- [ ] Research SportsData.IO pricing tiers
- [ ] Compare with current API costs
- [ ] Calculate ROI (better data = better user experience = more users)
- [ ] Prepare budget justification if needed

### B. Technical Integration

**Questions to Answer:**
- [ ] How long will integration take?
- [ ] Do you need to refactor existing code?
- [ ] Are there any breaking changes from current API?
- [ ] What's the migration path?

**Action Items:**
- [ ] Review SportsData.IO API documentation
- [ ] Map current API calls to SportsData.IO endpoints
- [ ] Identify code changes needed
- [ ] Estimate development time

### C. Data Quality Comparison

**Questions to Answer:**
- [ ] How does SportsData.IO compare to API-Sports.io?
- [ ] Are there any data gaps?
- [ ] What's the accuracy rate?
- [ ] How do they handle data corrections?

**Action Items:**
- [ ] Test SportsData.IO trial/free tier
- [ ] Compare sample responses side-by-side
- [ ] Test edge cases (team name matching, etc.)
- [ ] Verify Four Factors data availability

---

## 5. PRE-CALL CHECKLIST

### Before the Sales Call:

- [ ] Review this document and fill in all [Fill in] sections
- [ ] Run usage estimation scripts (see Action Items above)
- [ ] Test SportsData.IO free trial if available
- [ ] Prepare list of specific questions (see questions throughout this doc)
- [ ] Review their website and documentation
- [ ] Prepare your "elevator pitch" about your app
- [ ] Have your current API costs ready for comparison
- [ ] Set your decision timeline
- [ ] Prepare your launch timeline

### During the Sales Call:

- [ ] Take detailed notes
- [ ] Ask for specific examples/demos
- [ ] Request trial access or extended demo
- [ ] Get pricing in writing
- [ ] Ask about contract terms
- [ ] Clarify any technical questions
- [ ] Discuss integration support

### After the Sales Call:

- [ ] Review notes and compare with requirements
- [ ] Test trial access thoroughly
- [ ] Compare with alternatives
- [ ] Make decision within your timeline
- [ ] Negotiate if needed
- [ ] Get everything in writing before signing

---

## 6. USER GROWTH PROJECTIONS

### A. User Growth Scenarios

**Run the analysis script:**
```bash
npx tsx scripts/user-vs-api-usage.ts
```

**Key User Projections:**

| Scenario | Daily Active Users | Monthly Active Users | API Calls/Month | Cost/User/Month |
|----------|-------------------|---------------------|-----------------|-----------------|
| Launch (Month 1-3) | 50 | 500 | ~115K | $0.23 |
| Early Growth (Month 4-6) | 200 | 2,000 | ~200K | $0.10 |
| Growth (Month 7-12) | 500 | 5,000 | ~371K | $0.07 |
| Scale (Year 2) | 2,000 | 20,000 | ~1.2M | $0.03 |
| Mature (Year 3+) | 5,000 | 50,000 | ~2.9M | $0.01 |

### B. Key Insights from User Analysis

1. **API Calls Per User:**
   - Launch: ~230 API calls per user per month
   - Each user views ~5 matchups per session
   - 70% cache hit rate reduces actual API calls

2. **Cost Efficiency Improves with Scale:**
   - Launch: $0.23/user/month
   - Growth: $0.07/user/month (70% reduction)
   - Scale: $0.03/user/month (89% reduction from launch)
   - **This is a strong negotiating point** - you become more efficient as you grow

3. **Live Polling Dominates Usage:**
   - 75% of API calls are from background polling (not user-driven)
   - Only 25% are directly from user activity
   - **Ask about webhooks** to reduce polling costs

4. **User Activity Impact:**
   - Each additional 100 users = ~1,900 additional API calls/day
   - User-driven calls scale linearly with user base
   - Background polling stays constant regardless of users

### C. Questions to Ask Based on User Growth

- "Our cost per user decreases from $0.23 to $0.03 as we scale - do you offer volume discounts?"
- "Since 75% of our calls are background polling, do you offer webhooks to reduce costs?"
- "Can we get custom pricing for 200K-500K calls/month as we grow?"
- "What happens if we exceed our tier - is there overage pricing or auto-upgrade?"

---

## 7. QUICK REFERENCE FOR SALES CALL

**Your One-Page Summary:**

```
PROJECT: The Odds Oracle - Sports Betting Analytics Platform

CURRENT STATUS:
- Live app with CBB focus
- Using API-Sports.io (via RapidAPI) for stats
- Using The Odds API for betting odds
- Multi-sport architecture ready (CBB, NBA, NFL, NHL, MLB)

USER PROJECTIONS:
- Launch (Month 1-3): 500 MAU, 50 DAU
- Growth (Month 7-12): 5,000 MAU, 500 DAU
- Scale (Year 2): 20,000 MAU, 2,000 DAU

USAGE ESTIMATES:
- Games tracked: ~90/day average, ~154/day peak
- API calls: 115K/month (launch), 371K/month (growth), 1.2M/month (scale)
- Peak capacity: 500K calls/month (multi-sport)
- Cost per user: $0.23 (launch) → $0.03 (scale) - 89% efficiency gain

REQUIREMENTS:
- Four Factors metrics (critical)
- Advanced metrics (Offensive/Defensive Rating, Pace)
- Real-time game updates (30-second polling - 75% of calls)
- Multi-sport support (CBB first, then NBA/NFL/NHL/MLB)

TIMELINE:
- Decision needed: [Your date]
- Launch target: [Your date]
- Integration time: 1-2 weeks

BUDGET:
- Current API cost: [Your current cost]
- Target range: [Your budget range]
- Cost efficiency: Improves 89% as we scale (strong ROI story)
- Open to annual commitment for discounts
```

---

## NEXT STEPS

1. **This Week:**
   - Fill in all [Fill in] sections in this document
   - Run usage estimation scripts
   - Test SportsData.IO free trial

2. **Before Sales Call:**
   - Complete pre-call checklist
   - Prepare your one-page summary
   - Review your questions list

3. **During Sales Call:**
   - Use this document as reference
   - Take notes directly in this document
   - Get all commitments in writing

4. **After Sales Call:**
   - Update this document with answers
   - Test trial access
   - Make decision within timeline

---

**Last Updated:** [Date]
**Next Review:** [Date]

