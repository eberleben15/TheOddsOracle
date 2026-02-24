/**
 * Unified Recommendation Engine
 *
 * Single source of truth for bet recommendations. Supports:
 * - Edge-based mode: when market odds available, uses adaptive thresholds
 * - Model-only mode: when odds missing, returns recs with disclaimer
 * - 53% ATS performance gate
 */

import { calculateImpliedProbability } from "./betting-utils";
import { decimalToAmerican } from "./odds-utils";

/** Minimum ATS win rate (excludes pushes) to expose recommendations publicly */
export const ATS_PERFORMANCE_GATE = 53;

/** Odds snapshot format stored on predictions */
export interface OddsSnapshot {
  spread?: number;
  total?: number;
  moneyline?: { away?: number; home?: number };
}

/** Input prediction for the engine */
export interface RecommendationInput {
  predictedScore: { home: number; away: number };
  predictedSpread: number;
  predictedTotal: number | null;
  winProbability: { home: number; away: number };
  confidence: number;
  homeTeam: string;
  awayTeam: string;
  sport: string | null;
}

/** Bias corrections from validation (points we over/under predict) */
export interface BiasCorrection {
  homeTeamBias?: number;
  awayTeamBias?: number;
  scoreBias?: number;
}

/** Recommendation tier based on edge and confidence */
export type RecommendationTier = "high" | "medium" | "low";

/** Single recommendation output */
export interface Recommendation {
  type: "spread" | "moneyline" | "total_over" | "total_under" | "total_prediction";
  side: string;
  line: number | null;
  confidence: number;
  reasoning: string;
  edge?: number;
  isModelOnly: boolean;
  tier: RecommendationTier;
}

/** Adaptive thresholds per sport (edge in percentage points, e.g. 2 = 2%) */
const ADAPTIVE_THRESHOLDS: Record<
  string,
  { minEdge: number; minConfidence: number; minWinProb: number; minTotalDiff: number }
> = {
  basketball_ncaab: { minEdge: 2, minConfidence: 55, minWinProb: 65, minTotalDiff: 2 },
  basketball_nba: { minEdge: 2.5, minConfidence: 55, minWinProb: 65, minTotalDiff: 2.5 },
  icehockey_nhl: { minEdge: 2.5, minConfidence: 52, minWinProb: 62, minTotalDiff: 1.5 },
  baseball_mlb: { minEdge: 3, minConfidence: 55, minWinProb: 60, minTotalDiff: 1.5 },
  default: { minEdge: 2, minConfidence: 55, minWinProb: 65, minTotalDiff: 2 },
};

function getThresholds(sport: string | null) {
  return ADAPTIVE_THRESHOLDS[sport ?? "default"] ?? ADAPTIVE_THRESHOLDS.default;
}

/** Compute tier from edge and confidence */
function computeTier(edge: number | undefined, confidence: number): RecommendationTier {
  const edgeScore = edge != null ? edge : 0;
  const combined = edgeScore * 5 + confidence * 0.3;
  if (combined >= 90) return "high";
  if (combined >= 65) return "medium";
  return "low";
}

/** Apply bias correction to prediction values */
export function applyBiasCorrection(
  input: RecommendationInput,
  biases: BiasCorrection | null | undefined
): RecommendationInput {
  if (!biases || (biases.homeTeamBias == null && biases.awayTeamBias == null && biases.scoreBias == null)) {
    return input;
  }
  const homeBias = biases.homeTeamBias ?? 0;
  const awayBias = biases.awayTeamBias ?? 0;
  const scoreBias = biases.scoreBias ?? 0;
  const scoreHome = (input.predictedScore?.home ?? 0) - homeBias;
  const scoreAway = (input.predictedScore?.away ?? 0) - awayBias;
  const adjustedSpread = scoreHome - scoreAway;
  const adjustedTotal = input.predictedTotal != null
    ? input.predictedTotal - scoreBias
    : input.predictedTotal;
  return {
    ...input,
    predictedScore: { home: scoreHome, away: scoreAway },
    predictedSpread: adjustedSpread,
    predictedTotal: adjustedTotal,
  };
}

/** Implied probability for spread at -110 (standard vig) */
const SPREAD_IMPLIED_PROB = 100 / 210; // ~52.38%

/**
 * Calculate our probability of covering the spread (home or away).
 * predictedSpread: positive = home favored. spreadPoint: Odds API format (negative = home favored).
 */
function spreadCoverProbability(
  predictedSpread: number,
  spreadPoint: number,
  isHome: boolean
): number {
  const marginNeeded = -spreadPoint;
  const predictedMargin = isHome ? predictedSpread : -predictedSpread;
  const stdDev = 10;
  const zScore = (predictedMargin - marginNeeded) / stdDev;
  return Math.max(0.1, Math.min(0.9, 0.5 + 0.5 * Math.tanh(zScore)));
}

/**
 * Generate recommendations from a prediction.
 * When oddsSnapshot is present and has spread/total: edge-based mode.
 * When missing: model-only mode with isModelOnly=true.
 */
