/**
 * Demo portfolio for admin testing and visualization.
 * Multi-tenant: only served to admin; never mixed with real user data.
 */

import type { ABEPosition, ABEContract } from "@/types/abe";

export const DEMO_POSITIONS: ABEPosition[] = [
  { contractId: "kalshi:DEMO-ELEC24:yes", side: "yes", size: 100, costPerShare: 0.55 },
  { contractId: "kalshi:DEMO-FED25:yes", side: "yes", size: 50, costPerShare: 0.72 },
  { contractId: "kalshi:DEMO-BTC100K:no", side: "no", size: 80, costPerShare: 0.35 },
  { contractId: "kalshi:DEMO-REcession:no", side: "no", size: 120, costPerShare: 0.28 },
  { contractId: "kalshi:DEMO-SP500:yes", side: "yes", size: 60, costPerShare: 0.61 },
];

export const DEMO_CONTRACTS: ABEContract[] = [
  {
    id: "kalshi:DEMO-ELEC24:yes",
    source: "kalshi",
    title: "Demo: Presidential election outcome",
    subtitle: "Yes",
    price: 0.55,
    factorIds: ["elections", "politics"],
  },
  {
    id: "kalshi:DEMO-FED25:yes",
    source: "kalshi",
    title: "Demo: Fed rate cut by Dec 2025",
    subtitle: "Yes",
    price: 0.72,
    factorIds: ["fed_policy", "macro"],
  },
  {
    id: "kalshi:DEMO-BTC100K:no",
    source: "kalshi",
    title: "Demo: Bitcoin above $100k",
    subtitle: "No",
    price: 0.35,
    factorIds: ["crypto", "macro"],
  },
  {
    id: "kalshi:DEMO-REcession:no",
    source: "kalshi",
    title: "Demo: US recession in 2025",
    subtitle: "No",
    price: 0.28,
    factorIds: ["macro", "recession"],
  },
  {
    id: "kalshi:DEMO-SP500:yes",
    source: "kalshi",
    title: "Demo: S&P 500 up YTD",
    subtitle: "Yes",
    price: 0.61,
    factorIds: ["equities", "macro"],
  },
];

export function getDemoPortfolio(): { positions: ABEPosition[]; contracts: ABEContract[] } {
  return { positions: [...DEMO_POSITIONS], contracts: [...DEMO_CONTRACTS] };
}
