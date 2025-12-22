/**
 * Build NCAA Teams Database - Version 2
 * 
 * Strategy: Search for common team names and validate they have NCAA data
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = "https://v1.basketball.api-sports.io";
const NCAA_LEAGUE_ID = 116;
const CURRENT_SEASON = "2024-2025";

// List of NCAA teams to search for
const NCAA_TEAMS = [
  "Duke", "North Carolina", "Kansas", "Kentucky", "Villanova",
  "Michigan", "Michigan State", "Wisconsin", "Nebraska", "Iowa",
  "Indiana", "Ohio State", "Purdue", "Illinois", "Minnesota",
  "Northwestern", "Penn State", "Rutgers", "Maryland",
  "UCLA", "USC", "Arizona", "Arizona State", "Oregon", "Oregon State",
  "Stanford", "California", "Washington", "Colorado", "Utah",
  "Texas", "Oklahoma", "Kansas State", "Baylor", "Texas Tech",
  "TCU", "West Virginia", "Iowa State", "Oklahoma State",
  "Florida", "Georgia", "Tennessee", "Alabama", "Auburn",
  "LSU", "Arkansas", "Mississippi State", "Ole Miss", "Missouri",
  "South Carolina", "Vanderbilt", "Texas A&M",
  "Virginia", "Virginia Tech", "Louisville", "Clemson", "NC State",
  "Syracuse", "Pittsburgh", "Boston College", "Miami", "Georgia Tech",
  "Wake Forest", "Notre Dame", "Florida State",
  "Gonzaga", "Saint Mary's", "BYU", "San Diego", "Pepperdine",
  "Connecticut", "Creighton", "Xavier", "Butler", "Marquette",
  "Providence", "Seton Hall", "St. John's", "DePaul", "Georgetown",
  "Memphis", "Houston", "Cincinnati", "UCF", "Temple",
  "SMU", "Tulane", "Tulsa", "East Carolina", "South Florida",
  "Wichita State", "San Diego State", "Nevada", "UNLV", "Boise State",
  "Colorado State", "Wyoming", "New Mexico", "Air Force", "Utah State",
  "Fresno State", "San Jose State",
];

interface TeamData {
  id: number;
  name: string;
  code: string;
  logo: string;
  country: string;
  searchVariations: string[];
}

async function buildDatabase() {
  const apiKey = process.env.STATS_API_KEY;
  
  if (!apiKey) {
    console.error("❌ STATS_API_KEY not set");
    process.exit(1);
  }

  console.log("🏀 BUILDING NCAA TEAMS DATABASE (V2)");
  console.log("═══════════════════════════════════════");
  console.log(`Searching for ${NCAA_TEAMS.length} teams...\n`);

  const foundTeams: TeamData[] = [];
  const notFound: string[] = [];
  
  for (let i = 0; i < NCAA_TEAMS.length; i++) {
    const teamName = NCAA_TEAMS[i];
    process.stdout.write(`  [${i + 1}/${NCAA_TEAMS.length}] Searching "${teamName}"... `);
    
    try {
      // Search for team
      const searchRes = await fetch(
        `${API_URL}/teams?search=${encodeURIComponent(teamName)}`,
        { headers: { "x-apisports-key": apiKey as string } }
      );
      
      if (!searchRes.ok) {
        console.log(`❌ HTTP ${searchRes.status}`);
        notFound.push(teamName);
        continue;
      }
      
      const searchData = await searchRes.json();
      
      // Find USA men's team
      const team = searchData.response?.find((t: any) => 
        t.country?.name === "USA" && 
        !t.name?.endsWith(" W") &&
        (t.name === teamName || t.name.includes(teamName))
      );
      
      if (!team) {
        console.log(`❌ Not found`);
        notFound.push(teamName);
        continue;
      }
      
      // Verify team has NCAA data
      const statsRes = await fetch(
        `${API_URL}/statistics?team=${team.id}&league=${NCAA_LEAGUE_ID}&season=${CURRENT_SEASON}`,
        { headers: { "x-apisports-key": apiKey as string } }
      );
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        const hasData = statsData.results > 0 && statsData.response?.games?.played?.all > 0;
        
        if (hasData) {
          const variations = generateSearchVariations(team.name);
          foundTeams.push({
            id: team.id,
            name: team.name,
            code: team.code || team.name.slice(0, 4).toUpperCase(),
            logo: team.logo || `https://media.api-sports.io/basketball/teams/${team.id}.png`,
            country: "USA",
            searchVariations: variations,
          });
          console.log(`✓ ID ${team.id} (${statsData.response.games.played.all} games)`);
        } else {
          console.log(`⚠️  No NCAA data`);
          notFound.push(teamName);
        }
      } else {
        console.log(`⚠️  Stats check failed`);
        notFound.push(teamName);
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 150));
      
    } catch (error) {
      console.log(`❌ Error`);
      notFound.push(teamName);
    }
  }
  
  console.log(`\n✓ Found ${foundTeams.length} teams with NCAA data`);
  console.log(`✗ ${notFound.length} teams not found or no data\n`);
  
  // Sort alphabetically
  foundTeams.sort((a, b) => a.name.localeCompare(b.name));
  
  // Save to file
  const database = {
    version: "1.0.0-verified",
    buildDate: new Date().toISOString(),
    totalTeams: foundTeams.length,
    season: CURRENT_SEASON,
    note: "NCAA teams database with verified 2024-2025 season data",
    teams: foundTeams,
  };
  
  const dbPath = path.resolve(process.cwd(), 'data/ncaa-teams.json');
  fs.writeFileSync(dbPath, JSON.stringify(database, null, 2));
  
  console.log(`✅ Saved ${foundTeams.length} teams to data/ncaa-teams.json`);
  
  // Show key teams
  console.log("\n📊 Verified Key Teams:");
  console.log("═══════════════════════════════════════");
  
  const keyTeams = ['Duke', 'Wisconsin', 'Nebraska', 'Michigan State', 'Kansas'];
  keyTeams.forEach(name => {
    const team = foundTeams.find(t => t.name.includes(name));
    if (team) {
      console.log(`  ✓ ${team.name}: ID ${team.id}`);
    }
  });
  
  if (notFound.length > 0) {
    console.log("\n⚠️  Teams not found:");
    notFound.slice(0, 10).forEach(name => console.log(`  - ${name}`));
    if (notFound.length > 10) {
      console.log(`  ... and ${notFound.length - 10} more`);
    }
  }
  
  console.log("\n" + "═".repeat(50));
  console.log("✅ BUILD COMPLETE!");
  console.log("═".repeat(50));
  console.log(`\nDatabase: data/ncaa-teams.json`);
  console.log(`Teams: ${foundTeams.length}`);
  console.log(`\n💡 Restart your dev server to use the new database.`);
}

function generateSearchVariations(name: string): string[] {
  const variations = new Set<string>();
  variations.add(name.toLowerCase());
  
  const words = name.toLowerCase().split(' ').filter(w => w.length > 2);
  words.forEach(word => variations.add(word));
  
  if (words.length > 0) variations.add(words[0]);
  if (words.length >= 2) variations.add(words.slice(0, 2).join(' '));
  
  if (name.includes('State')) {
    variations.add(name.replace('State', 'St').toLowerCase());
  }
  
  return Array.from(variations).sort();
}

buildDatabase().catch(error => {
  console.error("\n❌ Error:", error);
  process.exit(1);
});

