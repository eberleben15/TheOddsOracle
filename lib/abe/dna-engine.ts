/**
 * Phase 5: Strategy DNA & Behavioral Layer.
 * Builds BettingDNA from user profile, bankroll settings, and (optionally) edge accuracy from validated predictions.
 */

import type {
  RiskProfile,
  UserBettingProfile,
  EdgeAccuracySummary,
  BettingDNA,
} from "@/types/abe";

/** Compute edge accuracy from validated prediction records (model pick vs actual winner). */
export function computeEdgeAccuracyFromPredictions(
  predictions: { winProbability: unknown; actualWinner: string | null }[]
): EdgeAccuracySummary | null {
  let wins = 0;
  let total = 0;
  for (const p of predictions) {
    if (p.actualWinner !== "home" && p.actualWinner !== "away") continue;
    const wp = p.winProbability as { home?: number; away?: number } | null;
    if (!wp || typeof wp.home !== "number" || typeof wp.away !== "number") continue;
    const modelPick = wp.home >= wp.away ? "home" : "away";
    total++;
    if (modelPick === p.actualWinner) wins++;
  }
  if (total === 0) return null;
  return {
    totalBets: total,
    wins,
    winRate: wins / total,
  };
}

/** Build a short comparison summary from risk profile and Kelly (placeholder / heuristic). */
export function buildComparisonSummary(
  riskProfile: RiskProfile | null,
  kellyFraction: number
): string {
  const parts: string[] = [];
  if (riskProfile === "conservative") {
    parts.push("You use a conservative risk profile (quarter Kelly).");
    parts.push("You're more conservative than most users — lower variance, steadier growth.");
  } else if (riskProfile === "moderate") {
    parts.push("You use a moderate risk profile (half Kelly).");
    parts.push("You balance growth and risk — similar to many long-term profitable bettors.");
  } else if (riskProfile === "aggressive") {
    parts.push("You use an aggressive risk profile (three-quarter Kelly).");
    parts.push("Higher variance; consider reducing size in downswings.");
  } else {
    const k = (kellyFraction * 100).toFixed(0);
    parts.push(`You use a custom Kelly fraction (${k}% of full Kelly).`);
  }
  return parts.join(" ");
}

/** Build BettingDNA from bankroll settings, betting profile, and optional edge summary. */
export function buildBettingDNA(
  bankrollSettings: {
    kellyFraction: number;
    riskProfile?: string | null;
  } | null,
  bettingProfile: UserBettingProfile | null,
  edgeSummary: EdgeAccuracySummary | null
): BettingDNA {
  const kellyFraction = bankrollSettings?.kellyFraction ?? 0.25;
  const riskProfile = (bankrollSettings?.riskProfile as RiskProfile | null) ?? null;
  const preferredMarkets = bettingProfile?.preferredMarkets ?? [];
  const preferredSports = bettingProfile?.preferredSports ?? [];
  const comparisonSummary = buildComparisonSummary(riskProfile, kellyFraction);
  return {
    riskProfile,
    kellyFraction,
    preferredMarkets: Array.isArray(preferredMarkets) ? preferredMarkets : [],
    preferredSports: Array.isArray(preferredSports) ? preferredSports : [],
    edgeSummary: edgeSummary ?? null,
    comparisonSummary,
  };
}
