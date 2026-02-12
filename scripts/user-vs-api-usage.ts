/**
 * User Growth vs API Usage Analysis
 * 
 * This script compares projected user growth with API usage to help:
 * - Understand cost per user
 * - Plan for scaling
 * - Negotiate pricing based on user projections
 * 
 * Run with: npx tsx scripts/user-vs-api-usage.ts
 */

interface UserScenario {
  name: string;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  sessionsPerUserPerDay: number;
  matchupsViewedPerSession: number;
  dashboardViewsPerSession: number;
}

interface UsageBreakdown {
  scenario: string;
  dailyUsers: number;
  monthlyUsers: number;
  dailySessions: number;
  dailyMatchupViews: number;
  dailyDashboardViews: number;
  dailyApiCalls: {
    livePolling: number;
    matchupPages: number;
    dashboard: number;
    total: number;
  };
  monthlyApiCalls: number;
  costPerUser: {
    perMonth: number;
    perYear: number;
  };
}

// User behavior assumptions
const USER_BEHAVIOR = {
  // Average user behavior patterns
  sessionsPerUserPerDay: {
    casual: 1.2,      // Casual users: 1-2 sessions/day
    regular: 2.5,      // Regular users: 2-3 sessions/day
    power: 5.0,       // Power users: 4-6 sessions/day
  },
  
  matchupsViewedPerSession: {
    casual: 2,        // Casual: views 2 matchups per session
    regular: 5,       // Regular: views 5 matchups per session
    power: 10,        // Power: views 10 matchups per session
  },
  
  dashboardViewsPerSession: {
    casual: 1,        // Always views dashboard
    regular: 1,
    power: 1,
  },
  
  // Cache effectiveness reduces API calls
  cacheHitRate: 0.7,  // 70% of requests served from cache
};

// API call costs (example - update with actual SportsData.IO pricing)
const API_COST_TIERS = {
  starter: {
    name: "Starter",
    monthlyCalls: 10000,
    monthlyCost: 50,
    costPerCall: 0.005,
  },
  pro: {
    name: "Pro",
    monthlyCalls: 100000,
    monthlyCost: 150,
    costPerCall: 0.0015,
  },
  enterprise: {
    name: "Enterprise",
    monthlyCalls: 500000,
    monthlyCost: 500,
    costPerCall: 0.001,
  },
};

// User growth scenarios
const USER_SCENARIOS: UserScenario[] = [
  {
    name: "Launch (Month 1-3)",
    dailyActiveUsers: 50,
    monthlyActiveUsers: 500,
    sessionsPerUserPerDay: USER_BEHAVIOR.sessionsPerUserPerDay.regular,
    matchupsViewedPerSession: USER_BEHAVIOR.matchupsViewedPerSession.regular,
    dashboardViewsPerSession: USER_BEHAVIOR.dashboardViewsPerSession.regular,
  },
  {
    name: "Early Growth (Month 4-6)",
    dailyActiveUsers: 200,
    monthlyActiveUsers: 2000,
    sessionsPerUserPerDay: USER_BEHAVIOR.sessionsPerUserPerDay.regular,
    matchupsViewedPerSession: USER_BEHAVIOR.matchupsViewedPerSession.regular,
    dashboardViewsPerSession: USER_BEHAVIOR.dashboardViewsPerSession.regular,
  },
  {
    name: "Growth (Month 7-12)",
    dailyActiveUsers: 500,
    monthlyActiveUsers: 5000,
    sessionsPerUserPerDay: USER_BEHAVIOR.sessionsPerUserPerDay.regular,
    matchupsViewedPerSession: USER_BEHAVIOR.matchupsViewedPerSession.regular,
    dashboardViewsPerSession: USER_BEHAVIOR.dashboardViewsPerSession.regular,
  },
  {
    name: "Scale (Year 2)",
    dailyActiveUsers: 2000,
    monthlyActiveUsers: 20000,
    sessionsPerUserPerDay: USER_BEHAVIOR.sessionsPerUserPerDay.regular,
    matchupsViewedPerSession: USER_BEHAVIOR.matchupsViewedPerSession.regular,
    dashboardViewsPerSession: USER_BEHAVIOR.dashboardViewsPerSession.regular,
  },
  {
    name: "Mature (Year 3+)",
    dailyActiveUsers: 5000,
    monthlyActiveUsers: 50000,
    sessionsPerUserPerDay: USER_BEHAVIOR.sessionsPerUserPerDay.regular,
    matchupsViewedPerSession: USER_BEHAVIOR.matchupsViewedPerSession.regular,
    dashboardViewsPerSession: USER_BEHAVIOR.dashboardViewsPerSession.regular,
  },
];

