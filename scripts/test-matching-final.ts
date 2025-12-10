/**
 * Final comprehensive matching test
 */

// Clear any module cache
delete require.cache[require.resolve('../lib/teams-database')];

import * as fs from 'fs';
import * as path from 'path';

// Manually load fresh database
const dbPath = path.join(process.cwd(), 'data', 'ncaa-teams.json');
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log("🔍 DATABASE CONTENTS CHECK");
console.log("═══════════════════════════════════════\n");

const michiganTeams = dbData.teams.filter((t: any) => 
  t.name.toLowerCase().includes('michigan')
);

console.log("Teams with 'michigan' in database:");
michiganTeams.forEach((t: any) => {
  console.log(`  - "${t.name}" (ID: ${t.id})`);
});

console.log("\n\n🧪 MATCHING TEST");
console.log("═══════════════════════════════════════\n");

// Now test matching
import { lookupTeamInDatabase, normalizeTeamName } from '../lib/teams-database';

const testName = "Michigan Wolverines";
console.log(`Testing: "${testName}"`);
console.log(`Normalized: "${normalizeTeamName(testName)}"`);

const result = lookupTeamInDatabase(testName);
console.log(`\nResult: ${result}`);

if (result === 1994) {
  console.log("✅ CORRECT! Matched University of Michigan");
} else if (result === 211) {
  console.log("❌ WRONG! Matched Central Michigan instead");
} else {
  console.log("❌ NO MATCH");
}

