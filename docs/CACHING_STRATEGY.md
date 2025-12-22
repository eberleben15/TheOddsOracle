# Caching Strategy for Recommended Bets

## Overview

To optimize API calls and improve performance, we've implemented a multi-layer caching strategy for recommended bets calculation.

## Cache Layers

### 1. Recommended Bets Cache (`lib/recommended-bets-cache.ts`)
- **Purpose**: Cache the final recommended bets list per sport
- **TTL**: 5 minutes
- **Scope**: Per sport (CBB, NBA, NFL, NHL, MLB)
- **Benefits**: 
  - Avoids recalculating bets on every page load
  - Reduces computation time
  - Limits API calls to SportsData.io and The Odds API

**Usage:**
```typescript
// Check cache first
const cached = recommendedBetsCache.get(sport);
if (cached) return cached;

// Calculate and cache
const bets = await calculateRecommendedBets(sport);
recommendedBetsCache.set(sport, bets);
```

### 2. Team Stats Cache (`lib/team-stats-cache.ts`)
- **Purpose**: Cache team season statistics
- **TTL**: 10 minutes
- **Scope**: Per sport and team name
- **Benefits**:
  - Team stats don't change frequently during a day
  - Reduces SportsData.io API calls significantly
  - Same team stats can be reused across multiple games

**Usage:**
```typescript
// Check cache first
let stats = teamStatsCache.get(sport, teamName);
if (!stats) {
  stats = await getTeamSeasonStats(sport, teamName);
  if (stats) teamStatsCache.set(sport, teamName, stats);
}
```

### 3. Team Lookup Cache (`lib/team-lookup-cache.ts`)
- **Purpose**: Cache team name to SportsData.io team mapping
- **TTL**: 1 hour
- **Scope**: Per sport and team name
- **Benefits**:
  - Teams don't change frequently
  - Avoids fetching full teams list repeatedly
  - Speeds up team name resolution

**Usage:**
```typescript
// Check cache first
const cached = teamLookupCache.get(sport, teamName);
if (cached) return cached;

// Lookup and cache
const team = await findTeamByName(sport, teamName);
if (team) teamLookupCache.set(sport, teamName, team);
```

### 4. Teams List Cache (in `BaseSportsDataClient`)
- **Purpose**: Cache the full teams list per sport
- **TTL**: 1 hour
- **Scope**: Per sport client instance
- **Benefits**:
  - The teams list is large and rarely changes
  - Avoids fetching it for every team lookup

## API Call Reduction

### Before Caching:
For calculating recommended bets for 20 games:
- 20 games × 2 teams = 40 team lookups
- 40 team lookups × 1 teams list fetch = 40 teams list API calls
- 40 team stats API calls
- **Total: ~80+ API calls per page load**

### After Caching:
First page load (cache miss):
- Same as before: ~80+ API calls
- Results are cached

Subsequent page loads (cache hit):
- 0 API calls (all from cache)
- **Total: 0 API calls per page load**

After 5 minutes (recommended bets cache expires):
- Only need to recalculate bets
- Team stats and lookups still cached
- **Total: ~20 API calls (only for new games)**

## Cache Invalidation

Caches automatically expire based on TTL:
- **Recommended Bets**: 5 minutes (bets change as odds update)
- **Team Stats**: 10 minutes (stats update periodically)
- **Team Lookups**: 1 hour (teams rarely change)
- **Teams List**: 1 hour (teams list rarely changes)

Manual cache clearing is available:
```typescript
// Clear all recommended bets
recommendedBetsCache.clear();

// Clear for specific sport
recommendedBetsCache.clear('nba');

// Clear team stats
teamStatsCache.clear('nba', 'Lakers');
```

## Next.js Caching

The API route also uses Next.js caching:
- `revalidate = 300` (5 minutes) - matches recommended bets cache TTL
- HTTP cache headers for CDN/browser caching
- Stale-while-revalidate for better UX

## Performance Impact

**Expected improvements:**
- **First load**: Same performance (cache miss)
- **Subsequent loads**: ~95% faster (cache hit)
- **API calls**: Reduced by ~95% after first load
- **User experience**: Instant loading after cache warmup

## Monitoring

Cache statistics are available:
```typescript
recommendedBetsCache.getStats();
teamStatsCache.getStats();
teamLookupCache.getStats();
```

## Future Enhancements

1. **Database Persistence**: Store cache in database for cross-server sharing
2. **Background Pre-calculation**: Cron job to pre-calculate bets
3. **Smart Invalidation**: Invalidate cache when odds change significantly
4. **Cache Warming**: Pre-populate cache on server startup

