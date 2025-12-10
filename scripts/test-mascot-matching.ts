/**
 * Test mascot name matching
 */

import { normalizeTeamName, generateSearchTerms, lookupTeamInDatabase } from '../lib/teams-database';

const testCases = [
  "Notre Dame Fighting Irish",
  "Idaho Vandals",
  "Wisconsin Badgers",
  "Duke Blue Devils",
  "Michigan Wolverines",
  "Kansas Jayhawks",
  "North Carolina Tar Heels",
];

console.log("🧪 TESTING MASCOT MATCHING");
console.log("═══════════════════════════════════════\n");

testCases.forEach(oddsApiName => {
  console.log(`Input: "${oddsApiName}"`);
  console.log(`  Normalized: "${normalizeTeamName(oddsApiName)}"`);
  console.log(`  Search terms: ${generateSearchTerms(oddsApiName).join(', ')}`);
  
  const teamId = lookupTeamInDatabase(oddsApiName);
  if (teamId) {
    console.log(`  ✅ Found: ID ${teamId}`);
  } else {
    console.log(`  ❌ Not found`);
  }
  console.log();
});

