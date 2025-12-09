# Team Mapping System

## Overview

This system maps team names from **The Odds API** (e.g., "Michigan Wolverines") to **API-Sports.io** team IDs (e.g., 2187). Since team names vary between APIs, we maintain a direct mapping file.

## Files

- `lib/team-mappings-comprehensive.json` - Main mapping file (add teams here)
- `lib/team-mappings.json` - Override file for specific corrections
- `scripts/discover-team-ids.ts` - Helper script to find team IDs

## How to Add a Team Mapping

### Option 1: Use the Discovery Script (Recommended)

```bash
npx tsx scripts/discover-team-ids.ts "Michigan Wolverines"
```

This will:
1. Search the API for the team
2. Filter to USA men's teams only
3. Show you the correct team ID
4. Optionally add it to the mapping file with `--add` flag

### Option 2: Manual Entry

1. Find the team ID from API-Sports.io (search at https://www.api-sports.io/basketball)
2. Add to `lib/team-mappings-comprehensive.json`:

```json
{
  "mappings": {
    "Team Name from Odds API": {
      "id": 1234,
      "name": "Team Name in API-Sports.io"
    }
  }
}
```

## Priority Order

1. **Manual mappings** (`team-mappings.json`) - Highest priority, for corrections
2. **Comprehensive mappings** (`team-mappings-comprehensive.json`) - Main mapping file
3. **API search** - Falls back to searching API if not in mappings

## Why This Approach?

- **Reliability**: Direct mappings are 100% accurate
- **Performance**: No API calls needed for mapped teams
- **Maintainability**: Easy to add new teams as you discover them
- **Fallback**: Still searches API for unmapped teams

## Building the Mapping

As you encounter new teams:
1. Run the discovery script to find the ID
2. Add to `team-mappings-comprehensive.json`
3. The system will use it automatically

## Future Enhancements

- Could use LLM to standardize team names automatically
- Could build mapping from historical game data
- Could scrape team lists from both APIs

