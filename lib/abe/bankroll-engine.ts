/**
 * Bankroll intelligence (ABE Phase 2).
 * Adaptive Kelly sizing, drawdown heuristics, risk-of-ruin, and lockup-aware metrics.
 */

import type { ABEPosition, ABEContract, BankrollSettings, BankrollSummary, RiskProfile } from "@/types/abe";

const DEFAULT_KELLY_FRACTION = 0.25;
const DEFAULT_BANKROLL_USD = 1000;

const RISK_PROFILE_KELLY: Record<RiskProfile, number> = {
  conservative: 0.25,
  moderate: 0.5,
  aggressive: 0.75,
};

/** Notional at risk for a position: size × cost per share. */
function positionNotional(pos: ABEPosition): number {
  return pos.size * pos.costPerShare;
}

/** Total notional from a list of positions. */
export function totalNotionalFromPositions(positions: ABEPosition[]): number {
  return positions.reduce((sum, p) => sum + positionNotional(p), 0);
}

/**
 * Full Kelly fraction for a binary contract.
 * @param winProb - Your estimated probability of winning (0–1).
 * @param price - Current price (cost) of contract (0–1). Payoff $1 if win.
 * @returns Fraction of bankroll to bet (0–1), or 0 if edge <= 0.
 */
export function fullKellyBinary(winProb: number, price: number): number {
  if (price <= 0 || price >= 1) return 0;
  const edge = winProb - price;
  const odds = (1 - price) / price; // net odds per $1
  if (edge <= 0) return 0;
  const kelly = edge / (1 - price); // = edge / (1 - price) for binary
  return Math.max(0, Math.min(1, kelly));
}

/**
 * Recommended stake in USD for a binary contract using fractional Kelly.
 */
export function kellyStakeUsd(
  bankrollUsd: number,
  kellyFraction: number,
  winProb: number,
  price: number
): number {
  if (bankrollUsd <= 0) return 0;
  const f = fullKellyBinary(winProb, price);
  return bankrollUsd * kellyFraction * f;
}

/**
 * Conservative recommended max single position (no edge input).
 * Uses a cap as fraction of bankroll (e.g. 10% of bankroll per position).
 */
function getRecommendedMaxPositionUsd(
  bankrollUsd: number,
  kellyFraction: number,
  maxFractionOfBankroll = 0.1
): number {
  if (bankrollUsd <= 0) return 0;
  return bankrollUsd * kellyFraction * (maxFractionOfBankroll / DEFAULT_KELLY_FRACTION);
}

/**
 * Heuristic P(20% drawdown) from notional/bankroll ratio.
 * Not a full Monte Carlo; approximates risk from exposure ratio.
 */
export function heuristicP20Drawdown(
  bankrollUsd: number,
  totalNotional: number
): number | null {
  if (bankrollUsd <= 0) return null;
  const ratio = totalNotional / bankrollUsd;
  const p = Math.min(0.95, 1 - Math.exp(-ratio * 0.4));
  return Math.round(p * 100) / 100;
}

/**
 * Heuristic P(30% drawdown in next 45 days) — roadmap Phase 2.
 * Same exposure-ratio family; 30% is deeper so slightly steeper curve.
 */
export function heuristicP30Drawdown45Days(
  bankrollUsd: number,
  totalNotional: number
): number | null {
  if (bankrollUsd <= 0) return null;
  const ratio = totalNotional / bankrollUsd;
  const p = Math.min(0.95, 1 - Math.exp(-ratio * 0.5));
  return Math.round(p * 100) / 100;
}

/**
 * Simple risk-of-ruin style metric (0–1): grows with notional/bankroll.
 * Not a full ruin model; indicates relative risk level.
 */
export function heuristicRiskOfRuin(
  bankrollUsd: number,
  totalNotional: number,
  kellyFraction: number
): number | null {
  if (bankrollUsd <= 0) return null;
  const ratio = totalNotional / bankrollUsd;
  const scaled = ratio * (0.15 + (1 - kellyFraction) * 0.15);
  const p = Math.min(0.5, Math.max(0, scaled));
  return Math.round(p * 100) / 100;
}

/**
 * Average lockup in days from positions and contracts (resolutionTime).
 * Returns undefined when no resolution times available.
 */
export function computeAvgLockupDays(
  positions: ABEPosition[],
  contracts?: ABEContract[]
): number | undefined {
  if (!contracts?.length) return undefined;
  const byId = new Map(contracts.map((c) => [c.id, c]));
  let totalWeight = 0;
  let weightedDays = 0;
  const now = Date.now();
  for (const pos of positions) {
    const contract = byId.get(pos.contractId);
    const resolutionTime = contract?.resolutionTime;
    if (!resolutionTime) continue;
    const resMs = new Date(resolutionTime).getTime();
    if (resMs <= now) continue;
    const days = (resMs - now) / (24 * 60 * 60 * 1000);
    const weight = pos.size * pos.costPerShare;
    weightedDays += weight * days;
    totalWeight += weight;
  }
  if (totalWeight <= 0) return undefined;
  return Math.round((weightedDays / totalWeight) * 10) / 10;
}

/**
 * Build bankroll summary from settings and current positions (or demo). Phase 2: P(30% in 45d), risk-of-ruin, risk profile.
 */
export function buildBankrollSummary(
  settings: Partial<BankrollSettings> | null,
  positions: ABEPosition[],
  options?: { isDemo?: boolean; contracts?: ABEContract[] }
): BankrollSummary {
  const riskProfile = settings?.riskProfile ?? null;
  const kellyFromProfile = riskProfile ? RISK_PROFILE_KELLY[riskProfile] : null;
  const bankrollUsd = settings?.bankrollUsd ?? DEFAULT_BANKROLL_USD;
  const kellyFraction = settings?.kellyFraction ?? kellyFromProfile ?? DEFAULT_KELLY_FRACTION;
  const totalNotional = totalNotionalFromPositions(positions);
  const recommendedMaxPositionUsd = getRecommendedMaxPositionUsd(bankrollUsd, kellyFraction);
  const pDrawdown20 = heuristicP20Drawdown(bankrollUsd, totalNotional);
  const pDrawdown30In45Days = heuristicP30Drawdown45Days(bankrollUsd, totalNotional);
  const riskOfRuin = heuristicRiskOfRuin(bankrollUsd, totalNotional, kellyFraction);

  let riskMessage: string;
  if (bankrollUsd <= 0) {
    riskMessage = "Set your risk capital to see sizing and risk metrics.";
  } else if (positions.length === 0) {
    riskMessage = "No positions. Connect Kalshi/Polymarket or use demo portfolio to see risk.";
  } else {
    const p30 = pDrawdown30In45Days != null ? `${(pDrawdown30In45Days * 100).toFixed(0)}%` : "—";
    riskMessage = `P(30% drawdown in 45 days) ≈ ${p30}. Max single position: $${recommendedMaxPositionUsd.toFixed(0)}.`;
  }

  return {
    bankrollUsd,
    kellyFraction,
    totalNotional,
    recommendedMaxPositionUsd,
    pDrawdown20: pDrawdown20 ?? null,
    pDrawdown30In45Days: pDrawdown30In45Days ?? null,
    riskOfRuin: riskOfRuin ?? null,
    riskMessage,
    isDemo: options?.isDemo,
    riskProfile: riskProfile ?? undefined,
  };
}
