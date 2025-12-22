/**
 * Build Complete NCAA Teams Database
 * 
 * Fetches ALL NCAA teams with 2024-2025 season data from API
 * and creates a comprehensive database with correct IDs
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;
const CURRENT_SEASON = "2024-2025";

interface NCAATea {
  id: number;
  name: string;
  code: string;
  logo: string;
  country: string;
  searchVariations: string[];
}

async function buildCompleteDatabase() {
  const apiKey = process.env.STATS_API_KEY;
  
  if (!apiKey) {
    console.error("❌ STATS_API_KEY not set");
    process.exit(1);
  }

  console.log("🏀 BUILDING COMPLETE NCAA TEAMS DATABASE");
  console.log("═══════════════════════════════════════");
  console.log(`Season: ${CURRENT_SEASON}`);
  console.log(`League: NCAA (${NCAA_LEAGUE_ID})\n`);

  // Step 1: Get all teams that have played in NCAA this season
  console.log("Step 1: Fetching all teams with NCAA games...");
  
  const teamsWithData: NCAATea[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore && page <= 10) { // Limit to 10 pages for safety
    console.log(`  Fetching page ${page}...`);
    
    const res = await fetch(
      `${API_URL}/games?league=${NCAA_LEAGUE_ID}&season=${CURRENT_SEASON}&page=${page}`,
      { headers: { "x-apisports-key": apiKey as string } }
    );
    
    if (!res.ok) {
      console.error(`  ❌ HTTP ${res.status}`);
      break;
    }
    
    const data = await res.json();
    
    if (!data.response || data.response.length === 0) {
      hasMore = false;
      break;
    }
    
    // Extract unique teams from games
    const games = data.response;
    const teamIds = new Set<number>();
    
    games.forEach((game: any) => {
      // Only men's teams (exclude women's)
      if (!game.teams?.home?.name?.endsWith(" W") && !game.teams?.away?.name?.endsWith(" W")) {
        if (game.teams?.home?.id) teamIds.add(game.teams.home.id);
        if (game.teams?.away?.id) teamIds.add(game.teams.away.id);
      }
    });
    
    console.log(`  Found ${teamIds.size} unique teams on page ${page}`);
    
    // Get details for each team
    for (const teamId of teamIds) {
      const game = games.find((g: any) => 
        g.teams?.home?.id === teamId || g.teams?.away?.id === teamId
      );
      
      const team = game.teams.home.id === teamId ? game.teams.home : game.teams.away;
      
      if (team && !teamsWithData.find(t => t.id === team.id)) {
        // Generate search variations
        const variations = generateSearchVariations(team.name);
        
        teamsWithData.push({
          id: team.id,
          name: team.name,
          code: team.code || team.name.slice(0, 4).toUpperCase(),
          logo: team.logo || `https://media.api-sports.io/basketball/teams/${team.id}.png`,
          country: "USA",
          searchVariations: variations,
        });
      }
    }
    
    page++;
    await new Promise(r => setTimeout(r, 200)); // Rate limiting
  }
  
  console.log(`\n✓ Found ${teamsWithData.length} total NCAA teams\n`);
  
  // Sort alphabetically
  teamsWithData.sort((a, b) => a.name.localeCompare(b.name));
  
  // Step 2: Save to database file
  console.log("Step 2: Saving to database...");
  
  const database = {
    version: "1.0.0-complete",
    buildDate: new Date().toISOString(),
    totalTeams: teamsWithData.length,
    season: CURRENT_SEASON,
    note: "Complete NCAA teams database built from API data",
    teams: teamsWithData,
  };
  
  const dbPath = path.resolve(process.cwd(), 'data/ncaa-teams.json');
  fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
  
  console.log(`✓ Saved ${teamsWithData.length} teams to data/ncaa-teams.json`);
  
  // Step 3: Show sample teams
  console.log("\n📊 Sample Teams:");
  console.log("═══════════════════════════════════════");
  teamsWithData.slice(0, 10).forEach(team => {
    console.log(`  ${team.name} (ID: ${team.id})`);
  });
  console.log(`  ... and ${teamsWithData.length - 10} more`);
  
  // Step 4: Verify key teams
  console.log("\n✅ Verification - Key Teams:");
  console.log("═══════════════════════════════════════");
  
  const keyTeams = ['Duke', 'North Carolina', 'Kansas', 'Kentucky', 'Michigan State', 'Wisconsin', 'Nebraska'];
  
  for (const teamName of keyTeams) {
    const found = teamsWithData.find(t => 
      t.name === teamName || t.name.includes(teamName)
    );
    
    if (found) {
      console.log(`  ✓ ${found.name}: ID ${found.id}`);
    } else {
      console.log(`  ❌ ${teamName}: NOT FOUND`);
    }
  }
  
  console.log("\n" + "═".repeat(50));
  console.log("✅ DATABASE BUILD COMPLETE!");
  console.log("═".repeat(50));
  console.log(`\nTotal teams: ${teamsWithData.length}`);
  console.log(`File: data/ncaa-teams.json`);
  console.log(`\nRestart your dev server to use the new database.`);
}

/**
 * Generate search variations for a team name
 */
function generateSearchVariations(name: string): string[] {
  const variations = new Set<string>();
  
  // Add full name (lowercase)
  variations.add(name.toLowerCase());
  
  // Add individual words
  const words = name.toLowerCase().split(' ');
  words.forEach(word => {
    if (word.length > 2) { // Skip very short words
      variations.add(word);
    }
  });
  
  // Add first word
  if (words.length > 0) {
    variations.add(words[0]);
  }
  
  // Add combinations
  if (words.length >= 2) {
    variations.add(words.slice(0, 2).join(' '));
  }
  
  // Add common abbreviations
  if (name.includes('State')) {
    variations.add(name.replace('State', 'St').toLowerCase());
  }
  
  // Return as sorted array
  return Array.from(variations).sort();
}

buildCompleteDatabase().catch(error => {
  console.error("\n❌ Error building database:", error);
  process.exit(1);
});

