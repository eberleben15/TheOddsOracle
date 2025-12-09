/**
 * Helper script to discover API-Sports.io team IDs for Odds API team names
 * Run with: npx tsx scripts/discover-team-ids.ts "Team Name"
 */

import * as dotenv from "dotenv";
import { existsSync } from "fs";

// Try loading from multiple possible locations
const envPaths = [".env.local", ".env", ".env.development"];
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
// Also load from process.env (in case it's already set)
dotenv.config();

const API_BASKETBALL_DIRECT_URL = "https://v1.basketball.api-sports.io";

async function discoverTeamId(teamName: string) {
  const apiKey = process.env.STATS_API_KEY;
  
  if (!apiKey) {
    console.error("❌ STATS_API_KEY is not set in environment variables");
    console.error("\nPlease set it in one of these ways:");
    console.error("  1. Create a .env.local file with: STATS_API_KEY=your_key_here");
    console.error("  2. Export it: export STATS_API_KEY=your_key_here");
    console.error("  3. Pass it inline: STATS_API_KEY=your_key_here npx tsx scripts/discover-team-ids.ts \"Team Name\"");
    process.exit(1);
  }

  console.log(`\n🔍 Searching for: "${teamName}"\n`);
  
  // Try different search variations
  const variations = [
    teamName,
    teamName.split(" ")[0], // First word only
    teamName.replace(/\s+(Tigers|Wildcats|Bulldogs|Eagles|Hawks|Seminoles|Cavaliers|Tar Heels|Blue Devils|Jayhawks|Bruins|Spartans|Wolverines|Hoosiers|Boilermakers|Buckeyes|Longhorns|Sooners|Crimson Tide|Razorbacks|Gators|Trojans|Ducks|Huskies|Cardinal|Cougars|Mountaineers|Cyclones|Red Raiders|Cowboys|Horned Frogs|Bears|Yellow Jackets|Demon Deacons|Wolfpack|Hokies|Orange|Panthers|Fighting Illini|Badgers|Terrapins|Hawkeyes|Nittany Lions|Scarlet Knights|Cornhuskers|Golden Gophers|Aggies|Gamecocks|Commodores|Rebels|Volunteers|Bluejays|Pirates|Friars|Musketeers|Red Storm|Hoyas|Blue Demons|Shockers|Aztecs|Gaels|Flyers|Rams)$/i, "").trim(), // Remove mascot
  ];

  const results: Array<{ variation: string; teams: any[] }> = [];

  for (const variation of variations) {
    if (!variation) continue;
    
    const url = `${API_BASKETBALL_DIRECT_URL}/teams?search=${encodeURIComponent(variation)}`;
    console.log(`  Trying: "${variation}"`);
    
    try {
      const response = await fetch(url, {
        headers: {
          "x-apisports-key": apiKey,
        },
      });

      if (!response.ok) {
        console.log(`    ❌ Error ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.response && Array.isArray(data.response) && data.response.length > 0) {
        // Filter to USA teams only, exclude women's teams
        const usaTeams = data.response.filter((team: any) => {
          const country = team.country?.code || team.country?.name || "";
          const apiName = (team.name || "").toLowerCase();
          return (country === "US" || country === "USA") && !apiName.endsWith(" w");
        });

        if (usaTeams.length > 0) {
          results.push({ variation, teams: usaTeams });
          console.log(`    ✓ Found ${usaTeams.length} USA men's team(s):`);
          usaTeams.forEach((team: any) => {
            console.log(`      - ID: ${team.id}, Name: "${team.name}"`);
          });
        } else {
          console.log(`    ⚠ Found ${data.response.length} team(s) but none are USA men's teams`);
        }
      } else {
        console.log(`    ✗ No results`);
      }
    } catch (error) {
      console.log(`    ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Summary:`);
  if (results.length === 0) {
    console.log(`  ❌ No USA men's teams found for "${teamName}"`);
    console.log(`  💡 Try searching manually at: https://www.api-sports.io/basketball`);
  } else {
    console.log(`  ✓ Found potential matches:`);
    const allTeams = new Map<number, any>();
    results.forEach(({ teams }) => {
      teams.forEach((team: any) => {
        if (!allTeams.has(team.id)) {
          allTeams.set(team.id, team);
        }
      });
    });
    
    // Prioritize matches: exact match > starts with > contains
    const teamNameLower = teamName.toLowerCase();
    const teamNameFirstWord = teamName.split(" ")[0].toLowerCase();
    
    // Priority 1: Exact match (case insensitive)
    let bestMatch = Array.from(allTeams.values()).find((team: any) => 
      team.name.toLowerCase() === teamNameLower || 
      team.name.toLowerCase() === teamNameFirstWord
    );
    
    // Priority 2: Starts with search term
    if (!bestMatch) {
      bestMatch = Array.from(allTeams.values()).find((team: any) => 
        team.name.toLowerCase().startsWith(teamNameFirstWord)
      );
    }
    
    // Priority 3: Contains search term (but not as part of another word)
    if (!bestMatch) {
      bestMatch = Array.from(allTeams.values()).find((team: any) => {
        const teamNameLower = team.name.toLowerCase();
        return teamNameLower.includes(teamNameFirstWord) && 
               !teamNameLower.includes("central") && 
               !teamNameLower.includes("eastern") && 
               !teamNameLower.includes("western");
      });
    }
    
    // Fallback: first match
    if (!bestMatch) {
      bestMatch = Array.from(allTeams.values())[0];
    }
    
    console.log(`\n  ✅ Best Match:`);
    console.log(`  Team ID: ${bestMatch.id}`);
    console.log(`  Name: "${bestMatch.name}"`);
    console.log(`  Logo: ${bestMatch.logo || "N/A"}`);
    
    // Show all matches for reference
    if (allTeams.size > 1) {
      console.log(`\n  📋 All ${allTeams.size} matches found:`);
      Array.from(allTeams.values()).forEach((team: any) => {
        const isSelected = team.id === bestMatch.id ? "✓" : " ";
        console.log(`    ${isSelected} ID: ${team.id}, Name: "${team.name}"`);
      });
    }
    
    console.log(`\n  📋 JSON mapping to add to lib/team-mappings-comprehensive.json:`);
    console.log(`    "${teamName}": {`);
    console.log(`      "id": ${bestMatch.id},`);
    console.log(`      "name": "${bestMatch.name}"`);
    console.log(`    },`);
    
    // Offer to add to file automatically
    if (process.argv.includes("--add")) {
      try {
        const mappingPath = join(process.cwd(), "lib", "team-mappings-comprehensive.json");
        const mappingFile = JSON.parse(readFileSync(mappingPath, "utf-8"));
        
        if (!mappingFile.mappings) {
          mappingFile.mappings = {};
        }
        
        mappingFile.mappings[teamName] = {
          id: bestMatch.id,
          name: bestMatch.name
        };
        
        writeFileSync(mappingPath, JSON.stringify(mappingFile, null, 2) + "\n");
        console.log(`\n  ✅ Added "${teamName}" to ${mappingPath}`);
      } catch (error) {
        console.error(`\n  ❌ Failed to add to file: ${error}`);
      }
    } else {
      console.log(`\n  💡 Tip: Add --add flag to automatically add this to the mapping file`);
    }
  }
}

// Get team name from command line args
const teamName = process.argv[2];

if (!teamName) {
  console.error("Usage: npx tsx scripts/discover-team-ids.ts \"Team Name\" [--add]");
  console.error('Example: npx tsx scripts/discover-team-ids.ts "Michigan Wolverines"');
  console.error('Example: npx tsx scripts/discover-team-ids.ts "Michigan Wolverines" --add');
  process.exit(1);
}

discoverTeamId(teamName).catch(console.error);

