/**
 * Prop Value Engine
 * 
 * Identifies value bets in player props by comparing predictions
 * to market odds and calculating expected value.
 */

import type {
  PropPrediction,
  PropValueBet,
  PlayerPropOdds,
  AggregatedPlayerProp,
  PlayerAnalytics,
} from "./player-types";
import { aggregatePlayerProps } from "./player-props-odds-api";
import { predictPropsForGame, rankPredictionsByValue } from "./prop-predictor";
import { getPlayerAnalyticsForGame } from "./player-analytics";
import { americanToImpliedProbability } from "./player-props-odds-api";

// Value thresholds
const VALUE_THRESHOLDS = {
  HIGH: 8, // 8%+ edge
  MEDIUM: 5, // 5-8% edge
  LOW: 3, // 3-5% edge
};

const CONFIDENCE_THRESHOLD = 50; // Minimum confidence to consider

export interface ValueEngineResult {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  valueBets: PropValueBet[];
  allPredictions: PropPrediction[];
  summary: {
    totalProps: number;
    valueBets: number;
    highValue: number;
    mediumValue: number;
    lowValue: number;
  };
}

export async function findValuePropsForGame(
  propOdds: PlayerPropOdds,
  homeTeam: string,
  awayTeam: string
): Promise<ValueEngineResult> {
  // Step 1: Get player analytics for both teams
  const analyticsMap = await getPlayerAnalyticsForGame(homeTeam, awayTeam);
  
  // Step 2: Aggregate props by player + prop type
  const aggregatedProps = aggregatePlayerProps(propOdds.props);
  
  // Step 3: Determine which players are home/away
  const homeTeamLower = homeTeam.toLowerCase();
  const isHomeGame = (playerName: string): boolean => {
    for (const [, analytics] of analyticsMap) {
      if (analytics.playerName.toLowerCase().includes(playerName.toLowerCase()) ||
          playerName.toLowerCase().includes(analytics.playerName.toLowerCase())) {
        return analytics.team.toLowerCase().includes(homeTeamLower);
      }
    }
    return false; // Default to away if unknown
  };
  
  // Step 4: Generate predictions
  const predictions = await predictPropsForGame(aggregatedProps, analyticsMap, isHomeGame);
  
  // Step 5: Identify value bets
  const valueBets = identifyValueBets(predictions, propOdds);
  
  // Step 6: Generate summary
  const summary = {
    totalProps: aggregatedProps.length,
    valueBets: valueBets.length,
    highValue: valueBets.filter((v) => v.tier === "high").length,
    mediumValue: valueBets.filter((v) => v.tier === "medium").length,
    lowValue: valueBets.filter((v) => v.tier === "low").length,
  };
  
  return {
    gameId: propOdds.gameId,
    homeTeam: propOdds.homeTeam,
    awayTeam: propOdds.awayTeam,
    commenceTime: propOdds.commenceTime,
    valueBets,
    allPredictions: predictions,
    summary,
  };
}

function identifyValueBets(
  predictions: PropPrediction[],
  propOdds: PlayerPropOdds
): PropValueBet[] {
  const valueBets: PropValueBet[] = [];
  
  for (const prediction of predictions) {
    // Skip if recommendation is "pass" or confidence too low
    if (prediction.recommendation === "pass") continue;
    if (prediction.confidence < CONFIDENCE_THRESHOLD) continue;
    
    // Check edge meets minimum threshold
    const absEdge = Math.abs(prediction.edge);
    if (absEdge < VALUE_THRESHOLDS.LOW) continue;
    
    // Calculate value score (edge * confidence)
    const valueScore = absEdge * prediction.confidence / 100;
    
    // Determine tier
    let tier: "high" | "medium" | "low";
    if (absEdge >= VALUE_THRESHOLDS.HIGH) {
      tier = "high";
    } else if (absEdge >= VALUE_THRESHOLDS.MEDIUM) {
      tier = "medium";
    } else {
      tier = "low";
    }
    
    // Calculate expected value
    const odds = prediction.recommendation === "over"
      ? prediction.overOdds
      : prediction.underOdds;
    
    if (!odds) continue;
    
    const impliedProb = americanToImpliedProbability(odds);
    const estimatedTrueProb = prediction.confidence / 100;
    
    // Expected value = (true prob * payout) - (1 - true prob)
    // For american odds
    const payout = odds >= 100 ? odds / 100 : 100 / Math.abs(odds);
    const ev = (estimatedTrueProb * payout) - (1 - estimatedTrueProb);
    
    // Only include if positive EV
    if (ev <= 0) continue;
    
    valueBets.push({
      prediction,
      gameId: propOdds.gameId,
      homeTeam: propOdds.homeTeam,
      awayTeam: propOdds.awayTeam,
      commenceTime: propOdds.commenceTime,
      valueScore,
      tier,
    });
  }
  
  // Sort by value score descending
  return valueBets.sort((a, b) => b.valueScore - a.valueScore);
}

