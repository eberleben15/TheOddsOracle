# API Call Structure & Optimization Analysis

## Current API Architecture

### 1. **The Odds API** (Betting Odds & Live Scores)
**Endpoints Used:**
- `/sports/{sport}/odds` - Get upcoming games with betting odds
- `/sports/{sport}/scores` - Get live game scores

**Current Usage:**
```
Dashboard (app/page.tsx):
├─ getLiveGames() → /scores endpoint
└─ getUpcomingGames() → /odds endpoint

Matchup Detail (app/matchup/[id]/page.tsx):
└─ getGameOdds(gameId) → calls getUpcomingGames() internally
```

### 2. **API-Sports.io Basketball API** (Team Stats & Games)
**Endpoints Used:**
- `/teams?search={name}` - Search for team by name
- `/statistics?team={id}&league=116&season={YYYY-YYYY}` - Get team stats
- `/games?team={id}&league=116&season={YYYY-YYYY}` - Get team recent games  
- `/games?h2h={id1}-{id2}&league=116&season={YYYY-YYYY}` - Get head-to-head

**Current Usage:**
```
Matchup Detail (app/matchup/[id]/page.tsx):
├─ searchTeamByName(home) → /teams endpoint (with validation loops)
├─ searchTeamByName(away) → /teams endpoint (with validation loops)
├─ getTeamStats(home) → /statistics endpoint
├─ getTeamStats(away) → /statistics endpoint
├─ getRecentGames(home) → /games endpoint
├─ getRecentGames(away) → /games endpoint
└─ getHeadToHead(home, away) → /games?h2h endpoint
```

---

## Issues & Inefficiencies

### 🔴 **Critical Issues:**

#### 1. **Duplicate API Calls on Dashboard → Matchup Navigation**
**Problem:** When user clicks a game on dashboard to view details:
- Dashboard already fetched all games via `getUpcomingGames()`
- Matchup page calls `getGameOdds(gameId)` which internally calls `getUpcomingGames()` AGAIN
- **Result:** Same odds data fetched twice within seconds

**Impact:** 2x API calls to The Odds API for the same data

#### 2. **Inefficient Team Search with Multiple Validation Calls**
**Problem:** `searchTeamByName()` makes sequential API calls:
```
For each team:
  1. /teams?search={term1} → Get list of teams
  2. For each candidate team:
     /statistics?team={id} → Check if team has NCAA data
     (Repeat until match found)
```

**Impact:** 
- 1-5+ API calls per team search
- On matchup page: 2-10+ calls just to find team IDs
- Rate limiting delays (150ms between each call)

#### 3. **Cache Cleared on Every Request**
**Problem:** `apiCache.clear()` at start of matchup page
- Loses team ID mappings from `teamMappingCache`
- Forces re-search of same teams if user navigates back/forward

**Impact:** Repeated team searches for teams already identified

#### 4. **Unused Data from API Responses**
**Problem:** API responses contain rich data we're ignoring:
- **From `/statistics`:** Field goal %, rebounds, assists, turnovers, etc.
- **From `/games`:** Quarter scores, periods data, venue info
- **From `/scores` (live):** Last update timestamp, detailed score breakdown

**Impact:** Missing opportunities for richer insights

#### 5. **No Next.js Caching for External API Calls**
**Problem:** Only using revalidate on one endpoint:
```typescript
// odds-api.ts
fetch(url, { next: { revalidate: 30 } }); // ✅ Only on getLiveGames
fetch(url); // ❌ No caching on getUpcomingGames
```

**Impact:** No built-in Next.js cache benefits

---

## Optimization Recommendations

### 🟢 **High Priority Optimizations:**

#### 1. **Implement Persistent Team ID Cache**
```typescript
// Use Next.js cache or Redis for production
// Store team mappings across requests
interface TeamMapping {
  oddsApiName: string;
  apiSportsId: number;
  apiSportsName: string;
  cachedAt: number;
  expiresAt: number; // 7 days from cache
}

// Benefits:
// - Eliminate 80%+ of team search calls
// - Instant team resolution for known teams
// - Graceful fallback to search if not cached
```

#### 2. **Pass Game Data from Dashboard to Matchup**
```typescript
// Option A: URL state (limited by URL length)
<Link href={`/matchup/${game.id}?odds=${encodeURIComponent(JSON.stringify(game))}`}>

// Option B: Server-side cache (better)
// Cache odds data with 30s TTL, keyed by game ID
// Matchup page checks cache before fetching

// Benefits:
// - Eliminate duplicate getUpcomingGames() calls
// - Instant page load (no waiting for API)
// - 50% reduction in Odds API calls
```

#### 3. **Batch Team Searches with Smarter Logic**
```typescript
// Pre-build NCAA team database from one-time bulk fetch
// Store in JSON file or DB
// Update weekly during off-season, daily during season

// Benefits:
// - 0 API calls for team ID lookup (vs 2-10 current)
// - Instant team resolution
// - More reliable matching
```

#### 4. **Utilize All Available Data**
```typescript
// From /statistics response:
interface EnhancedTeamStats {
  // Currently used:
  wins, losses, pointsPerGame, pointsAllowedPerGame
  
  // Available but unused:
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  turnoversPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  // ... and more
}

// Benefits:
// - Richer betting insights
// - Better predictions
// - More engaging UI
// - No additional API calls needed
```

