/**
 * Check SportsData.io subscription status to understand data quality
 */

import * as dotenv from "dotenv";
import { existsSync } from "fs";

// Load environment variables
if (existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}
if (existsSync(".env")) {
  dotenv.config({ path: ".env" });
}

const API_KEY = process.env.SPORTSDATA_API_KEY;
if (!API_KEY) {
  console.error("❌ SPORTSDATA_API_KEY not found");
  process.exit(1);
}

const BASE_URL = "https://api.sportsdata.io/v3/cbb";

async function checkSubscriptionStatus() {
  console.log("🔍 Checking SportsData.io Subscription Status...\n");
  console.log("API Key:", API_KEY!.substring(0, 8) + "..." + API_KEY!.substring(API_KEY!.length - 4));
  console.log("=" .repeat(70));

  try {
    // Make a simple API call and check headers for subscription info
    const response = await fetch(`${BASE_URL}/scores/json/Teams?key=${API_KEY}`);
    
    console.log("\n📊 RESPONSE DETAILS:");
    console.log("-".repeat(70));
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`\nResponse Headers:`);
    
    // Check for subscription-related headers
    const headers = {
      'x-subscription-level': response.headers.get('x-subscription-level'),
      'x-subscription-type': response.headers.get('x-subscription-type'),
      'x-scrambled-data': response.headers.get('x-scrambled-data'),
      'x-api-version': response.headers.get('x-api-version'),
      'x-ratelimit-limit': response.headers.get('x-ratelimit-limit'),
      'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
      'x-ratelimit-reset': response.headers.get('x-ratelimit-reset'),
    };
    
    for (const [key, value] of Object.entries(headers)) {
      if (value) {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    // Check all headers
    console.log(`\nAll Response Headers:`);
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n❌ API Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    
    console.log("\n📋 API CALL SUCCESS:");
    console.log("-".repeat(70));
    console.log(`Teams returned: ${Array.isArray(data) ? data.length : 'N/A'}`);
    
    // Check if there's any indication in the response about trial status
    if (Array.isArray(data) && data.length > 0) {
      const sampleTeam = data[0];
      console.log(`\nSample team data structure:`);
      console.log(`  TeamID: ${sampleTeam.TeamID}`);
      console.log(`  School: ${sampleTeam.School}`);
      console.log(`  Key: ${sampleTeam.Key}`);
    }

    // Now check team stats to see if data is scrambled
    console.log("\n\n🔬 CHECKING FOR SCRAMBLED DATA...");
    console.log("=" .repeat(70));
    console.log("Testing with a well-known team (Duke) to check data quality\n");
    
    const statsResponse = await fetch(`${BASE_URL}/stats/json/TeamSeasonStats/2025?key=${API_KEY}`);
    if (statsResponse.ok) {
      const stats: any[] = await statsResponse.json();
      const duke = stats.find((s: any) => s.Name && s.Name.includes("Duke"));
      
      if (duke) {
        console.log("Duke Blue Devils Stats (2024-25 season):");
        console.log(`  Games: ${duke.Games}`);
        console.log(`  Wins: ${duke.Wins}`);
        console.log(`  Losses: ${duke.Losses}`);
        console.log(`  Points: ${duke.Points}`);
        console.log(`  PointsPerGame: ${duke.PointsPerGame}`);
        console.log(`  Possessions: ${duke.Possessions}`);
        
        if (duke.Games > 0) {
          const calculatedPPG = duke.Points / duke.Games;
          const calculatedPace = duke.Possessions / duke.Games;
          
          console.log(`\n  Calculated PPG: ${calculatedPPG.toFixed(1)}`);
          console.log(`  Calculated Pace: ${calculatedPace.toFixed(1)}`);
          
          console.log("\n📊 DATA QUALITY ANALYSIS:");
          console.log("-".repeat(70));
          
          // Check for typical college basketball ranges
          if (calculatedPPG > 100 || calculatedPPG < 40) {
            console.log("⚠️  WARNING: PPG is outside normal range (40-100)");
            console.log("   This suggests data may be SCRAMBLED (Free Trial)");
          } else {
            console.log("✅ PPG is within normal range (40-100)");
          }
          
          if (calculatedPace > 85 || calculatedPace < 60) {
            console.log("⚠️  WARNING: Pace is outside normal range (60-85)");
            console.log("   This suggests data may be SCRAMBLED (Free Trial)");
          } else {
            console.log("✅ Pace is within normal range (60-85)");
          }
          
          // Check if PointsPerGame field is populated
          if (!duke.PointsPerGame || duke.PointsPerGame === 0) {
            console.log("⚠️  WARNING: PointsPerGame field is empty/zero");
            console.log("   API might not be providing pre-calculated values");
          } else {
            console.log(`✅ PointsPerGame field is populated: ${duke.PointsPerGame}`);
          }
        }
      }
    }

    console.log("\n\n🎯 CONCLUSION:");
    console.log("=" .repeat(70));
    console.log("Based on the SportsData.io documentation:");
    console.log("");
    console.log("1. Free Trial accounts have SCRAMBLED DATA");
    console.log("   - Scores adjusted by 5-20% from actual values");
    console.log("   - This is intentional for evaluation purposes");
    console.log("");
    console.log("2. To get accurate, real-time data:");
    console.log("   - Upgrade to a PAID subscription");
    console.log("   - Pricing: https://sportsdata.io/developers/select-a-plan");
    console.log("");
    console.log("3. Current API key appears to be:");
    
    // Try to infer if it's a trial based on the data quality
    if (duke && duke.Games > 0) {
      const calculatedPPG = duke.Points / duke.Games;
      const calculatedPace = duke.Possessions / duke.Games;
      
      if (calculatedPPG > 100 || calculatedPace > 85) {
        console.log("   🔴 LIKELY FREE TRIAL (data is scrambled)");
      } else {
        console.log("   🟢 LIKELY PAID (data appears normal)");
      }
    } else {
      console.log("   ❓ UNKNOWN (insufficient data to determine)");
    }
    
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
    }
  }
}

checkSubscriptionStatus().then(() => {
  console.log("\n🏁 Check complete");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

