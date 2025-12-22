# Prediction Scheduling Architecture

## Current State

### How Predictions Are Currently Run
- **On-Demand**: Predictions are generated when a user views a matchup page
- **Location**: `components/AdvancedAnalytics.tsx` → `predictMatchup()`
- **Storage**: Predictions are saved to database via `/api/predictions/track` endpoint
- **Problem**: Users only see predictions for games they manually visit

### Data Fetching
- **Upcoming Games**: Fetched from The Odds API on-demand (cached 30 seconds)
- **Team Stats**: Fetched from SportsData.io on-demand (per-team, per-matchup)
- **Problem**: No proactive fetching, no batch processing, API rate limits hit frequently

---

## Proposed Architecture

### 1. Scheduled Jobs / Background Tasks

We need a job scheduling system. Options:

#### Option A: Next.js API Routes + Cron (Recommended for MVP)
- Use Vercel Cron Jobs or external cron service
- Simple, serverless-friendly
- Good for MVP and moderate scale

#### Option B: Queue System (BullMQ, Inngest)
- More robust, better for high volume
- Requires Redis/database queue
- Better for production at scale

#### Option C: Separate Worker Service
- Most flexible, best isolation
- More infrastructure complexity
- Best for large-scale production

**Recommendation**: Start with **Option A** (Vercel Cron/API routes), migrate to Option B if needed.

---

## Recommended Schedule

### Daily Jobs

#### 1. **Fetch Upcoming Games** (Early Morning - 6 AM)
- **Frequency**: Once daily
- **What**: Fetch all upcoming games for next 3-5 days from The Odds API
- **Why**: Get early opportunity for games that are far out
- **Store**: Save game metadata to database (or cache)
- **API Cost**: 1 call/day

#### 2. **Refresh Team Stats** (Early Morning - 6:30 AM)
- **Frequency**: Once daily (after games finish)
- **What**: Fetch updated team stats from SportsData.io for all active teams
- **Why**: Stats update after games complete (usually overnight)
- **Strategy**: 
  - Batch fetch all team stats
  - Update team stats cache/database
- **API Cost**: ~350 calls (one per team) - consider batching