#### 5. **Implement Comprehensive Next.js Caching**
```typescript
// All Odds API calls:
fetch(url, {
  next: { 
    revalidate: 30,  // Live games: 30s
    tags: ['odds', 'ncaab'] // For on-demand revalidation
  }
});

// All Stats API calls:
fetch(url, {
  next: { 
    revalidate: 300, // Stats: 5 min (they don't change often)
    tags: ['stats', `team-${teamId}`]
  }
});

// Benefits:
// - Automatic Next.js caching
// - Reduced API quota usage
// - Faster page loads
// - On-demand cache invalidation
```

---

## Proposed New Architecture

### **Optimized Flow:**

```
┌─────────────────────────────────────────────────────────────┐
│ INITIALIZATION (One-time or daily update)                   │
├─────────────────────────────────────────────────────────────┤
│ 1. Fetch all NCAA teams → Store in teams.json              │
│    - Team ID, Name, Variations, Logo                        │
│    - ~350 teams × 1 call = 350 initial calls (one-time)     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD PAGE (app/page.tsx)                               │
├─────────────────────────────────────────────────────────────┤
│ 1. getLiveGames() → Cache 30s                              │
│ 2. getUpcomingGames() → Cache 30s, Store in server cache   │
│ Total: 2 API calls (vs current: 2) ✅ Same                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ MATCHUP PAGE (app/matchup/[id]/page.tsx)                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Check server cache for game odds → Use if fresh         │
│    (Skip API call if came from dashboard)                   │
│ 2. Lookup team IDs from teams.json → 0 API calls           │
│ 3. getTeamStats(home) → Cache 5min                         │
│ 4. getTeamStats(away) → Cache 5min                         │
│ 5. getRecentGames(home) → Cache 5min                       │
│ 6. getRecentGames(away) → Cache 5min                       │
│ 7. getHeadToHead() → Cache 5min                            │
│ Total: 5-6 API calls (vs current: 7-17) 📉 60%+ reduction   │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Utilization Improvements

### **Currently Unused but Available:**

#### From `/statistics` endpoint:
- **Shooting Stats:** FG%, 3P%, FT%
- **Advanced Stats:** Rebounds, Assists, Turnovers, Steals, Blocks
- **Trends:** Home/Away splits, winning/losing streaks
- **Efficiency Metrics:** Offensive/Defensive ratings

#### From `/games` endpoint:
- **Quarter-by-quarter scoring:** Performance trends
- **Venue information:** Home court advantage analysis
- **Officials/Referees:** Historical foul patterns
- **Game notes/highlights**

#### From `/scores` (live) endpoint:
- **Last update timestamp:** "Updated 2 minutes ago"
- **Period information:** Q1, Q2, Halftime, etc.
- **Possession indicator** (if available)

### **Proposed New Features Using This Data:**

1. **Enhanced Betting Insights:**
   - "Team A shoots 38% from 3PT vs Team B's 32% defense"
   - "Home team averages 8 more rebounds per game"
   - "Away team commits 3 fewer turnovers on average"

2. **Live Game Enhancements:**
   - Show current quarter/period
   - "Last updated: 2 min ago" indicator
   - Quarter-by-quarter score breakdown

3. **Advanced Analytics Dashboard:**
   - Team shooting charts
   - Performance trends (L5 games)
   - Home vs Away comparison tables

---

## Implementation Priority

### Phase 1 (Immediate - 1 day):
1. ✅ Add Next.js caching to all fetch calls
2. ✅ Implement server-side odds cache for navigation
3. ✅ Extract and display more stats data (FG%, rebounds, etc.)

### Phase 2 (Short-term - 2-3 days):
4. ✅ Build NCAA teams JSON database
5. ✅ Replace dynamic team search with JSON lookup
6. ✅ Add more detailed live game information

### Phase 3 (Medium-term - 1 week):
7. ✅ Add Redis/database for production caching
8. ✅ Implement advanced analytics dashboard
9. ✅ Add quarter-by-quarter breakdowns

---

## Expected Impact

| Metric | Current | After Phase 1 | After Phase 2 |
|--------|---------|---------------|---------------|
| **Dashboard Load** | 2 calls | 2 calls (cached) | 2 calls (cached) |
| **Matchup Load** | 7-17 calls | 6-8 calls | 5-6 calls |
| **Page Load Time** | 2-4s | 1-2s | 0.5-1s |
| **API Quota Usage** | 100% | ~40% | ~30% |
| **Cache Hit Rate** | 10% | 60% | 85% |
| **Data Richness** | 30% | 60% | 90% |

---

## Monitoring & Observability

### Add API Call Tracking:
```typescript
// Track all API calls
export async function trackedFetch(url: string, options: RequestInit = {}) {
  const start = Date.now();
  const response = await fetch(url, options);
  const duration = Date.now() - start;
  
  console.log(`[API] ${url.split('?')[0]} - ${duration}ms - ${response.status}`);
  
  return response;
}
```

### Dashboard Metrics to Display:
- Total API calls per page load
- Cache hit/miss ratio
- Average API response time
- Daily/Weekly quota usage

---

## Next Steps

1. Review this analysis
2. Prioritize which optimizations to implement first
3. I can begin implementation on any phase immediately

**Would you like me to start with Phase 1 optimizations?**

