/**
 * NCAA Teams Database Builder
 * 
 * One-time script to fetch all NCAA basketball teams and build a JSON database.
 * This eliminates the need for dynamic team searches (2-10 API calls per matchup).
 * 
 * Run with: npm run build-teams-db
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

interface TeamEntry {
  id: number;
  name: string;
  code: string;
  logo: string;
  country: string;
  // Normalized search variations for matching
  searchVariations: string[];
  // Original Odds API name if known
  oddsApiName?: string;
}

interface TeamsDatabase {
  version: string;
  buildDate: string;
  totalTeams: number;
  teams: TeamEntry[];
  // Quick lookup index by normalized name
  nameIndex: { [normalizedName: string]: number }; // maps to team ID
}

/**
 * Normalize team name for matching
 */
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Generate search variations for a team name
 */
function generateSearchVariations(name: string): string[] {
  const variations = new Set<string>();
  
  // Add original normalized
  variations.add(normalizeTeamName(name));
  
  // Add without mascot (last word)
  const words = name.split(' ');
  if (words.length > 1) {
    variations.add(normalizeTeamName(words.slice(0, -1).join(' ')));
  }
  
  // Add first word only (e.g., "Duke")
  variations.add(normalizeTeamName(words[0]));
  
  // Add acronym if multiple words
  if (words.length > 1) {
    const acronym = words.map(w => w[0]).join('');
    variations.add(normalizeTeamName(acronym));
  }
  
  // Common abbreviations
  const abbrevMap: { [key: string]: string } = {
    'saint': 'st',
    'university': 'u',
    'college': 'c',
    'state': 'st',
  };
  
  let modifiedName = name.toLowerCase();
  Object.entries(abbrevMap).forEach(([full, abbrev]) => {
    if (modifiedName.includes(full)) {
      variations.add(normalizeTeamName(modifiedName.replace(full, abbrev)));
    }
  });
  
  return Array.from(variations);
}

/**
 * Fetch all NCAA teams from API
 */
async function fetchAllNCAATeams(): Promise<TeamEntry[]> {
  const apiKey = process.env.STATS_API_KEY;
  if (!apiKey) {
    throw new Error("STATS_API_KEY is not set in environment variables");
  }

  console.log("🏀 Fetching all NCAA basketball teams...");
  console.log(`   League ID: ${NCAA_LEAGUE_ID} (NCAA)`);
  
  const currentSeason = getCurrentNCAABSeason();
  console.log(`   Season: ${currentSeason}\n`);

  // Fetch teams with NCAA statistics for current season
  const teams: TeamEntry[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    console.log(`   Fetching page ${page}...`);
    
    const response = await fetch(
      `${API_URL}/teams?league=${NCAA_LEAGUE_ID}&season=${currentSeason}`,
      {
        headers: { "x-apisports-key": apiKey as string as string },
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.errors && data.errors.length > 0) {
      console.error("   API Errors:", data.errors);
      break;
    }

    const pageTeams = data.response || [];
    console.log(`   Found ${pageTeams.length} teams on page ${page}`);

    // Filter out women's teams
    const mensTeams = pageTeams.filter((t: any) => 
      !t.name?.endsWith(" W") && t.country?.name === "USA"
    );

    console.log(`   Filtered to ${mensTeams.length} men's teams from USA`);

    // Process each team
    for (const team of mensTeams) {
      const entry: TeamEntry = {
        id: team.id,
        name: team.name,
        code: team.code || team.name.slice(0, 3).toUpperCase(),
        logo: team.logo || '',
        country: team.country?.name || 'USA',
        searchVariations: generateSearchVariations(team.name),
      };
      
      teams.push(entry);
    }

    // Check if there are more pages
    hasMore = data.paging?.current < data.paging?.total;
    page++;
    
    // Rate limiting
    if (hasMore) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n✅ Fetched ${teams.length} total NCAA men's basketball teams\n`);
  return teams;
}

/**
 * Get current NCAA season in YYYY-YYYY format
 */
function getCurrentNCAABSeason(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const seasonStartYear = month >= 10 ? year : year - 1;
  return `${seasonStartYear}-${seasonStartYear + 1}`;
}

/**
 * Build the teams database
 */
async function buildDatabase(): Promise<void> {
  try {
    console.log("🔨 Building NCAA Teams Database\n");
    console.log("=" .repeat(50));
    
    // Fetch all teams
    const teams = await fetchAllNCAATeams();
    
    // Build name index for fast lookup
    console.log("📇 Building search index...");
    const nameIndex: { [key: string]: number } = {};
    
    teams.forEach(team => {
      team.searchVariations.forEach(variation => {
        // Store team ID for this variation
        // If duplicate, keep the first one (could be improved with ranking)
        if (!nameIndex[variation]) {
          nameIndex[variation] = team.id;
        }
      });
    });
    
    console.log(`   Indexed ${Object.keys(nameIndex).length} search variations\n`);
    
    // Create database object
    const database: TeamsDatabase = {
      version: "1.0.0",
      buildDate: new Date().toISOString(),
      totalTeams: teams.length,
      teams: teams.sort((a, b) => a.name.localeCompare(b.name)),
      nameIndex,
    };
    
    // Write to file
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const outputPath = path.join(dataDir, 'ncaa-teams.json');
    fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));
    
    console.log("=" .repeat(50));
    console.log("✅ Database built successfully!");
    console.log(`   Output: ${outputPath}`);
    console.log(`   Teams: ${database.totalTeams}`);
    console.log(`   Search Variations: ${Object.keys(nameIndex).length}`);
    console.log(`   File Size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
    console.log("\n🎯 Next: Run the app and enjoy instant team lookups!\n");
    
  } catch (error) {
    console.error("\n❌ Error building database:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  buildDatabase();
}

export { buildDatabase };
export type { TeamsDatabase, TeamEntry };

