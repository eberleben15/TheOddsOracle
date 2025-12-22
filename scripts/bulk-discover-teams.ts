/**
 * Bulk discover team IDs for all teams from The Odds API
 * 
 * Usage:
 *   1. Get list of teams from The Odds API (or manually)
 *   2. Run: npx tsx scripts/bulk-discover-teams.ts
 *   3. Review the output and add --add to save mappings
 * 
 * This script will:
 * - Try to find each team in the API
 * - Show you the best match
 * - Optionally add all successful matches to the mapping file
 */

import * as dotenv from "dotenv";
import { existsSync } from "fs";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Try loading from multiple possible locations
const envPaths = [".env.local", ".env", ".env.development"];
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

const API_BASKETBALL_DIRECT_URL = "https://v1.basketball.api-sports.io";

interface TeamMatch {
  oddsApiName: string;
  apiSportsId: number | null;
  apiSportsName: string | null;
  confidence: "exact" | "partial" | "failed";
  error?: string;
}

async function searchTeam(teamName: string): Promise<TeamMatch> {
  const apiKey = process.env.STATS_API_KEY;
  
  if (!apiKey) {
    throw new Error("STATS_API_KEY is not set");
  }

  // Try different search variations
  const variations = [
    teamName,
    teamName.split(" ")[0], // First word only
    teamName.replace(/\s+(Tigers|Wildcats|Bulldogs|Eagles|Hawks|Seminoles|Cavaliers|Tar Heels|Blue Devils|Jayhawks|Bruins|Spartans|Wolverines|Hoosiers|Boilermakers|Buckeyes|Longhorns|Sooners|Crimson Tide|Razorbacks|Gators|Trojans|Ducks|Huskies|Cardinal|Cougars|Mountaineers|Cyclones|Red Raiders|Cowboys|Horned Frogs|Bears|Yellow Jackets|Demon Deacons|Wolfpack|Hokies|Orange|Panthers|Fighting Illini|Badgers|Terrapins|Hawkeyes|Nittany Lions|Scarlet Knights|Cornhuskers|Golden Gophers|Aggies|Gamecocks|Commodores|Rebels|Volunteers|Bluejays|Pirates|Friars|Musketeers|Red Storm|Hoyas|Blue Demons|Shockers|Aztecs|Gaels|Flyers|Rams)$/i, "").trim(),
  ];

  const allTeams = new Map<number, any>();

  for (const variation of variations) {
    if (!variation) continue;
    
    try {
      const url = `${API_BASKETBALL_DIRECT_URL}/teams?search=${encodeURIComponent(variation)}`;
      const response = await fetch(url, {
        headers: { "x-apisports-key": apiKey as string },
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.response && Array.isArray(data.response) && data.response.length > 0) {
        // Filter to USA men's teams only
        const usaTeams = data.response.filter((team: any) => {
          const country = team.country?.code || team.country?.name || "";
          const apiName = (team.name || "").toLowerCase();
          return (country === "US" || country === "USA") && !apiName.endsWith(" w");
        });

        usaTeams.forEach((team: any) => {
          if (!allTeams.has(team.id)) {
            allTeams.set(team.id, team);
          }
        });
      }
    } catch (error) {
      // Continue to next variation
    }
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit
  }

  if (allTeams.size === 0) {
    return {
      oddsApiName: teamName,
      apiSportsId: null,
      apiSportsName: null,
      confidence: "failed",
      error: "No USA men's teams found",
    };
  }

  // Prioritize matches
  const teamNameLower = teamName.toLowerCase();
  const teamNameFirstWord = teamName.split(" ")[0].toLowerCase();

  // Priority 1: Exact match
  let bestMatch = Array.from(allTeams.values()).find((team: any) => 
    team.name.toLowerCase() === teamNameLower || 
    team.name.toLowerCase() === teamNameFirstWord
  );

  // Priority 2: Starts with
  if (!bestMatch) {
    bestMatch = Array.from(allTeams.values()).find((team: any) => 
      team.name.toLowerCase().startsWith(teamNameFirstWord)
    );
  }

  // Priority 3: Contains (exclude directional modifiers)
  if (!bestMatch) {
    bestMatch = Array.from(allTeams.values()).find((team: any) => {
      const teamNameLower = team.name.toLowerCase();
      return teamNameLower.includes(teamNameFirstWord) && 
             !teamNameLower.includes("central") && 
             !teamNameLower.includes("eastern") && 
             !teamNameLower.includes("western") &&
             !teamNameLower.includes("northern") &&
             !teamNameLower.includes("southern");
    });
  }

  // Fallback
  if (!bestMatch) {
    bestMatch = Array.from(allTeams.values())[0];
  }

  return {
    oddsApiName: teamName,
    apiSportsId: bestMatch.id,
    apiSportsName: bestMatch.name,
    confidence: bestMatch.name.toLowerCase() === teamNameLower ? "exact" : "partial",
  };
}

async function bulkDiscover(teamNames: string[]) {
  console.log(`\n🔍 Bulk discovering ${teamNames.length} teams...\n`);

  const results: TeamMatch[] = [];
  const mappings: Record<string, { id: number; name: string }> = {};

  for (let i = 0; i < teamNames.length; i++) {
    const teamName = teamNames[i];
    console.log(`[${i + 1}/${teamNames.length}] Searching: "${teamName}"`);
    
    try {
      const match = await searchTeam(teamName);
      results.push(match);

      if (match.apiSportsId && match.apiSportsName) {
        const confidenceIcon = match.confidence === "exact" ? "✓" : "⚠";
        console.log(`  ${confidenceIcon} Found: ID ${match.apiSportsId} - "${match.apiSportsName}" (${match.confidence})`);
        mappings[teamName] = {
          id: match.apiSportsId,
          name: match.apiSportsName,
        };
      } else {
        console.log(`  ✗ Failed: ${match.error || "No match found"}`);
      }
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      results.push({
        oddsApiName: teamName,
        apiSportsId: null,
        apiSportsName: null,
        confidence: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Rate limit protection
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  const successful = results.filter(r => r.apiSportsId !== null);
  const exact = results.filter(r => r.confidence === "exact");
  const partial = results.filter(r => r.confidence === "partial");
  const failed = results.filter(r => r.confidence === "failed");

  console.log(`\n📊 Summary:`);
  console.log(`  ✓ Exact matches: ${exact.length}`);
  console.log(`  ⚠ Partial matches: ${partial.length}`);
  console.log(`  ✗ Failed: ${failed.length}`);
  console.log(`  Total successful: ${successful.length}/${teamNames.length}`);

  if (failed.length > 0) {
    console.log(`\n❌ Failed teams:`);
    failed.forEach(r => {
      console.log(`  - "${r.oddsApiName}": ${r.error || "No match found"}`);
    });
  }

  // Save mappings if requested
  if (process.argv.includes("--add") && Object.keys(mappings).length > 0) {
    try {
      const mappingPath = join(process.cwd(), "lib", "team-mappings-comprehensive.json");
      const existing = JSON.parse(readFileSync(mappingPath, "utf-8"));
      
      // Merge with existing mappings (don't overwrite)
      const merged = {
        ...existing,
        mappings: {
          ...existing.mappings,
          ...mappings,
        },
      };
      
      writeFileSync(mappingPath, JSON.stringify(merged, null, 2) + "\n");
      console.log(`\n✅ Added ${Object.keys(mappings).length} mappings to ${mappingPath}`);
    } catch (error) {
      console.error(`\n❌ Failed to save mappings: ${error}`);
    }
  } else if (Object.keys(mappings).length > 0) {
    console.log(`\n💡 Tip: Add --add flag to automatically save ${Object.keys(mappings).length} mappings`);
  }

  return results;
}

// Get team names from command line args or use example list
const teamNames = process.argv.slice(2).filter(arg => !arg.startsWith("--"));

if (teamNames.length === 0) {
  console.error("Usage: npx tsx scripts/bulk-discover-teams.ts \"Team 1\" \"Team 2\" ... [--add]");
  console.error("\nExample:");
  console.error('  npx tsx scripts/bulk-discover-teams.ts "Duke Blue Devils" "North Carolina Tar Heels" "Kentucky Wildcats"');
  console.error("\nOr pass a file with team names (one per line):");
  console.error('  cat teams.txt | xargs npx tsx scripts/bulk-discover-teams.ts');
  process.exit(1);
}

bulkDiscover(teamNames).catch(console.error);

