/**
 * API Usage Estimation Script
 * 
 * This script helps estimate your SportsData.IO API usage based on:
 * - Current code patterns
 * - Expected user traffic
 * - Caching strategies
 * 
 * Run with: npx tsx scripts/estimate-api-usage.ts
 */

interface UsageEstimate {
  sport: string;
  gamesPerDay: number;
  livePollingCallsPerDay: number;
  matchupPageCallsPerDay: number;
  totalCallsPerDay: number;
  totalCallsPerMonth: number;
}

interface SportConfig {
  key: string;
  name: string;
  seasonMonths: number[];
  avgGamesPerDay: number;
  peakGamesPerDay: number;
  isActive: boolean;
}

const SPORTS: SportConfig[] = [
  {
    key: "cbb",
    name: "College Basketball",
    seasonMonths: [10, 11, 0, 1, 2, 3], // Nov-Apr
    avgGamesPerDay: 60,
    peakGamesPerDay: 100,
    isActive: true,
  },
  {
    key: "nba",
    name: "NBA",
    seasonMonths: [9, 10, 11, 0, 1, 2, 3, 4, 5], // Oct-Jun
    avgGamesPerDay: 8,
    peakGamesPerDay: 12,
    isActive: false, // Not yet implemented
  },
  {
    key: "nfl",
    name: "NFL",
    seasonMonths: [8, 9, 10, 11, 0, 1], // Sep-Feb
    avgGamesPerDay: 4,
    peakGamesPerDay: 16, // Sunday/Monday/Thursday
    isActive: false,
  },
  {
    key: "nhl",
    name: "NHL",
    seasonMonths: [9, 10, 11, 0, 1, 2, 3, 4, 5], // Oct-Jun
    avgGamesPerDay: 8,
    peakGamesPerDay: 12,
    isActive: false,
  },
  {
    key: "mlb",
    name: "MLB",
    seasonMonths: [2, 3, 4, 5, 6, 7, 8, 9], // Mar-Oct
    avgGamesPerDay: 10,
    peakGamesPerDay: 18,
    isActive: false,
  },
];

// Configuration
const CONFIG = {
  // Live games polling frequency (from lib/odds-api.ts: revalidate: 30)
  livePollingIntervalSeconds: 30,
  
  // Matchup page API calls per page load
  // From app/matchup/[id]/page.tsx analysis:
  // - 2 team stats calls (home + away)
  // - 2 recent games calls (home + away)
  // - 1 head-to-head call (CBB only)
  callsPerMatchupPage: 5,
  
  // Estimated user traffic
  matchupPageViewsPerDay: {
    low: 50,
    medium: 150,
    high: 300,
  },
  
  // Cache effectiveness (reduces API calls)
  cacheHitRate: 0.7, // 70% of requests served from cache
  
  // Days per month
  daysPerMonth: 30,
};

function calculateLivePollingCalls(sport: SportConfig): number {
  // From lib/odds-api.ts: revalidate: 30 seconds
  const secondsPerDay = 24 * 60 * 60;
  const callsPerDay = secondsPerDay / CONFIG.livePollingIntervalSeconds;
  return Math.floor(callsPerDay);
}

function calculateMatchupPageCalls(
  sport: SportConfig,
  trafficLevel: "low" | "medium" | "high"
): number {
  const pageViews = CONFIG.matchupPageViewsPerDay[trafficLevel];
  
  // Account for cache hits
  const actualCalls = pageViews * (1 - CONFIG.cacheHitRate);
  
  // CBB has head-to-head (extra call), others don't
  const callsPerPage = sport.key === "cbb" 
    ? CONFIG.callsPerMatchupPage 
    : CONFIG.callsPerMatchupPage - 1; // No H2H for other sports
  
  return Math.floor(actualCalls * callsPerPage);
}

function estimateUsage(
  sport: SportConfig,
  trafficLevel: "low" | "medium" | "high",
  usePeakGames: boolean = false
): UsageEstimate {
  const gamesPerDay = usePeakGames ? sport.peakGamesPerDay : sport.avgGamesPerDay;
  const livePollingCalls = calculateLivePollingCalls(sport);
  const matchupPageCalls = calculateMatchupPageCalls(sport, trafficLevel);
  
  const totalCallsPerDay = livePollingCalls + matchupPageCalls;
  const totalCallsPerMonth = totalCallsPerDay * CONFIG.daysPerMonth;
  
  return {
    sport: sport.name,
    gamesPerDay,
    livePollingCallsPerDay: livePollingCalls,
    matchupPageCallsPerDay: matchupPageCalls,
    totalCallsPerDay,
    totalCallsPerMonth,
  };
}

