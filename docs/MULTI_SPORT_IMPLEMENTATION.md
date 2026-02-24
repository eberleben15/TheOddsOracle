# Multi-Sport Implementation Guide

## Overview

The application now supports multiple sports: **NBA, NFL, NHL, MLB, and CBB (College Basketball)**. CBB, NBA, NHL, and MLB use **ESPN** (free) for team stats and recent games. NFL uses SportsData.io when `SPORTSDATA_API_KEY` is set.

## Architecture

### Sport Configuration (`lib/sports/sport-config.ts`)
- Central configuration for all sports
- Defines base URLs, season calculation, and The Odds API mappings
- Each sport has its own configuration

### Base Client (`lib/sports/base-sportsdata-client.ts`)
- Shared functionality for all SportsData.io API calls
- Handles authentication, error handling, and common operations
- Provides base methods like `getTeams()` and `findTeamByName()`

### Sport-Specific Clients
- `lib/sports/nba-api.ts` - NBA implementation
- `lib/sports/nfl-api.ts` - NFL implementation
- `lib/sports/nhl-api.ts` - NHL implementation
- `lib/sports/mlb-api.ts` - MLB implementation (ESPN only)
- `lib/sports/cbb-api-wrapper.ts` - Wraps existing CBB implementation

### Unified API (`lib/sports/unified-sports-api.ts`)
- Single interface to access any sport
- Functions: `getTeamSeasonStats()`, `getRecentGames()`, `findTeamByName()`
- Automatically routes to the correct sport-specific client

## Usage

### Getting Team Stats

```typescript
import { getTeamSeasonStats } from "@/lib/sports/unified-sports-api";
import { Sport } from "@/lib/sports/sport-config";

const stats = await getTeamSeasonStats("nba", "Lakers");
```

### Finding Teams

```typescript
import { findTeamByName } from "@/lib/sports/unified-sports-api";

const team = await findTeamByName("nfl", "Kansas City Chiefs");
```

### Getting Recent Games

```typescript
import { getRecentGames } from "@/lib/sports/unified-sports-api";

const games = await getRecentGames("nhl", "Boston Bruins", 5);
```

### Sport Detection

```typescript
import { getSportFromGame } from "@/lib/sports/sport-detection";

const sport = getSportFromGame(oddsGame); // Detects from sport_key
```

## Dashboard Integration

The dashboard now supports sport selection via URL parameter:
- `/dashboard?sport=nba` - NBA games
- `/dashboard?sport=nfl` - NFL games
- `/dashboard?sport=nhl` - NHL games
- `/dashboard?sport=mlb` - MLB games
- `/dashboard?sport=cbb` - College Basketball (default)

The `SportSelector` component allows users to switch between sports.

## Matchup Pages

Matchup pages automatically detect the sport from the game's `sport_key` and use the appropriate API client.

## Sport-Specific Considerations

### NBA
- Season: October - June (ending year)
- Scoring: Points per game (80-130 range)
- Stats: PointsPerGame, OpponentPointsPerGame

### NFL
- Season: September - February (starting year)
- Scoring: Points per game (10-40 range)
- Stats: PointsPerGame, OpponentPointsPerGame

### NHL
- Season: October - June (ending year)
- Scoring: Goals per game (2-5 range)
- Stats: GoalsPerGame, GoalsAgainstPerGame

### MLB
- **Data source:** ESPN only (no SportsData). Implemented in `lib/sports/mlb-api.ts` and `lib/api-clients/espn-sport-client.ts`.
- Season: March - October (starting year)
- Scoring: Runs per game (3-7 range)
- Stats: Runs per game (R/G), Runs allowed per game (RA/G), mapped to the shared TeamStats `pointsPerGame` / `pointsAllowedPerGame`.
- Prediction: Run-based model (`predictMLBMatchup` in `lib/advanced-analytics.ts`) using run differential, momentum, and home field advantage. No Four Factors (basketball-only).

### CBB (College Basketball)
- Season: November - April (ending year)
- Scoring: Points per game (50-105 range)
- Stats: PointsPerGame, OpponentPointsPerGame
- Special: Has head-to-head history support

## API Endpoints

**ESPN (CBB, NBA, NHL, MLB):** Team stats and recent games come from ESPN’s public site API (e.g. `https://site.web.api.espn.com/apis/site/v2/sports/baseball/mlb` for MLB). No API key required.

**SportsData.io (NFL, optional for others):** When `SPORTSDATA_API_KEY` is set, the app can use SportsData.io:
- Base URL: `https://api.sportsdata.io/v3/{sport}`
- Teams: `/Teams`
- Team Stats: `/stats/json/TeamSeasonStats/{season}`
- Games: `/scores/json/TeamGameStatsBySeason/{season}/{teamId}`

## The Odds API Integration

Each sport maps to a The Odds API sport key:
- CBB: `basketball_ncaab`
- NBA: `basketball_nba`
- NFL: `americanfootball_nfl`
- NHL: `icehockey_nhl`
- MLB: `baseball_mlb`

## Future Enhancements

1. **Head-to-Head History**: Currently only CBB has H2H. Add for other sports if needed.
2. **Sport-Specific Analytics**: NHL and MLB have dedicated prediction models (`predictNHLMatchup`, `predictMLBMatchup`). Others use the shared model (Four Factors when available, else efficiency fallback).
3. **Season Handling**: Some sports have playoffs/regular season distinctions.
4. **Injury Data**: Add player-level data for better predictions.
5. **Advanced Stats**: Sport-specific advanced metrics (e.g., QB rating for NFL).