#### 3. **Generate Predictions** (Morning - 7 AM)
- **Frequency**: Once daily (after stats refresh)
- **What**: Generate predictions for all upcoming games
- **Why**: Early opportunities, users see predictions immediately
- **Process**:
  1. Get all upcoming games (from job #1)
  2. For each game, fetch team stats (use cached from job #2)
  3. Generate prediction
  4. Store in database (upsert - update if exists, create if new)
- **API Cost**: Minimal (uses cached stats)
- **Output**: Predictions stored in `predictions` table

#### 4. **Update Predictions** (Afternoon - 2 PM, Evening - 6 PM)
- **Frequency**: 2-3 times daily (before games start)
- **What**: Re-run predictions with latest stats/data
- **Why**: 
  - New injury news (future)
  - Updated odds
  - Latest team form
- **Strategy**: Only update predictions for games starting in next 24 hours
- **API Cost**: Minimal (use cached stats, only update recent)

#### 5. **Record Outcomes** (Overnight - 2 AM)
- **Frequency**: Once daily (after all games finish)
- **What**: Match completed games to predictions, record actual scores
- **Why**: Close the loop, enable validation
- **Process**: Use `scripts/validate-daily.ts` (already exists)
- **API Cost**: 1-2 calls to get completed games

---

## Detailed Schedule Breakdown

### Early Morning (6:00 AM) - Discovery Phase
```
Job: Fetch Upcoming Games
├── Fetch games for next 5 days from The Odds API
├── Filter for basketball_ncaab
├── Store game metadata (id, teams, date, etc.)
└── Create/update game records in database
```

### Early Morning (6:30 AM) - Data Refresh
```
Job: Refresh Team Stats
├── Get list of all active teams (from upcoming games)
├── Batch fetch team stats from SportsData.io
├── Update team stats cache/database
└── Invalidate old cache entries
```

### Morning (7:00 AM) - Prediction Generation
```
Job: Generate Predictions
├── Get all upcoming games (next 5 days)
├── For each game:
│   ├── Fetch team stats (use cache)
│   ├── Fetch recent games (use cache)
│   ├── Generate prediction
│   └── Upsert prediction in database
└── Log summary: X predictions generated/updated
```

### Afternoon (2:00 PM) - Prediction Refresh #1
```
Job: Update Predictions (Games Starting Soon)
├── Get games starting in next 24 hours
├── Re-fetch latest stats (if updated)
├── Re-generate predictions
└── Update database (only if prediction changed significantly)
```

### Evening (6:00 PM) - Prediction Refresh #2
```
Job: Update Predictions (Final Check)
├── Get games starting in next 12 hours
├── Check for new data (injuries, lineup changes - future)
├── Re-generate predictions
└── Update database
```

### Overnight (2:00 AM) - Validation
```
Job: Record Outcomes
├── Get all completed games from today
├── Match to predictions in database
├── Record actual scores
└── Mark predictions as validated
```

---

## Data Refresh Strategy

### Team Stats Refresh Frequency

| Data Type | Update Frequency | Reason |
|-----------|------------------|--------|
| **Season Stats** | Once daily (morning) | Updates after games complete |
| **Recent Games** | Once daily (morning) | New games added daily |
| **Team Ratings** | Once daily (morning) | Derived from stats |
| **Upcoming Games** | Once daily (early morning) | New games posted daily |

### When to Re-Run Predictions

Predictions should be updated when:
1. **New game discovered** (daily morning job)
2. **Team stats updated** (after daily refresh)
3. **Game starting soon** (afternoon/evening refresh jobs)
4. **Injury/news events** (future: real-time trigger)
5. **Odds changed significantly** (future: odds monitoring)

### Prediction Staleness

- **Predictions > 3 days out**: Use daily refresh only
- **Predictions 1-3 days out**: Refresh daily + afternoon check
- **Predictions < 24 hours**: Refresh multiple times (afternoon + evening)
- **Predictions < 6 hours**: Consider hourly refresh (future)

---

## Implementation Plan

### Phase 1: Basic Scheduled Jobs (Week 1)

1. **Create job infrastructure**
   - Set up Vercel Cron or external cron service
   - Create API routes for each job type
   - Add job status tracking

2. **Daily morning jobs**
   - Fetch upcoming games
   - Refresh team stats
   - Generate initial predictions

3. **Validation job**
   - Run existing `validate-daily.ts` as scheduled job

### Phase 2: Prediction Refresh (Week 2)

1. **Afternoon/evening refresh jobs**
   - Update predictions for games starting soon
   - Smart refresh (only update if data changed)

2. **Prediction comparison**
   - Track prediction changes over time
   - Identify when predictions change significantly

### Phase 3: Optimization (Week 3)

1. **Caching improvements**
   - Better team stats caching
   - Prediction result caching
   - Reduce redundant API calls

2. **Batch processing**
   - Batch team stats fetches
   - Parallel prediction generation

### Phase 4: News/Injury Integration (Future)

1. **News feed integration**
   - Monitor injury reports
   - Track lineup changes
   - Trigger prediction updates on news

2. **Real-time updates**
   - Webhook for injury news
   - Immediate prediction refresh

---

## Database Schema Additions Needed

### Game Metadata Table
```prisma
model Game {
  id          String   @id  // From Odds API
  sportKey    String
  commenceTime DateTime
  homeTeam    String
  awayTeam    String
  status      String   // "scheduled", "in_progress", "completed"
  
  // Metadata
  lastUpdated DateTime @updatedAt
  createdAt   DateTime @default(now())
  
  // Relations
  predictions Prediction[]
  
  @@index([commenceTime])
  @@index([status])
  @@map("games")
  @@schema("oddsoracle")
}
```

### Job Execution Log
```prisma
model JobExecution {
  id          String   @id @default(cuid())
  jobName     String   // "fetch-games", "generate-predictions", etc.
  status      String   // "success", "failed", "running"
  startedAt   DateTime @default(now())
  completedAt DateTime?
  error       String?  @db.Text
  metadata    Json?    // Additional info (games processed, etc.)
  
  @@index([jobName, startedAt])
  @@map("job_executions")
  @@schema("oddsoracle")
}
```

---

## API Rate Limit Considerations

### The Odds API
- **Limit**: Varies by plan (typically 500/month free, 1000+/month paid)
- **Current Usage**: ~1 call per page view (fetching all games)
- **Optimized Usage**: 1 call/day (scheduled job) + cache
- **Savings**: 99% reduction in API calls

### SportsData.io
- **Limit**: Varies by plan
- **Current Usage**: 2 calls per matchup view (one per team)
- **Optimized Usage**: 
  - Batch fetch all teams once daily: ~350 calls/day
  - Cache aggressively: predictions use cached data
- **Savings**: Predictions don't hit API (use cache)

---

## Cost Analysis

### Current (On-Demand)
- **User views 100 matchups/day**: 200 SportsData API calls + 100 Odds API calls
- **Monthly**: ~6,000 SportsData + ~3,000 Odds API calls

### Optimized (Scheduled)
- **Daily jobs**: ~350 SportsData calls + 1 Odds API call
- **User views**: 0 additional API calls (use cache)
- **Monthly**: ~10,500 SportsData + 30 Odds API calls
- **Trade-off**: More SportsData calls, but predictions work even with no users

---

## Monitoring & Alerts

### Metrics to Track
- **Prediction generation success rate**
- **API call counts and costs**
- **Prediction accuracy over time**
- **Job execution times**
- **Cache hit rates**

### Alerts Needed
- Job failures
- API rate limit warnings
- Prediction generation errors
- Data staleness warnings

---

## Future Enhancements

### News/Injury Integration
1. **News feed service** (e.g., NewsAPI, custom scraper)
2. **Injury detection** (keyword matching: "out", "injury", "questionable")
3. **Automatic prediction refresh** when injury detected
4. **User notifications** for significant prediction changes

### Odds Monitoring
1. **Track odds movements**
2. **Alert on significant line movement**
3. **Re-evaluate value bets** when odds change

### Machine Learning Enhancement
1. **Use historical prediction accuracy** to improve model
2. **Auto-calibration** based on validation results
3. **Dynamic coefficient adjustment**

---

## Summary

### Recommended Schedule

| Time | Job | Frequency | Purpose |
|------|-----|-----------|---------|
| 6:00 AM | Fetch Upcoming Games | Daily | Early opportunity discovery |
| 6:30 AM | Refresh Team Stats | Daily | Latest data for predictions |
| 7:00 AM | Generate Predictions | Daily | Initial predictions for all games |
| 2:00 PM | Update Predictions | Daily | Refresh games starting soon |
| 6:00 PM | Update Predictions | Daily | Final check before games |
| 2:00 AM | Record Outcomes | Daily | Close the loop, validation |

### Key Benefits
1. **Early Opportunities**: Predictions available before users visit
2. **Reduced API Calls**: Batch processing, caching
3. **Better UX**: Users see predictions immediately
4. **Scalability**: Works regardless of user traffic
5. **Analytics**: Can analyze prediction accuracy over time

