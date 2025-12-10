/**
 * NCAA Teams Lookup Utility (Phase 2)
 * 
 * Fast team ID resolution using:
 * 1. Pre-built JSON database (if available) - 0 API calls
 * 2. In-memory cache (from previous lookups) - 0 API calls
 * 3. API search with smart caching (fallback) - 1-3 API calls
 */

import { teamMappingCache } from "./team-mapping";
import * as fs from 'fs';
import * as path from 'path';

interface TeamDatabaseEntry {
  id: number;
  name: string;
  code: string;
  logo: string;
  country: string;
  searchVariations: string[];
}

interface TeamsDatabase {
  version: string;
  buildDate: string;
  totalTeams: number;
  teams: TeamDatabaseEntry[];
  nameIndex: { [normalizedName: string]: number };
}

let teamsDatabase: TeamsDatabase | null = null;
let databaseLoadAttempted = false;

/**
 * Load the teams database (lazy loaded on first use)
 */
function loadTeamsDatabase(): TeamsDatabase | null {
  if (databaseLoadAttempted) {
    return teamsDatabase;
  }
  
  databaseLoadAttempted = true;
  
  try {
    const dbPath = path.join(process.cwd(), 'data', 'ncaa-teams.json');
    
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf-8');
      teamsDatabase = JSON.parse(data);
      console.log(`[TEAMS DB] Loaded ${teamsDatabase?.totalTeams} teams from database`);
      return teamsDatabase;
    } else {
      console.log(`[TEAMS DB] No database found at ${dbPath} - will use API fallback`);
      return null;
    }
  } catch (error) {
    console.error(`[TEAMS DB] Error loading database:`, error);
    return null;
  }
}

/**
 * Common NCAA mascots to strip from team names
 */
const COMMON_MASCOTS = [
  'aggies', 'aztecs', 'badgers', 'bearcats', 'bears', 'beavers', 'bengals',
  'big red', 'black bears', 'blue devils', 'blue jays', 'bobcats', 'boilermakers',
  'broncos', 'bruins', 'buccaneers', 'buckeyes', 'buffaloes', 'bulldogs', 'bulls',
  'cardinal', 'cardinals', 'catamounts', 'cavaliers', 'chanticleers', 'chippewas',
  'colonials', 'commodores', 'cougars', 'cowboys', 'crimson', 'crimson tide',
  'crusaders', 'cyclones', 'demons', 'demon deacons', 'ducks', 'dukes',
  'eagles', 'explorers', 'falcons', 'fighting irish', 'friars',
  'gators', 'golden bears', 'golden eagles', 'golden flashes', 'golden gophers',
  'green wave', 'grizzlies', 'herd', 'highlanders', 'hokies', 'hoosiers',
  'hornets', 'horned frogs', 'huskies', 'hurricanes',
  'illini', 'fighting illini', 'jaguars', 'jayhawks', 'knights',
  'lakers', 'lancers', 'lobos', 'longhorns', 'lumberjacks',
  'matadors', 'mavericks', 'midshipmen', 'miners', 'minutemen', 'monarchs',
  'mountaineers', 'musketeers', 'mustangs',
  'nittany lions', 'orange', 'orangemen', 'owls',
  'panthers', 'patriots', 'peacocks', 'penguins', 'pirates', 'pioneers',
  'polar bears', 'quakers',
  'ragin cajuns', 'raiders', 'rams', 'ramblers', 'razorbacks', 'rebels',
  'red flash', 'red foxes', 'red raiders', 'red storm', 'redbirds', 'redhawks',
  'river hawks', 'roadrunners', 'rockets', 'running rebels',
  'salukis', 'scarlet knights', 'seawolves', 'seminoles', 'shockers',
  'sooners', 'spartans', 'spiders', 'stags', 'sun devils',
  'tar heels', 'terrapins', 'terriers', 'thundering herd', 'tigers', 'titans',
  'trojans', 'utes',
  'vandals', 'vikings', 'volunteers',
  'warriors', 'wildcats', 'wolverines', 'wolfpack',
  'yellow jackets', 'zips'
];

/**
 * Normalize team name for matching - strips mascots and punctuation
 */
