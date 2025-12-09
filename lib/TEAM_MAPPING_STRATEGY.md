# Team Mapping Strategy

## Overview

We use a **multi-layered approach** to handle team name mapping between The Odds API and API-Sports.io:

1. **Manual Mappings** (Highest Priority) - Known, verified team IDs
2. **Auto-Cached Mappings** - Successful API searches are cached
3. **Smart API Search** - Improved matching algorithm for unmapped teams
4. **Bulk Discovery** - Script to discover many teams at once

## Current System

### 1. Manual Mappings (`lib/team-mappings-comprehensive.json`)

- **Purpose**: Store verified, correct team IDs
- **Priority**: Highest - checked first, never overwritten
- **Maintenance**: Add teams as you discover them
- **Usage**: Loaded automatically on server start

### 2. Auto-Caching (`lib/team-mapping.ts`)

- **Purpose**: Cache successful API searches to avoid repeated calls
- **How it works**: When `searchTeamByName()` finds a team via API, it stores the mapping
- **Lifetime**: Persists for the server session (in-memory)
- **Future**: Could be persisted to file/database

### 3. Smart API Search (`lib/stats-api.ts`)

- **Purpose**: Find teams not in manual mappings
- **Strategy**: 
  1. Check cache first
  2. Try normalized name variations
  3. Prioritize USA men's teams
  4. Use exact match > starts with > contains logic
  5. Cache successful matches

### 4. Bulk Discovery Script (`scripts/bulk-discover-teams.ts`)

- **Purpose**: Discover many teams at once
- **Usage**: `npx tsx scripts/bulk-discover-teams.ts "Team 1" "Team 2" ... --add`
- **Output**: Shows matches and optionally adds to mapping file

## Handling Unmapped Teams

### Option A: Build Mapping Over Time (Recommended)

1. **As you encounter teams**: Use `scripts/discover-team-ids.ts` to find IDs
2. **Add to mapping**: Use `--add` flag or manually edit `team-mappings-comprehensive.json`
3. **Gradually build**: The mapping file grows as you use the app

**Pros**: 
- Most reliable
- No false matches
- You control quality

**Cons**: 
- Requires manual work initially
- Takes time to build

### Option B: Bulk Discovery

1. **Get team list**: Extract all team names from The Odds API
2. **Run bulk script**: `npx tsx scripts/bulk-discover-teams.ts ... --add`
3. **Review results**: Check for any incorrect matches
4. **Fix manually**: Update wrong mappings in the file

**Pros**: 
- Fast way to map many teams
- Good starting point

**Cons**: 
- May have some incorrect matches
- Requires review

### Option C: Improved Auto-Matching (Future)

Enhance the API search fallback to be smarter:

1. **Better normalization**: Extract school names more accurately
2. **Fuzzy matching**: Use string similarity (Levenshtein distance)
3. **Context awareness**: Use conference/region hints if available
4. **Confidence scoring**: Only use high-confidence matches, flag low-confidence for review

**Pros**: 
- Works automatically
- No manual mapping needed

**Cons**: 
- More complex
- May still have errors
- Requires testing

### Option D: Hybrid Approach (Best)

Combine all approaches:

1. **Start with bulk discovery** - Get initial mappings for common teams
2. **Review and fix** - Correct any wrong matches
3. **Auto-cache works** - Successful searches are cached automatically
4. **Manual additions** - Add teams as you encounter them
5. **Periodic updates** - Re-run bulk discovery for new teams

## Recommended Workflow

### Initial Setup

```bash
# 1. Get list of teams from The Odds API (or manually create list)
# 2. Run bulk discovery
npx tsx scripts/bulk-discover-teams.ts \
  "Duke Blue Devils" \
  "North Carolina Tar Heels" \
  "Kentucky Wildcats" \
  ... \
  --add

# 3. Review the mapping file
cat lib/team-mappings-comprehensive.json

# 4. Fix any incorrect mappings manually
```

### Ongoing Maintenance

```bash
# When you encounter a new unmapped team:
npx tsx scripts/discover-team-ids.ts "New Team Name" --add

# The system will:
# 1. Try manual mapping (not found)
# 2. Try cache (not found)
# 3. Search API (finds it)
# 4. Cache the result (for this session)
# 5. You add to manual mapping (for permanent storage)
```

## Future Enhancements

1. **Persistent Cache**: Save auto-cached mappings to file
2. **Admin UI**: Web interface to review/manage mappings
3. **LLM Integration**: Use LLM to standardize team names
4. **Team Database**: Maintain a canonical team database
5. **Auto-verification**: Check if cached mappings still work

## Current Status

- ✅ Manual mappings system
- ✅ Auto-caching system  
- ✅ Smart API search fallback
- ✅ Discovery scripts
- ⏳ Persistent cache (future)
- ⏳ Admin UI (future)
- ⏳ LLM integration (future)

