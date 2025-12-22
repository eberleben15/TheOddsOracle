#!/usr/bin/env tsx
/**
 * Test The Odds API connection
 */

import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
config({ path: envPath });
config();

const apiKey = process.env.THE_ODDS_API_KEY;

if (!apiKey) {
  console.error("❌ THE_ODDS_API_KEY not found in environment variables");
  console.log("Make sure you have THE_ODDS_API_KEY in .env.local or .env file");
  process.exit(1);
}

console.log(`Testing API key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}\n`);

const url = `https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds/?regions=us&markets=h2h,spreads&apiKey=${apiKey}`;

async function test() {
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${text}`);
      
      if (response.status === 401) {
        console.error("\n⚠️  Unauthorized - Your API key is invalid or expired.");
        console.error("Please check your API key at https://theoddsapi.com/");
      }
      process.exit(1);
    }
    
    const data = JSON.parse(text);
    console.log(`✅ Success! Found ${data.length} games`);
    if (data.length > 0) {
      console.log(`\nFirst game: ${data[0].home_team} vs ${data[0].away_team}`);
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

test();