// API call calculations
const API_CALLS = {
  // Live polling (background, not user-driven)
  livePollingPerDay: 2880, // 30-second intervals (from estimate-api-usage.ts)
  
  // Per matchup page view (after cache)
  callsPerMatchupPage: 5, // 2 team stats + 2 recent games + 1 H2H (CBB only)
  cacheHitRate: USER_BEHAVIOR.cacheHitRate,
  
  // Dashboard view (minimal, mostly cached)
  callsPerDashboardView: 0.1, // Very low, mostly cached odds data
};

function calculateUsage(scenario: UserScenario): UsageBreakdown {
  // Calculate daily activity
  const dailySessions = scenario.dailyActiveUsers * scenario.sessionsPerUserPerDay;
  const dailyMatchupViews = dailySessions * scenario.matchupsViewedPerSession;
  const dailyDashboardViews = dailySessions * scenario.dashboardViewsPerSession;
  
  // Calculate API calls (accounting for cache)
  const matchupPageCalls = dailyMatchupViews * (1 - API_CALLS.cacheHitRate) * API_CALLS.callsPerMatchupPage;
  const dashboardCalls = dailyDashboardViews * API_CALLS.callsPerDashboardView;
  const livePollingCalls = API_CALLS.livePollingPerDay; // Background polling
  
  const totalDailyCalls = Math.round(livePollingCalls + matchupPageCalls + dashboardCalls);
  const monthlyCalls = totalDailyCalls * 30;
  
  // Determine appropriate tier
  let tier;
  let monthlyCost;
  
  if (monthlyCalls <= API_COST_TIERS.starter.monthlyCalls) {
    tier = API_COST_TIERS.starter;
    monthlyCost = tier.monthlyCost;
  } else if (monthlyCalls <= API_COST_TIERS.pro.monthlyCalls) {
    tier = API_COST_TIERS.pro;
    monthlyCost = tier.monthlyCost;
  } else {
    // Enterprise tier - may have custom pricing
    tier = API_COST_TIERS.enterprise;
    // For enterprise, use per-call pricing if it's cheaper than flat rate
    monthlyCost = Math.min(
      tier.monthlyCost,
      monthlyCalls * tier.costPerCall
    );
  }
  
  const costPerUserPerMonth = scenario.monthlyActiveUsers > 0
    ? monthlyCost / scenario.monthlyActiveUsers
    : 0;
  
  return {
    scenario: scenario.name,
    dailyUsers: scenario.dailyActiveUsers,
    monthlyUsers: scenario.monthlyActiveUsers,
    dailySessions: Math.round(dailySessions),
    dailyMatchupViews: Math.round(dailyMatchupViews),
    dailyDashboardViews: Math.round(dailyDashboardViews),
    dailyApiCalls: {
      livePolling: Math.round(livePollingCalls),
      matchupPages: Math.round(matchupPageCalls),
      dashboard: Math.round(dashboardCalls),
      total: totalDailyCalls,
    },
    monthlyApiCalls: monthlyCalls,
    costPerUser: {
      perMonth: costPerUserPerMonth,
      perYear: costPerUserPerMonth * 12,
    },
  };
}

