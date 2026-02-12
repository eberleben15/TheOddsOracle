/**
 * Demo portfolio for admin testing and visualization.
 * ~100 open contracts across Kalshi and Polymarket, multiple factors.
 * Multi-tenant: only served to admin; never mixed with real user data.
 */

import type { ABEPosition, ABEContract } from "@/types/abe";

/** Template: [tickerOrConditionId, side, size, cost, title, factorIds] */
const DEMO_SPEC: Array<[string, "yes" | "no", number, number, string, string[]]> = [
  // Presidency / elections
  ["KXPRES-24", "yes", 80, 0.52, "Presidential winner 2024", ["presidency", "republican_performance"]],
  ["KXPRES-24", "no", 40, 0.48, "Presidential winner 2024", ["presidency", "democrat_performance"]],
  ["ELEC-SENATE-24", "yes", 120, 0.58, "GOP controls Senate after 2024", ["congress", "republican_performance"]],
  ["ELEC-SENATE-24", "no", 60, 0.42, "GOP controls Senate after 2024", ["congress", "democrat_performance"]],
  ["ELEC-HOUSE-24", "yes", 90, 0.55, "GOP controls House after 2024", ["congress", "republican_performance"]],
  ["ELEC-HOUSE-24", "no", 70, 0.45, "GOP controls House after 2024", ["congress", "democrat_performance"]],
  ["KXIA-24", "yes", 50, 0.62, "Iowa caucus winner", ["presidency", "republican_performance"]],
  ["KXFL-24", "yes", 45, 0.48, "Florida winner", ["presidency", "republican_performance"]],
  ["KXPA-24", "no", 55, 0.51, "Pennsylvania winner", ["presidency", "democrat_performance"]],
  ["KXMI-24", "yes", 65, 0.47, "Michigan winner", ["presidency"]],
  ["KXWI-24", "no", 40, 0.53, "Wisconsin winner", ["presidency"]],
  ["KXAZ-24", "yes", 35, 0.44, "Arizona winner", ["presidency"]],
  ["KXGA-24", "yes", 75, 0.59, "Georgia winner", ["presidency", "republican_performance"]],
  ["KXNV-24", "no", 30, 0.49, "Nevada winner", ["presidency"]],
  ["KXOH-24", "yes", 85, 0.56, "Ohio winner", ["presidency", "republican_performance"]],
  ["KXTX-24", "yes", 100, 0.61, "Texas winner", ["presidency", "republican_performance"]],
  ["KXCA-24", "no", 95, 0.38, "California winner", ["presidency", "democrat_performance"]],
  ["KXNY-24", "no", 88, 0.35, "New York winner", ["presidency", "democrat_performance"]],
  // Fed / rates / inflation
  ["FED-RATE-DEC25", "yes", 150, 0.68, "Fed cuts rates by Dec 2025", ["fed_policy"]],
  ["FED-RATE-DEC25", "no", 50, 0.32, "Fed cuts rates by Dec 2025", ["fed_policy"]],
  ["FED-RATE-JUN25", "yes", 110, 0.72, "Fed cuts by June 2025", ["fed_policy"]],
  ["FOMC-MAR25", "yes", 90, 0.55, "Rate cut at March FOMC", ["fed_policy"]],
  ["FOMC-MAY25", "yes", 70, 0.48, "Rate cut at May FOMC", ["fed_policy"]],
  ["CPI-UNDER-3", "yes", 130, 0.42, "CPI under 3% by mid-2025", ["inflation"]],
  ["CPI-UNDER-3", "no", 80, 0.58, "CPI under 3% by mid-2025", ["inflation"]],
  ["PCE-25", "yes", 95, 0.51, "PCE core below 2.5% in 2025", ["inflation", "fed_policy"]],
  ["INFLATION-4PC", "no", 60, 0.38, "US inflation above 4% in 2025", ["inflation"]],
  ["RECESSION-25", "no", 200, 0.72, "US recession in 2025", ["fed_policy", "inflation"]],
  ["RECESSION-25", "yes", 40, 0.28, "US recession in 2025", ["fed_policy", "inflation"]],
  ["GDP-NEG-Q", "no", 75, 0.65, "Negative GDP quarter in 2025", ["fed_policy"]],
  // Crypto
  ["KXBTC-25", "yes", 180, 0.55, "Bitcoin above $100k by end of 2025", ["crypto"]],
  ["KXBTC-25", "no", 70, 0.45, "Bitcoin above $100k by end of 2025", ["crypto"]],
  ["KXBTC-80K", "yes", 120, 0.62, "Bitcoin above $80k in 2025", ["crypto"]],
  ["KXETH-5K", "yes", 90, 0.38, "Ethereum above $5k in 2025", ["crypto"]],
  ["KXETH-5K", "no", 55, 0.62, "Ethereum above $5k in 2025", ["crypto"]],
  ["KXSOL-200", "yes", 65, 0.44, "Solana above $200 in 2025", ["crypto"]],
  ["KXCRYPTO-ETF", "yes", 140, 0.78, "Another spot crypto ETF approved 2025", ["crypto"]],
  ["KXSTABLE-DEpeg", "no", 85, 0.82, "No major stablecoin depeg in 2025", ["crypto"]],
  ["0xbtc100k2025", "yes", 100, 0.52, "BTC $100k 2025 (Polymarket)", ["crypto"]],
  ["0xeth5k2025", "no", 45, 0.58, "ETH $5k 2025 (Polymarket)", ["crypto"]],
  // Sports
  ["NFL-MVP-25", "yes", 55, 0.22, "QB wins NFL MVP 2025", ["sports"]],
  ["NFL-MVP-25", "no", 35, 0.78, "QB wins NFL MVP 2025", ["sports"]],
  ["SB-WINNER-25", "yes", 70, 0.18, "AFC team wins Super Bowl", ["sports"]],
  ["SB-WINNER-25", "no", 90, 0.82, "NFC team wins Super Bowl", ["sports"]],
  ["NBA-MVP-25", "yes", 40, 0.35, "Frontrunner wins NBA MVP", ["sports"]],
  ["NBA-CHAMP-25", "yes", 60, 0.12, "East wins NBA title", ["sports"]],
  ["MLB-WS-25", "yes", 50, 0.48, "AL wins World Series 2025", ["sports"]],
  ["NHL-CUP-25", "yes", 30, 0.25, "Original Six wins Stanley Cup", ["sports"]],
  ["CFB-PLAYOFF-25", "yes", 95, 0.41, "SEC team in CFP final", ["sports"]],
  ["0xnflmvp25", "yes", 25, 0.28, "NFL MVP 2025 (Polymarket)", ["sports"]],
  ["0xnbamvp25", "yes", 38, 0.31, "NBA MVP 2025 (Polymarket)", ["sports"]],
  // More politics / macro
  ["SCOTUS-VACANCY-25", "no", 110, 0.65, "No SCOTUS vacancy in 2025", ["congress", "presidency"]],
  ["SCOTUS-VACANCY-25", "yes", 35, 0.35, "SCOTUS vacancy in 2025", ["congress", "presidency"]],
  ["GOV-SHUTDOWN-25", "no", 75, 0.58, "No federal shutdown in 2025", ["congress"]],
  ["GOV-SHUTDOWN-25", "yes", 42, 0.42, "Federal shutdown in 2025", ["congress"]],
  ["SP500-5500", "yes", 160, 0.54, "S&P 500 above 5500 in 2025", ["other"]],
  ["SP500-5500", "no", 55, 0.46, "S&P 500 above 5500 in 2025", ["other"]],
  ["SP500-6000", "yes", 88, 0.32, "S&P 500 above 6000 in 2025", ["other"]],
  ["JOBS-200K", "yes", 130, 0.48, "NFP above 200k in 2025", ["fed_policy", "inflation"]],
  ["JOBS-200K", "no", 65, 0.52, "NFP above 200k in 2025", ["fed_policy", "inflation"]],
  ["UNEMPLOY-4", "no", 95, 0.61, "Unemployment below 4% end of 2025", ["fed_policy"]],
  ["OIL-100", "no", 70, 0.72, "Oil above $100 in 2025", ["inflation", "other"]],
  ["OIL-100", "yes", 25, 0.28, "Oil above $100 in 2025", ["inflation", "other"]],
  // Polymarket-style condition IDs (hex)
  ["0xelec2024pres", "yes", 82, 0.51, "Presidential election 2024 (Polymarket)", ["presidency"]],
  ["0xelec2024pres", "no", 48, 0.49, "Presidential election 2024 (Polymarket)", ["presidency"]],
  ["0xfedcut25", "yes", 98, 0.66, "Fed rate cut 2025 (Polymarket)", ["fed_policy"]],
  ["0xinflation25", "yes", 72, 0.45, "Inflation under 3% 2025 (Polymarket)", ["inflation"]],
  ["0xrecession25", "no", 115, 0.68, "Recession 2025 (Polymarket)", ["fed_policy"]],
  ["0xbtceth", "yes", 62, 0.41, "BTC outperforms ETH 2025 (Polymarket)", ["crypto"]],
  ["0xsp500yr", "yes", 105, 0.56, "S&P 500 up YTD (Polymarket)", ["other"]],
  ["0xhouse24", "yes", 68, 0.52, "House control 2024 (Polymarket)", ["congress", "republican_performance"]],
  ["0xsenate24", "no", 52, 0.47, "Senate control 2024 (Polymarket)", ["congress", "democrat_performance"]],
  ["0xgas4usd", "no", 80, 0.55, "US gas under $4 avg 2025 (Polymarket)", ["inflation", "other"]],
  // Additional variety to reach ~100
  ["KXJOBS-JAN25", "yes", 140, 0.58, "Strong jobs report Jan 2025", ["fed_policy"]],
  ["KXJOBS-FEB25", "no", 45, 0.42, "Weak jobs report Feb 2025", ["fed_policy"]],
  ["KXCPI-JAN25", "yes", 92, 0.48, "CPI below 3% Jan 2025", ["inflation"]],
  ["KXDEBATE-24", "yes", 38, 0.55, "Presidential debate outcome", ["presidency"]],
  ["KXVOTE-SHARE", "yes", 58, 0.44, "GOP popular vote share above 48%", ["republican_performance"]],
  ["KXVOTE-SHARE", "no", 72, 0.56, "Dem popular vote share above 48%", ["democrat_performance"]],
  ["KXNASDAQ-25", "yes", 75, 0.52, "Nasdaq positive 2025", ["other"]],
  ["KXGOLD-25", "yes", 88, 0.46, "Gold above $2200 in 2025", ["other", "inflation"]],
  ["KXVIX-25", "no", 64, 0.71, "VIX below 20 avg 2025", ["other"]],
  ["KXDXY-25", "no", 42, 0.39, "Dollar index down in 2025", ["fed_policy", "other"]],
  ["0xukraine25", "yes", 55, 0.38, "Ukraine outcome 2025 (Polymarket)", ["other"]],
  ["0xaiagi25", "no", 90, 0.62, "AGI not reached 2025 (Polymarket)", ["other"]],
  ["0xtrumplegal", "yes", 70, 0.33, "Trump legal outcome (Polymarket)", ["presidency", "republican_performance"]],
  ["0xharris24", "no", 48, 0.51, "Harris on ticket 2024 (Polymarket)", ["democrat_performance", "presidency"]],
  ["KXMICH-SENT", "yes", 66, 0.54, "Michigan consumer sentiment above 70", ["fed_policy", "inflation"]],
  ["KXRETAIL-25", "yes", 54, 0.49, "Retail sales growth 2025", ["inflation", "other"]],
  ["KXHOUSING-25", "no", 78, 0.57, "Housing starts decline 2025", ["fed_policy", "inflation"]],
  ["KXAUTO-SALES", "yes", 44, 0.41, "Auto sales above 15M 2025", ["other"]],
  ["0xclimate25", "yes", 36, 0.29, "Climate policy outcome 2025 (Polymarket)", ["other"]],
  ["0xtechreg", "no", 62, 0.64, "Major tech regulation 2025 (Polymarket)", ["other"]],
  ["KXIPO-25", "yes", 50, 0.35, "Major tech IPO in 2025", ["other"]],
  ["KXIPO-25", "no", 40, 0.65, "Major tech IPO in 2025", ["other"]],
  ["0xfedjune25", "yes", 85, 0.58, "Fed cut June 2025 (Polymarket)", ["fed_policy"]],
  ["0xcongress24", "yes", 58, 0.53, "Congress outcome 2024 (Polymarket)", ["congress"]],
  ["KXWAGE-25", "yes", 96, 0.47, "Wage growth above 4% in 2025", ["inflation"]],
  ["KXTREASURY-10Y", "no", 72, 0.44, "10Y yield below 4% end 2025", ["fed_policy"]],
  ["0xmideast25", "no", 44, 0.61, "Major escalation Middle East 2025 (Polymarket)", ["other"]],
];

