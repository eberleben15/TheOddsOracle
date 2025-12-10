/**
 * Verify all team IDs in database match API
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = "https://v1.basketball.api-sports.io";

async function verifyAllTeamIDs() {
  const apiKey = process.env.STATS_API_KEY;
  
  console.log("🔍 VERIFYING ALL TEAM IDS IN DATABASE");
  console.log("═══════════════════════════════════════\n");
  
  // Load database
  const dbPath = path.resolve(process.cwd(), 'data/ncaa-teams.json');
  const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  
  const teams = dbData.teams;
  console.log(`Checking ${teams.length} teams...\n`);
  
  let errors = 0;
  let verified = 0;
  
  for (const team of teams) {
    // Search API for this team name
    const searchRes = await fetch(`${API_URL}/teams?search=${encodeURIComponent(team.name)}`, {
      headers: { "x-apisports-key": apiKey },
    });
    const searchData = await searchRes.json();
    
    const found = searchData.response?.find((t: any) => 
      t.name === team.name && t.country?.name === "USA"
    );
    
    if (!found) {
      console.log(`❌ "${team.name}" - NOT FOUND in API`);
      errors++;
    } else if (found.id !== team.id) {
      console.log(`❌ "${team.name}" - ID MISMATCH!`);
      console.log(`   Database: ${team.id}`);
      console.log(`   API:      ${found.id}`);
      errors++;
    } else {
      console.log(`✓ "${team.name}" - ID ${team.id} verified`);
      verified++;
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 100));
  }
  
  console.log("\n═══════════════════════════════════════");
  console.log(`✓ Verified: ${verified}`);
  console.log(`❌ Errors: ${errors}`);
  
  if (errors === 0) {
    console.log("\n✅ ALL TEAM IDS ARE CORRECT!");
  } else {
    console.log("\n⚠️  SOME TEAM IDS NEED TO BE FIXED!");
  }
}

verifyAllTeamIDs().catch(console.error);

