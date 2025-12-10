# Team Matching Flow - Detailed Breakdown

## The Problem

**Odds API returns:** "Notre Dame Fighting Irish"  
**Database has:** "Notre Dame"  
**Result:** ❌ No match!

---

## Current Flow

### **Step 1: Odds API provides game data**

```typescript
// In lib/odds-api.ts - getUpcomingGames()
const data = await fetch(THE_ODDS_API_URL);
// Returns:
{
  id: "abc123",
  home_team: "Notre Dame Fighting Irish",  // ← Full name with mascot
  away_team: "Idaho Vandals",               // ← Full name with mascot
  ...
}
```

### **Step 2: Matchup page tries to find team IDs**

```typescript
// In app/matchup/[id]/page.tsx
const game = await getGameOdds(gameId);

// Search for team IDs by name
const [homeTeamId, awayTeamId] = await Promise.all([
  searchTeamByName(game.home_team),  // "Notre Dame Fighting Irish"
  searchTeamByName(game.away_team),  // "Idaho Vandals"
]);
```

### **Step 3: searchTeamByName() in lib/stats-api-new.ts**

```typescript
export async function searchTeamByName(teamName: string) {
  // 1. Check cache
  const cached = teamMappingCache.get(teamName);
  if (cached) return cached.id;
  
  // 2. Check database
  const dbTeam = getNCAATeamFromDatabase(teamName);
  //     ↓ THIS IS WHERE IT FAILS
  //     Looking for "Notre Dame Fighting Irish"
  //     But database has "Notre Dame"
  
  if (dbTeam) return dbTeam.id;
  
  // 3. Fallback to API search
  // ... API search code
}
```

### **Step 4: getNCAATeamFromDatabase() in lib/teams-database.ts**

```typescript
export function getNCAATeamFromDatabase(teamName: string) {
  const teams = require('@/data/ncaa-teams.json').teams;
  
  const normalized = teamName.toLowerCase().trim();
  
  // Try exact match
  let team = teams.find(t => t.name.toLowerCase() === normalized);
  
  // Try variations
  if (!team) {
    team = teams.find(t => 
      t.searchVariations?.some(v => v === normalized)
    );
  }
  
  // ❌ FAILS because:
  // normalized = "notre dame fighting irish"
  // database has: name="Notre Dame", variations=["notre dame", "notre", "dame"]
  // No match!
  
  return team || null;
}
```

---

## The Issue

**Mascot names are not being stripped or matched:**

| Odds API Name | Database Name | Match? |
|---------------|---------------|--------|
| "Notre Dame Fighting Irish" | "Notre Dame" | ❌ No |
| "Wisconsin Badgers" | "Wisconsin" | ❌ No |
| "Idaho Vandals" | "Idaho" | ❌ No |
| "Duke Blue Devils" | "Duke" | ❌ No |

---

## The Solution

We need to:
1. **Strip mascot names** from Odds API names before searching
2. **Improve fuzzy matching** to handle variations
3. **Add mascot names** to database variations

### Common NCAA Mascots to Strip:
- Wildcats, Tigers, Eagles, Bulldogs, Bears, Panthers, Lions
- Trojans, Spartans, Bruins, Huskies, Cougars, Falcons
- Cardinals, Rams, Knights, Warriors, Rebels, Pirates
- Blue Devils, Fighting Irish, Crimson Tide, Volunteers
- Badgers, Cornhuskers, Hawkeyes, Buckeyes, Wolverines
- And ~100 more...

---

## Implementation Plan

### Fix 1: Smart Name Normalization
```typescript
function normalizeTeamName(name: string): string {
  // Remove common mascots
  const mascots = [
    'wildcats', 'tigers', 'eagles', 'bulldogs', 'bears',
    'fighting irish', 'blue devils', 'crimson tide',
    'badgers', 'vandals', 'wolverines', 'buckeyes',
    // ... etc
  ];
  
  let normalized = name.toLowerCase().trim();
  
  for (const mascot of mascots) {
    normalized = normalized.replace(mascot, '').trim();
  }
  
  return normalized;
}
```

### Fix 2: Fuzzy Matching
```typescript
function fuzzyMatch(oddsApiName: string, dbTeam: any): boolean {
  const normalized = normalizeTeamName(oddsApiName);
  const words = normalized.split(' ').filter(w => w.length > 2);
  
  // Check if main team name words are in database name
  const dbName = dbTeam.name.toLowerCase();
  return words.every(word => dbName.includes(word));
}
```

---

## Example After Fix

**Input:** "Notre Dame Fighting Irish"

1. Normalize: "notre dame" (strip "fighting irish")
2. Search database for "notre dame"
3. ✅ Match found: Notre Dame (ID: 2055)

**Input:** "Wisconsin Badgers"

1. Normalize: "wisconsin" (strip "badgers")
2. Search database for "wisconsin"  
3. ✅ Match found: Wisconsin (ID: 2214)

