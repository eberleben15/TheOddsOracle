# Multi-Sport Implementation Guide

## Overview

The application now supports multiple sports: **NBA, NFL, NHL, MLB, and CBB (College Basketball)**. All sports use SportsData.io as the data source.

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
- `lib/sports/mlb-api.ts` - MLB implementation
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
- Season: March - October (starting year)
- Scoring: Runs per game (3-7 range)
- Stats: RunsPerGame, RunsAgainstPerGame

### CBB (College Basketball)
- Season: November - April (ending year)
- Scoring: Points per game (50-105 range)
- Stats: PointsPerGame, OpponentPointsPerGame
- Special: Has head-to-head history support

## API Endpoints

All sports use the same SportsData.io API structure:
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
2. **Sport-Specific Analytics**: Each sport may need different prediction models.
3. **Season Handling**: Some sports have playoffs/regular season distinctions.
4. **Injury Data**: Add player-level data for better predictions.
5. **Advanced Stats**: Sport-specific advanced metrics (e.g., QB rating for NFL).