export function normalizeTeamName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
  
  // Strip common mascots
  for (const mascot of COMMON_MASCOTS) {
    // Remove mascot if it's at the end
    const mascotPattern = new RegExp(`\\s+${mascot}$`, 'i');
    normalized = normalized.replace(mascotPattern, '').trim();
  }
  
  return normalized;
}

/**
 * Generate search terms from a team name
 * Returns array ordered by match likelihood
 */
export function generateSearchTerms(name: string): string[] {
  const terms: string[] = [];
  const normalized = normalizeTeamName(name);
  
  // Original normalized name (highest priority)
  terms.push(normalized);
  
  const words = name.split(' ');
  
  // Just the first word (e.g., "Duke" from "Duke Blue Devils")
  if (words.length > 0) {
    terms.push(normalizeTeamName(words[0]));
  }
  
  // Without last word (mascot) - e.g., "BYU" from "BYU Cougars"
  if (words.length > 1) {
    terms.push(normalizeTeamName(words.slice(0, -1).join(' ')));
  }
  
  // Common variations
  const variations: { [key: string]: string } = {
    'brigham young': 'byu',
    'louisiana state': 'lsu',
    'southern california': 'usc',
    'texas christian': 'tcu',
    'southern methodist': 'smu',
    'university of california': 'california',
  };
  
  Object.entries(variations).forEach(([full, short]) => {
    if (normalized.includes(full)) {
      terms.push(normalizeTeamName(short));
    }
  });
  
  // Remove duplicates while preserving order
  return [...new Set(terms)];
}

/**
 * Look up team ID from database (instant, 0 API calls)
 * Now with mascot-aware matching!
 */
export function lookupTeamInDatabase(teamName: string): number | null {
  const db = loadTeamsDatabase();
  if (!db || !db.teams) {
    return null;
  }
  
  console.log(`\n[TEAMS DB] 🔍 Searching for "${teamName}"`);
  
  const searchTerms = generateSearchTerms(teamName);
  console.log(`[TEAMS DB]    Search terms: ${searchTerms.join(', ')}`);
  
  for (const term of searchTerms) {
    let team: TeamDatabaseEntry | null = null;
    
    // Strategy 1: Exact match on normalized name
    team = db.teams.find(t => normalizeTeamName(t.name) === term) || null;
    
    // Strategy 2: Exact match on search variations
    if (!team) {
      team = db.teams.find(t => 
        t.searchVariations?.some(v => normalizeTeamName(v) === term)
      ) || null;
    }
    
    // Strategy 3: For single-word terms, match as complete word and prefer shortest
    // This ensures "michigan" matches "Michigan" not "Central Michigan"
    if (!team && term.split(' ').length === 1) {
      const candidates = db.teams.filter(t => {
        const words = normalizeTeamName(t.name).split(' ');
        return words.includes(term); // Must be a complete word
      });
      
      if (candidates.length > 0) {
        // Sort by name length (shortest first) to prefer "Michigan" over "Central Michigan"
        candidates.sort((a, b) => a.name.length - b.name.length);
        team = candidates[0];
      }
    }
    
    if (team) {
      console.log(`[TEAMS DB] ✅ FOUND: "${teamName}" -> "${team.name}" (ID: ${team.id})`);
      console.log(`[TEAMS DB]    Matched via: "${term}"\n`);
      
      // Cache this successful lookup
      teamMappingCache.set(teamName, {
        apiSportsId: team.id,
        apiSportsName: team.name,
        confidence: "exact",
        oddsApiName: teamName,
        cachedAt: Date.now(),
      });
      
      return team.id;
    }
  }
  
  console.log(`[TEAMS DB] ❌ NOT FOUND: "${teamName}"`);
  console.log(`[TEAMS DB]    Will fall back to API search\n`);
  return null;
}

/**
 * Get team info from database
 */
export function getTeamInfo(teamId: number): TeamDatabaseEntry | null {
  const db = loadTeamsDatabase();
  if (!db) {
    return null;
  }
  
  return db.teams.find(t => t.id === teamId) || null;
}

/**
 * Get database statistics
 */
export function getDatabaseStats(): {
  loaded: boolean;
  totalTeams: number;
  version: string;
  buildDate: string;
} | null {
  const db = loadTeamsDatabase();
  if (!db) {
    return null;
  }
  
  return {
    loaded: true,
    totalTeams: db.totalTeams,
    version: db.version,
    buildDate: db.buildDate,
  };
}