export function getTopValueBets(valueBets: PropValueBet[], limit: number = 10): PropValueBet[] {
  return valueBets.slice(0, limit);
}

export function filterValueBetsByTier(
  valueBets: PropValueBet[],
  tiers: ("high" | "medium" | "low")[]
): PropValueBet[] {
  return valueBets.filter((v) => tiers.includes(v.tier));
}

export function filterValueBetsByPropType(
  valueBets: PropValueBet[],
  propTypes: string[]
): PropValueBet[] {
  return valueBets.filter((v) => propTypes.includes(v.prediction.propType));
}

export interface MultiGameValueResult {
  games: ValueEngineResult[];
  topValueBets: PropValueBet[];
  summary: {
    totalGames: number;
    totalProps: number;
    totalValueBets: number;
    byTier: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

export async function findValuePropsForMultipleGames(
  propOddsList: PlayerPropOdds[]
): Promise<MultiGameValueResult> {
  const games: ValueEngineResult[] = [];
  const allValueBets: PropValueBet[] = [];
  
  for (const propOdds of propOddsList) {
    try {
      const result = await findValuePropsForGame(
        propOdds,
        propOdds.homeTeam,
        propOdds.awayTeam
      );
      games.push(result);
      allValueBets.push(...result.valueBets);
    } catch (error) {
      console.error(`Error processing game ${propOdds.gameId}:`, error);
    }
  }
  
  // Sort all value bets and get top ones
  const sortedBets = allValueBets.sort((a, b) => b.valueScore - a.valueScore);
  const topValueBets = sortedBets.slice(0, 20);
  
  return {
    games,
    topValueBets,
    summary: {
      totalGames: games.length,
      totalProps: games.reduce((sum, g) => sum + g.summary.totalProps, 0),
      totalValueBets: allValueBets.length,
      byTier: {
        high: allValueBets.filter((v) => v.tier === "high").length,
        medium: allValueBets.filter((v) => v.tier === "medium").length,
        low: allValueBets.filter((v) => v.tier === "low").length,
      },
    },
  };
}

export function calculateKellyStake(
  valueBet: PropValueBet,
  bankroll: number,
  maxStakePct: number = 0.05
): number {
  const { prediction } = valueBet;
  
  const odds = prediction.recommendation === "over"
    ? prediction.overOdds
    : prediction.underOdds;
  
  if (!odds) return 0;
  
  // Convert american to decimal
  const decimal = odds >= 100
    ? (odds / 100) + 1
    : (100 / Math.abs(odds)) + 1;
  
  // Estimated probability from confidence
  const prob = prediction.confidence / 100;
  
  // Kelly criterion: (bp - q) / b
  // where b = decimal - 1, p = win prob, q = 1 - p
  const b = decimal - 1;
  const q = 1 - prob;
  const kelly = (b * prob - q) / b;
  
  // Apply fractional kelly (1/4 kelly for safety)
  const fractionalKelly = kelly * 0.25;
  
  // Cap at max stake percentage
  const stakePct = Math.max(0, Math.min(fractionalKelly, maxStakePct));
  
  return Math.round(bankroll * stakePct * 100) / 100;
}

export function formatValueBetSummary(valueBet: PropValueBet): string {
  const { prediction, tier, valueScore } = valueBet;
  const direction = prediction.recommendation.toUpperCase();
  const odds = prediction.recommendation === "over"
    ? prediction.overOdds
    : prediction.underOdds;
  
  return [
    `${prediction.playerName} ${prediction.propType.toUpperCase()} ${direction} ${prediction.line}`,
    `Edge: ${prediction.edge}% | Confidence: ${prediction.confidence}%`,
    `Odds: ${odds && odds > 0 ? "+" : ""}${odds} (${prediction.bestBookmaker})`,
    `Projection: ${prediction.predictedValue} | Season: ${prediction.seasonAvg} | L5: ${prediction.last5Avg}`,
    `Value: ${tier.toUpperCase()} (score: ${valueScore.toFixed(2)})`,
  ].join("\n");
}
