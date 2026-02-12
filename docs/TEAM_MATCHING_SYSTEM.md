# Team Matching System

## Overview

The team matching system ensures accurate assignment of betting odds to teams by using multiple matching strategies, validation, and fallback mechanisms.

## Architecture

### Core Components

1. **`team-matcher.ts`** - Main matching logic with multiple strategies
2. **`team-match-debugger.ts`** - Debugging and validation tools
3. **`team-match-overrides.ts`** - Manual overrides for known issues
4. **`odds-standardization.ts`** - Odds validation utilities

## Matching Strategies (in order)

### 1. Exact Name Matching (High Confidence)
- Matches team names exactly (case-insensitive)
- Checks substring matches
- Handles common variations

### 2. Fuzzy Matching (Medium-High Confidence)
- Uses Levenshtein distance algorithm
- 70% similarity threshold
- Handles typos and variations

### 3. Position-Based Fallback (Low Confidence)
- Uses outcome order (first = away, second = home)
- Only used when name matching fails
- Generates warnings

### 4. Odds Validation (Confidence Boost)
- Validates odds make logical sense
- Detects potential reversals
- Uses favorite/underdog logic

### 5. Manual Overrides (Highest Priority)
- Explicit mappings for known issues
- Applied before any automatic matching
- Highest confidence level

## Team Name Normalization

The system generates multiple variations for each team name:

- Full name (lowercase)
- First word
- Last word
- First two words
- Without common suffixes (University, College, State, etc.)
- Abbreviation expansions (UCLA → Los Angeles, California Los Angeles)
- UC prefix handling (UC Riverside → University of California Riverside)

## Validation & Detection

### Odds Validation
- Checks odds are >= 1.0
- Validates implied probabilities sum correctly (accounting for vig)
- Detects invalid odds

### Reversal Detection
- Flags when:
  - Low confidence match
  - High odds ratio (> 5:1)
  - Position-based matching used
- Generates warnings for manual review

## Usage

### Automatic Matching (Default)
```typescript
import { parseOdds } from "@/lib/odds-utils";

const parsedOdds = parseOdds(game);
// Returns ParsedOdds[] with matchQuality metadata
```

### Debugging a Specific Game
```typescript
import { debugTeamMatching } from "@/lib/team-match-debugger";

const debugInfo = debugTeamMatching(game);
// Returns detailed match information and recommendations
```

### API Endpoint
```
GET /api/debug-team-match?gameId=<game-id>
```

Returns:
- Match confidence and method
- Validation results
- Warnings and recommendations
- Outcome assignments

## Adding Manual Overrides

Edit `lib/team-match-overrides.ts`:

```typescript
export const TEAM_MATCH_OVERRIDES: TeamMatchOverride[] = [
  {
    awayTeamPattern: /uc riverside/i,
    homeTeamPattern: /ucla/i,
    awayOutcomeIndex: 0,
    homeOutcomeIndex: 1,
    reason: "UCLA odds were being assigned to UC Riverside"
  },
];
```

## Monitoring & Debugging

### Development Mode
- Automatically logs warnings for low-confidence matches
- Shows odds validation failures
- Displays potential reversals

### Production
- Warnings are suppressed
- Only critical errors logged
- Overrides applied silently

## Best Practices

1. **Monitor Low Confidence Matches**
   - Check logs for games with `confidence: 'low'`
   - Review `method: 'position'` matches
   - Add overrides for recurring issues

2. **Validate Odds Make Sense**
   - Favorites should have lower decimal odds
   - Check for impossible odds (< 1.0)
   - Verify implied probabilities

3. **Use Debug Endpoint**
   - Test problematic games
   - Review recommendations
   - Add overrides as needed

4. **Expand Team Name Variations**
   - Add common abbreviations to `normalizeTeamName`
   - Include mascot names
   - Handle regional variations

## Example: Debugging UCLA vs UC Riverside

```bash
curl "http://localhost:3000/api/debug-team-match?gameId=5873e473fcc36c25bce05211c00867b6"
```

Response will show:
- Which outcomes were matched to which teams
- Confidence level and method used
- Any warnings about potential reversals
- Recommendations for fixes

## Future Improvements

1. **Machine Learning**
   - Train model on historical matches
   - Learn common patterns
   - Auto-suggest overrides

2. **Team Alias Database**
   - Centralized team name database
   - Cross-reference multiple sources
   - Community-contributed mappings

3. **Real-time Monitoring**
   - Alert on low-confidence matches
   - Track match quality metrics
   - Auto-generate override suggestions