function printComparison(breakdowns: UsageBreakdown[]) {
  console.log("=".repeat(100));
  console.log("USER GROWTH vs API USAGE ANALYSIS");
  console.log("=".repeat(100));
  
  console.log("\n📊 USER ACTIVITY BREAKDOWN:");
  console.log("-".repeat(100));
  console.log(
    "Scenario".padEnd(25) +
    "DAU".padEnd(10) +
    "MAU".padEnd(10) +
    "Sessions/Day".padEnd(15) +
    "Matchups/Day".padEnd(15) +
    "Dashboard/Day".padEnd(15)
  );
  console.log("-".repeat(100));
  
  breakdowns.forEach(b => {
    console.log(
      b.scenario.padEnd(25) +
      b.dailyUsers.toLocaleString().padEnd(10) +
      b.monthlyUsers.toLocaleString().padEnd(10) +
      b.dailySessions.toLocaleString().padEnd(15) +
      b.dailyMatchupViews.toLocaleString().padEnd(15) +
      b.dailyDashboardViews.toLocaleString().padEnd(15)
    );
  });
  
  console.log("\n📡 API USAGE BREAKDOWN:");
  console.log("-".repeat(100));
  console.log(
    "Scenario".padEnd(25) +
    "Live Poll".padEnd(12) +
    "Matchups".padEnd(12) +
    "Dashboard".padEnd(12) +
    "Total/Day".padEnd(12) +
    "Total/Month".padEnd(15)
  );
  console.log("-".repeat(100));
  
  breakdowns.forEach(b => {
    console.log(
      b.scenario.padEnd(25) +
      b.dailyApiCalls.livePolling.toLocaleString().padEnd(12) +
      b.dailyApiCalls.matchupPages.toLocaleString().padEnd(12) +
      b.dailyApiCalls.dashboard.toLocaleString().padEnd(12) +
      b.dailyApiCalls.total.toLocaleString().padEnd(12) +
      b.monthlyApiCalls.toLocaleString().padEnd(15)
    );
  });
  
  console.log("\n💰 COST ANALYSIS:");
  console.log("-".repeat(100));
  console.log(
    "Scenario".padEnd(25) +
    "Monthly Cost".padEnd(15) +
    "Cost/User/Month".padEnd(20) +
    "Cost/User/Year".padEnd(20) +
    "Tier".padEnd(15)
  );
  console.log("-".repeat(100));
  
  breakdowns.forEach(b => {
    let tier;
    let monthlyCost;
    
    if (b.monthlyApiCalls <= API_COST_TIERS.starter.monthlyCalls) {
      tier = API_COST_TIERS.starter.name;
      monthlyCost = API_COST_TIERS.starter.monthlyCost;
    } else if (b.monthlyApiCalls <= API_COST_TIERS.pro.monthlyCalls) {
      tier = API_COST_TIERS.pro.name;
      monthlyCost = API_COST_TIERS.pro.monthlyCost;
    } else {
      tier = API_COST_TIERS.enterprise.name;
      // Enterprise: use per-call pricing if cheaper
      monthlyCost = Math.min(
        API_COST_TIERS.enterprise.monthlyCost,
        b.monthlyApiCalls * API_COST_TIERS.enterprise.costPerCall
      );
    }
    
    console.log(
      b.scenario.padEnd(25) +
      `$${monthlyCost.toFixed(2)}`.padEnd(15) +
      `$${b.costPerUser.perMonth.toFixed(4)}`.padEnd(20) +
      `$${b.costPerUser.perYear.toFixed(2)}`.padEnd(20) +
      tier.padEnd(15)
    );
  });
  
  console.log("\n📈 KEY INSIGHTS:");
  console.log("-".repeat(100));
  
  const launch = breakdowns[0];
  const growth = breakdowns[2];
  const scale = breakdowns[3];
  
  console.log(`\n1. API CALLS PER USER (Launch):`);
  console.log(`   - Daily API calls per user: ${(launch.dailyApiCalls.total / launch.dailyUsers).toFixed(2)}`);
  console.log(`   - Monthly API calls per user: ${(launch.monthlyApiCalls / launch.monthlyUsers).toFixed(0)}`);
  
  console.log(`\n2. COST EFFICIENCY IMPROVES WITH SCALE:`);
  console.log(`   - Launch cost/user/month: $${launch.costPerUser.perMonth.toFixed(4)}`);
  console.log(`   - Growth cost/user/month: $${growth.costPerUser.perMonth.toFixed(4)}`);
  console.log(`   - Scale cost/user/month: $${scale.costPerUser.perMonth.toFixed(4)}`);
  console.log(`   - Cost per user decreases by ${((1 - scale.costPerUser.perMonth / launch.costPerUser.perMonth) * 100).toFixed(1)}% as you scale`);
  
  console.log(`\n3. LIVE POLLING DOMINATES API USAGE:`);
  const livePollingPercentage = (launch.dailyApiCalls.livePolling / launch.dailyApiCalls.total * 100).toFixed(1);
  console.log(`   - Live polling: ${livePollingPercentage}% of total API calls`);
  console.log(`   - User-driven calls: ${(100 - parseFloat(livePollingPercentage)).toFixed(1)}% of total API calls`);
  console.log(`   - Recommendation: Consider optimizing polling frequency or using webhooks`);
  
  console.log(`\n4. USER ACTIVITY IMPACT:`);
  const userDrivenCalls = launch.dailyApiCalls.matchupPages + launch.dailyApiCalls.dashboard;
  const userDrivenPercentage = (userDrivenCalls / launch.dailyApiCalls.total * 100).toFixed(1);
  console.log(`   - User-driven API calls: ${userDrivenCalls.toLocaleString()}/day (${userDrivenPercentage}%)`);
  console.log(`   - Each additional 100 users adds ~${Math.round(userDrivenCalls / launch.dailyUsers * 100)} API calls/day`);
  
  console.log("\n" + "=".repeat(100));
}

