#!/usr/bin/env tsx
/**
 * Check environment variables
 */

import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config();

console.log("\n🔍 Environment Variable Check\n");

const requiredVars = [
  "THE_ODDS_API_KEY",
  "SPORTSDATA_API_KEY",
  "DATABASE_URL",
  "ADMIN_EMAIL",
];

for (const varName of requiredVars) {
  const value = process.env[varName];
  if (value) {
    const displayValue = varName.includes("KEY") || varName.includes("SECRET") || varName.includes("URL")
      ? `${value.substring(0, 8)}...${value.substring(value.length - 4)} (${value.length} chars)`
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    console.log(`❌ ${varName}: NOT SET`);
  }
}

console.log("\n");