function kalshiContractId(ticker: string, side: "yes" | "no"): string {
  return `kalshi:${ticker}:${side}`;
}

function polymarketContractId(conditionId: string, side: "yes" | "no"): string {
  return `polymarket:${conditionId}:${side}`;
}

function isPolymarketTicker(ticker: string): boolean {
  return ticker.startsWith("0x") && ticker.length >= 10;
}

export const DEMO_POSITIONS: ABEPosition[] = DEMO_SPEC.map(([ticker, side, size, cost, , factorIds]) => {
  const id = isPolymarketTicker(ticker)
    ? polymarketContractId(ticker, side)
    : kalshiContractId(ticker, side);
  return { contractId: id, side, size, costPerShare: cost };
});

export const DEMO_CONTRACTS: ABEContract[] = DEMO_SPEC.map(([ticker, side, size, cost, title, factorIds]) => {
  const id = isPolymarketTicker(ticker)
    ? polymarketContractId(ticker, side)
    : kalshiContractId(ticker, side);
  return {
    id,
    source: isPolymarketTicker(ticker) ? "polymarket" : "kalshi",
    title,
    subtitle: side === "yes" ? "Yes" : "No",
    price: cost,
    factorIds,
  };
});

export function getDemoPortfolio(): { positions: ABEPosition[]; contracts: ABEContract[] } {
  return { positions: [...DEMO_POSITIONS], contracts: [...DEMO_CONTRACTS] };
}
