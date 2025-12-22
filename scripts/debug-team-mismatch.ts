/**
 * Debug team ID mismatch issue
 * User reports: Michigan State stats showing in Nebraska vs Wisconsin matchup
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;

async function debugTeamMismatch() {
  const apiKey = process.env.STATS_API_KEY;
  
  console.log("🐛 DEBUG: Team ID Mismatch Investigation");
  console.log("═══════════════════════════════════════\n");
  
  const teamsToCheck = ["Nebraska", "Wisconsin", "Michigan State"];
  
  for (const teamName of teamsToCheck) {
    console.log(`\n🔍 Searching for: "${teamName}"`);
    console.log("─────────────────────────────────────");
    
    // Search API
    const searchRes = await fetch(`${API_URL}/teams?search=${encodeURIComponent(teamName)}`, {
      headers: { "x-apisports-key": apiKey as string },
    });
    const searchData = await searchRes.json();
    
    const usaTeams = searchData.response?.filter((t: any) => 
      t.country?.name === "USA" && !t.name?.endsWith(" W")
    );
    
    console.log(`Found ${usaTeams?.length || 0} USA teams (non-women):`);
    usaTeams?.slice(0, 5).forEach((t: any) => {
      console.log(`  - ID: ${t.id}, Name: "${t.name}"`);
    });
    
    // Check for data in 2024-2025
    if (usaTeams && usaTeams.length > 0) {
      const firstTeam = usaTeams[0];
      console.log(`\n  Checking stats for: ${firstTeam.name} (ID: ${firstTeam.id})`);
      
      const statsRes = await fetch(
        `${API_URL}/games?team=${firstTeam.id}&league=${NCAA_LEAGUE_ID}&season=2024-2025&last=3`,
        { headers: { "x-apisports-key": apiKey as string } }
      );
      const statsData = await statsRes.json();
      
      const games = statsData.response?.filter((g: any) => g.status?.short === "FT");
      console.log(`  Recent games: ${games?.length || 0}`);
      
      if (games && games.length > 0) {
        games.slice(0, 2).forEach((g: any) => {
          console.log(`    - ${g.date.split('T')[0]}: ${g.teams.home.name} vs ${g.teams.away.name}`);
        });
      }
    }
  }
  
  console.log("\n\n🔍 CHECKING DATABASE MAPPINGS:");
  console.log("═══════════════════════════════════════");
  
  // Check our local database
  try {
    const fs = require('fs');
    const dbPath = path.resolve(process.cwd(), 'data/ncaa-teams.json');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    
    console.log(`\nDatabase has ${dbData.length} teams\n`);
    
    for (const teamName of teamsToCheck) {
      const found = dbData.find((t: any) => 
        t.name === teamName || 
        t.name.toLowerCase().includes(teamName.toLowerCase())
      );
      
      if (found) {
        console.log(`✓ "${teamName}" in DB:`);
        console.log(`  - DB ID: ${found.id}`);
        console.log(`  - DB Name: "${found.name}"`);
        console.log(`  - Variations: ${found.variations?.join(', ') || 'none'}`);
      } else {
        console.log(`✗ "${teamName}" NOT in database`);
      }
    }
  } catch (error) {
    console.log("Could not read database file");
  }
  
  console.log("\n\n⚠️  POTENTIAL ISSUES:");
  console.log("═══════════════════════════════════════");
  console.log("1. Team name from Odds API might not match Stats API exactly");
  console.log("2. Database might have wrong team IDs");
  console.log("3. Search might be returning wrong team as first result");
  console.log("4. Caching might be storing wrong team mappings");
}

debugTeamMismatch().catch(console.error);

