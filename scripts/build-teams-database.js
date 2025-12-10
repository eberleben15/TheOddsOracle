/**
 * NCAA Teams Database Builder
 * 
 * One-time script to fetch all NCAA basketball teams and build a JSON database.
 * Run with: node scripts/build-teams-database.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

/**
 * Normalize team name for matching
 */
function normalizeTeamName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' '); // Normalize spaces
}

/**
 * Generate search variations for a team name
 */
function generateSearchVariations(name) {
  const variations = new Set();
  
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
  const abbrevMap = {
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
 * Get current NCAA season in YYYY-YYYY format
 */
function getCurrentNCAABSeason() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const seasonStartYear = month >= 10 ? year : year - 1;
  return `${seasonStartYear}-${seasonStartYear + 1}`;
}

/**
 * Fetch all NCAA teams from API
 */
async function fetchAllNCAATeams() {
  const apiKey = process.env.STATS_API_KEY;
  if (!apiKey) {
    throw new Error("STATS_API_KEY is not set in environment variables");
  }

  console.log("🏀 Fetching all NCAA basketball teams...");
  console.log(`   League ID: ${NCAA_LEAGUE_ID} (NCAA)`);
  
  const currentSeason = getCurrentNCAABSeason();
  console.log(`   Season: ${currentSeason}\n`);

  const teams = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) { // Safety limit
    console.log(`   Fetching page ${page}...`);
    
    const response = await fetch(
      `${API_URL}/teams?league=${NCAA_LEAGUE_ID}&season=${currentSeason}`,
      {
        headers: { "x-apisports-key": apiKey },
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
    const mensTeams = pageTeams.filter(t => 
      !t.name?.endsWith(" W") && t.country?.name === "USA"
    );

    console.log(`   Filtered to ${mensTeams.length} men's teams from USA`);

    // Process each team
    for (const team of mensTeams) {
      const entry = {
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
 * Build the teams database
 */
async function buildDatabase() {
  try {
    console.log("🔨 Building NCAA Teams Database\n");
    console.log("=".repeat(50));
    
    // Fetch all teams
    const teams = await fetchAllNCAATeams();
    
    // Build name index for fast lookup
    console.log("📇 Building search index...");
    const nameIndex = {};
    
    teams.forEach(team => {
      team.searchVariations.forEach(variation => {
        // Store team ID for this variation
        if (!nameIndex[variation]) {
          nameIndex[variation] = team.id;
        }
      });
    });
    
    console.log(`   Indexed ${Object.keys(nameIndex).length} search variations\n`);
    
    // Create database object
    const database = {
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
    
    console.log("=".repeat(50));
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

// Run
buildDatabase();