export function generateRecommendations(
  input: RecommendationInput,
  oddsSnapshot: OddsSnapshot | null | undefined
): Recommendation[] {
  const recs: Recommendation[] = [];
  const hasOdds = !!oddsSnapshot && (oddsSnapshot.spread != null || oddsSnapshot.total != null);
  const sport = input.sport ?? "default";
  const thresholds = getThresholds(input.sport);

  const homeWinProb =
    (input.winProbability.home > 1 ? input.winProbability.home : input.winProbability.home * 100);
  const awayWinProb =
    (input.winProbability.away > 1 ? input.winProbability.away : input.winProbability.away * 100);
  const confidence = input.confidence > 1 ? input.confidence : input.confidence * 100;
  const scoreHome = input.predictedScore?.home ?? 0;
  const scoreAway = input.predictedScore?.away ?? 0;
  const predictedWinner = scoreHome > scoreAway ? "home" : "away";
  const spreadDiff = Math.abs(scoreHome - scoreAway);
  const winnerTeam = predictedWinner === "home" ? input.homeTeam : input.awayTeam;

  // --- Spread ---
  if (confidence >= thresholds.minConfidence) {
    if (hasOdds && oddsSnapshot!.spread != null) {
      const marketSpread = oddsSnapshot!.spread!;
      const isHomePick = predictedWinner === "home";
      const ourProb = spreadCoverProbability(input.predictedSpread, marketSpread, isHomePick);
      const edgePct = (ourProb - SPREAD_IMPLIED_PROB) * 100;
      if (edgePct >= thresholds.minEdge) {
        const conf = Math.round(confidence * 0.6 + Math.min(edgePct * 2, 40));
        recs.push({
          type: "spread",
          side: predictedWinner,
          line: input.predictedSpread,
          confidence: conf,
          reasoning: `${winnerTeam} predicted to win by ${spreadDiff.toFixed(1)} points. ~${edgePct.toFixed(1)}% edge vs market (${isHomePick ? "home" : "away"} spread).`,
          edge: edgePct,
          isModelOnly: false,
          tier: computeTier(edgePct, conf),
        });
      }
    } else {
      recs.push({
        type: "spread",
        side: predictedWinner,
        line: input.predictedSpread,
        confidence,
        reasoning: `${winnerTeam} predicted to win by ${spreadDiff.toFixed(1)} points`,
        isModelOnly: true,
        tier: computeTier(undefined, confidence),
      });
    }
  }

  // --- Moneyline ---
  const maxWinProb = Math.max(homeWinProb, awayWinProb);
  if (maxWinProb >= thresholds.minWinProb) {
    const mlSide = homeWinProb > awayWinProb ? "home" : "away";
    const mlTeam = mlSide === "home" ? input.homeTeam : input.awayTeam;
    if (hasOdds && oddsSnapshot!.moneyline) {
      const mlOdds = mlSide === "home" ? oddsSnapshot!.moneyline!.home : oddsSnapshot!.moneyline!.away;
      if (mlOdds != null && mlOdds >= 1) {
        const americanOdds = decimalToAmerican(mlOdds);
        const impliedProb = calculateImpliedProbability(americanOdds);
        const ourProb = maxWinProb / 100;
        const edgePct = (ourProb - impliedProb) * 100;
        if (edgePct >= thresholds.minEdge) {
          const conf = Math.round(maxWinProb * 0.7 + Math.min(edgePct, 30));
          recs.push({
            type: "moneyline",
            side: mlSide,
            line: null,
            confidence: conf,
            reasoning: `Strong ${maxWinProb.toFixed(0)}% win probability for ${mlTeam}. ~${edgePct.toFixed(1)}% edge vs market.`,
            edge: edgePct,
            isModelOnly: false,
            tier: computeTier(edgePct, conf),
          });
        }
      }
    } else {
      recs.push({
        type: "moneyline",
        side: mlSide,
        line: null,
        confidence: maxWinProb,
        reasoning: `Strong ${maxWinProb.toFixed(0)}% win probability for ${mlTeam}`,
        isModelOnly: true,
        tier: computeTier(undefined, maxWinProb),
      });
    }
  }

  // --- Total ---
  if (input.predictedTotal != null && confidence >= thresholds.minConfidence) {
    const marketTotal = oddsSnapshot?.total;
    if (hasOdds && marketTotal != null) {
      const totalDiff = input.predictedTotal - marketTotal;
      if (Math.abs(totalDiff) >= thresholds.minTotalDiff) {
        const isOver = totalDiff > 0;
        const edge = Math.abs(totalDiff);
        recs.push({
          type: isOver ? "total_over" : "total_under",
          side: isOver ? "over" : "under",
          line: marketTotal,
          confidence,
          reasoning: `Predicted total ${input.predictedTotal.toFixed(0)} vs market ${marketTotal} (${totalDiff > 0 ? "+" : ""}${totalDiff.toFixed(1)})`,
          edge,
          isModelOnly: false,
          tier: computeTier(edge, confidence),
        });
      }
    } else {
      // Model-only: informational predicted total (compare to your sportsbook)
      recs.push({
        type: "total_prediction",
        side: "prediction",
        line: input.predictedTotal,
        confidence,
        reasoning: `Predicted total ${input.predictedTotal.toFixed(0)} — compare to your sportsbook's line`,
        isModelOnly: true,
        tier: computeTier(undefined, confidence),
      });
    }
  }

  return recs;
}

/**
 * Check if historical ATS performance meets the public gate.
 * Returns { passed, atsWinRate, gamesDecided }.
 */
export interface PerformanceGateResult {
  passed: boolean;
  atsWinRate: number;
  gamesDecided: number;
  threshold: number;
}

export function checkPerformanceGate(
  atsWinRate: number,
  gamesDecided: number,
  threshold: number = ATS_PERFORMANCE_GATE
): PerformanceGateResult {
  const passed = gamesDecided >= 30 && atsWinRate >= threshold;
  return {
    passed,
    atsWinRate,
    gamesDecided,
    threshold,
  };
}