function printEstimate(
  estimates: UsageEstimate[],
  scenario: string,
  trafficLevel: "low" | "medium" | "high",
  activeSportKeys?: string[]
) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`SCENARIO: ${scenario} (${trafficLevel.toUpperCase()} traffic)`);
  console.log("=".repeat(80));
  
  // If activeSportKeys provided, use those; otherwise check original SPORTS array
  const activeSports = activeSportKeys
    ? estimates.filter(e => {
        const sport = SPORTS.find(s => s.name === e.sport);
        return sport && activeSportKeys.includes(sport.key);
      })
    : estimates.filter(e => 
        SPORTS.find(s => s.name === e.sport)?.isActive
      );
  
  if (activeSports.length === 0) {
    console.log("\n⚠️  No active sports in this scenario");
    return;
  }
  
  console.log("\nPer Sport Breakdown:");
  console.log("-".repeat(80));
  
  let totalDaily = 0;
  let totalMonthly = 0;
  
  activeSports.forEach(est => {
    console.log(`\n${est.sport}:`);
    console.log(`  Games tracked/day:     ${est.gamesPerDay.toLocaleString()}`);
    console.log(`  Live polling calls/day: ${est.livePollingCallsPerDay.toLocaleString()}`);
    console.log(`  Matchup page calls/day: ${est.matchupPageCallsPerDay.toLocaleString()}`);
    console.log(`  Total calls/day:        ${est.totalCallsPerDay.toLocaleString()}`);
    console.log(`  Total calls/month:      ${est.totalCallsPerMonth.toLocaleString()}`);
    
    totalDaily += est.totalCallsPerDay;
    totalMonthly += est.totalCallsPerMonth;
  });
  
  console.log("\n" + "-".repeat(80));
  console.log("TOTALS:");
  console.log(`  Total calls/day:   ${totalDaily.toLocaleString()}`);
  console.log(`  Total calls/month: ${totalMonthly.toLocaleString()}`);
  console.log("=".repeat(80));
}

function main() {
  console.log("SportsData.IO API Usage Estimation");
  console.log("=".repeat(80));
  console.log("\nConfiguration:");
  console.log(`  Live polling interval: ${CONFIG.livePollingIntervalSeconds} seconds`);
  console.log(`  Calls per matchup page: ${CONFIG.callsPerMatchupPage}`);
  console.log(`  Cache hit rate: ${(CONFIG.cacheHitRate * 100).toFixed(0)}%`);
  console.log(`  Days per month: ${CONFIG.daysPerMonth}`);
  
  // Scenario 1: Current (CBB only, low traffic)
  const currentEstimates = SPORTS
    .filter(s => s.isActive)
    .map(s => estimateUsage(s, "low", false));
  printEstimate(currentEstimates, "Current State (CBB Only)", "low");
  
  // Scenario 2: Launch (CBB only, medium traffic)
  const launchEstimates = SPORTS
    .filter(s => s.isActive)
    .map(s => estimateUsage(s, "medium", false));
  printEstimate(launchEstimates, "Launch (CBB Only)", "medium");
  
  // Scenario 3: Growth (CBB + NBA, medium traffic)
  const growthSports = SPORTS
    .filter(s => s.key === "cbb" || s.key === "nba")
    .map(s => ({ ...s, isActive: true }));
  const growthEstimates = growthSports.map(s => estimateUsage(s, "medium", false));
  printEstimate(growthEstimates, "Growth (CBB + NBA)", "medium", ["cbb", "nba"]);
  
  // Scenario 4: Peak Season (CBB only, high traffic, peak games)
  const peakEstimates = SPORTS
    .filter(s => s.isActive)
    .map(s => estimateUsage(s, "high", true));
  printEstimate(peakEstimates, "Peak Season (CBB Only)", "high");
  
  // Scenario 5: Full Platform (All sports, high traffic)
  const fullPlatformSports = SPORTS.map(s => ({ ...s, isActive: true }));
  const fullPlatformEstimates = fullPlatformSports.map(s => estimateUsage(s, "high", false));
  printEstimate(fullPlatformEstimates, "Full Platform (All Sports)", "high", SPORTS.map(s => s.key));
  
  // Summary Recommendations
  console.log("\n" + "=".repeat(80));
  console.log("RECOMMENDATIONS FOR SALES CALL:");
  console.log("=".repeat(80));
  console.log("\nInitial Usage (Month 1-3):");
  const initialTotal = launchEstimates.reduce((sum, e) => sum + e.totalCallsPerMonth, 0);
  console.log(`  Conservative: ${initialTotal.toLocaleString()} calls/month`);
  console.log(`  Realistic:    ${Math.round(initialTotal * 1.2).toLocaleString()} calls/month (+20% buffer)`);
  
  console.log("\nGrowth Usage (Month 4-12):");
  const growthTotal = growthEstimates.reduce((sum, e) => sum + e.totalCallsPerMonth, 0);
  console.log(`  Conservative: ${growthTotal.toLocaleString()} calls/month`);
  console.log(`  Realistic:    ${Math.round(growthTotal * 1.2).toLocaleString()} calls/month (+20% buffer)`);
  
  console.log("\nPeak Capacity Needed:");
  const peakTotal = peakEstimates.reduce((sum, e) => sum + e.totalCallsPerMonth, 0);
  const fullPlatformTotal = fullPlatformEstimates.reduce((sum, e) => sum + e.totalCallsPerMonth, 0);
  console.log(`  Peak season:  ${peakTotal.toLocaleString()} calls/month`);
  console.log(`  Full platform: ${fullPlatformTotal.toLocaleString()} calls/month`);
  
  console.log("\n" + "=".repeat(80));
  console.log("NOTE: These are estimates based on code analysis.");
  console.log("Actual usage may vary based on:");
  console.log("  - Actual user traffic");
  console.log("  - Cache effectiveness");
  console.log("  - API optimization opportunities");
  console.log("  - Seasonal variations");
  console.log("=".repeat(80));
}

main();