function printRecommendations(breakdowns: UsageBreakdown[]) {
  console.log("\n💡 RECOMMENDATIONS FOR SALES CALL:");
  console.log("=".repeat(100));
  
  const launch = breakdowns[0];
  const growth = breakdowns[2];
  const scale = breakdowns[3];
  
  console.log("\n1. USER PROJECTIONS:");
  console.log(`   - Launch (Month 1-3): ${launch.monthlyUsers.toLocaleString()} MAU`);
  console.log(`   - Growth (Month 7-12): ${growth.monthlyUsers.toLocaleString()} MAU`);
  console.log(`   - Scale (Year 2): ${scale.monthlyUsers.toLocaleString()} MAU`);
  
  console.log("\n2. API USAGE PROJECTIONS:");
  console.log(`   - Launch: ${launch.monthlyApiCalls.toLocaleString()} calls/month`);
  console.log(`   - Growth: ${growth.monthlyApiCalls.toLocaleString()} calls/month`);
  console.log(`   - Scale: ${scale.monthlyApiCalls.toLocaleString()} calls/month`);
  
  console.log("\n3. PRICING NEGOTIATION POINTS:");
  console.log(`   - Start with Pro tier (${API_COST_TIERS.pro.monthlyCalls.toLocaleString()} calls) for launch`);
  console.log(`   - Plan for Enterprise tier (${API_COST_TIERS.enterprise.monthlyCalls.toLocaleString()} calls) by Year 2`);
  console.log(`   - Cost per user decreases from $${launch.costPerUser.perMonth.toFixed(4)} to $${scale.costPerUser.perMonth.toFixed(4)} as you scale`);
  console.log(`   - Ask about volume discounts for 200K+ calls/month`);
  
  console.log("\n4. OPTIMIZATION OPPORTUNITIES:");
  console.log(`   - Live polling (${launch.dailyApiCalls.livePolling.toLocaleString()} calls/day) could use webhooks`);
  console.log(`   - Cache hit rate (${(USER_BEHAVIOR.cacheHitRate * 100).toFixed(0)}%) could be improved`);
  console.log(`   - Consider reducing polling frequency during off-peak hours`);
  
  console.log("\n" + "=".repeat(100));
}

function main() {
  console.log("\n");
  
  const breakdowns = USER_SCENARIOS.map(calculateUsage);
  
  printComparison(breakdowns);
  printRecommendations(breakdowns);
  
  console.log("\n📝 NOTES:");
  console.log("-".repeat(100));
  console.log("• DAU = Daily Active Users");
  console.log("• MAU = Monthly Active Users");
  console.log("• API costs are estimates based on typical SportsData.IO pricing");
  console.log("• Actual costs may vary - verify with SportsData.IO sales");
  console.log("• Cache hit rate of 70% is assumed - actual may vary");
  console.log("• User behavior patterns are estimates - adjust based on analytics");
  console.log("=".repeat(100));
}

main();

