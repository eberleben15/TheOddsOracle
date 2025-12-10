/**
 * Add commonly missing teams with specific team names
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

// Teams that need exact names to avoid wrong matches
const SPECIFIC_TEAMS = [
  { searchTerm: "Michigan", exactName: "Michigan" }, // Not Central/Eastern/Western Michigan
  { searchTerm: "Illinois", exactName: "Illinois" },
  { searchTerm: "Texas", exactName: "Texas" },
];

async function addMissingTeams() {
  const apiKey = process.env.STATS_API_KEY;
  
  console.log("➕ ADDING MISSING TEAMS");
  console.log("═══════════════════════════════════════\n");

  // Load current database
  const dbPath = path.resolve(process.cwd(), 'data/ncaa-teams.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const teams = dbData.teams || [];
  
  let added = 0;
  
  for (const { searchTerm, exactName } of SPECIFIC_TEAMS) {
    // Check if already exists
    if (teams.some((t: any) => t.name === exactName)) {
      console.log(`✓ "${exactName}" already in database`);
      continue;
    }
    
    console.log(`Searching for "${exactName}"...`);
    
    // Search API
    const searchRes = await fetch(
      `${API_URL}/teams?search=${encodeURIComponent(searchTerm)}`,
      { headers: { "x-apisports-key": apiKey } }
    );
    
    const searchData = await searchRes.json();
    
    // Find exact match
    const team = searchData.response?.find((t: any) => 
      t.name === exactName && t.country?.name === "USA" && !t.name?.endsWith(" W")
    );
    
    if (!team) {
      console.log(`❌ "${exactName}" not found\n`);
      continue;
    }
    
    // Verify has NCAA data
    const statsRes = await fetch(
      `${API_URL}/statistics?team=${team.id}&league=${NCAA_LEAGUE_ID}&season=2024-2025`,
      { headers: { "x-apisports-key": apiKey } }
    );
    
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const hasData = statsData.results > 0;
      
      if (hasData) {
        // Add to database
        const searchVariations = [
          team.name.toLowerCase(),
          team.name.toLowerCase().split(' ')[0],
        ];
        
        teams.push({
          id: team.id,
          name: team.name,
          code: team.code || team.name.slice(0, 4).toUpperCase(),
          logo: team.logo || `https://media.api-sports.io/basketball/teams/${team.id}.png`,
          country: "USA",
          searchVariations,
        });
        
        added++;
        console.log(`✅ Added "${team.name}" (ID: ${team.id})\n`);
      } else {
        console.log(`⚠️  "${exactName}" has no NCAA data\n`);
      }
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  if (added > 0) {
    // Sort and save
    teams.sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    dbData.teams = teams;
    dbData.totalTeams = teams.length;
    dbData.buildDate = new Date().toISOString();
    
    fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2));
    
    console.log(`\n✅ Added ${added} teams`);
    console.log(`✅ Total teams now: ${teams.length}`);
    console.log(`\nRestart your dev server to use updated database.`);
  } else {
    console.log(`\nNo new teams added.`);
  }
}

addMissingTeams().catch(console.error);

