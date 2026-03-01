/**
 * Player Prop Predictor
 * 
 * Predicts player prop outcomes using a weighted model
 * combining season stats, recent form, matchup, and situational factors.
 */

import type {
  PlayerAnalytics,
  PlayerPropType,
  PropPrediction,
  AggregatedPlayerProp,
} from "./player-types";
import { getStatForPropType, getConsistencyScore } from "./player-analytics";
import { americanToImpliedProbability } from "./player-props-odds-api";

// Model weights
const WEIGHTS = {
  SEASON_AVG: 0.35,
  LAST_10: 0.25,
  LAST_5: 0.30,
  HOME_AWAY: 0.10,
};

// Trend adjustments
const TREND_ADJUSTMENT = {
  up: 1.05,
  stable: 1.0,
  down: 0.95,
};

// Minimum edge threshold for recommendations
const MIN_EDGE_THRESHOLD = 0.03; // 3%

interface PredictionInput {
  analytics: PlayerAnalytics;
  prop: AggregatedPlayerProp;
  isHome: boolean;
  restDays?: number;
  opponentDefensiveRating?: number;
}

export function predictProp(input: PredictionInput): PropPrediction {
  const { analytics, prop, isHome, restDays = 1 } = input;
  
  const statData = getStatForPropType(analytics, prop.propType, true);
  const { seasonAvg, recentAvg, trend } = statData;
  
  // Get last 10 average
  const last10Data = getStatForPropType(analytics, prop.propType, false);
  
  // Get home/away split
  const splitAvg = isHome
    ? getSplitValue(analytics.homeSplit, prop.propType)
    : getSplitValue(analytics.awaySplit, prop.propType);
  
  // Weighted prediction
  let predicted =
    WEIGHTS.SEASON_AVG * seasonAvg +
    WEIGHTS.LAST_10 * last10Data.recentAvg +
    WEIGHTS.LAST_5 * recentAvg +
    WEIGHTS.HOME_AWAY * (splitAvg > 0 ? splitAvg : seasonAvg);
  
  // Apply trend adjustment
  predicted *= TREND_ADJUSTMENT[trend];
  
  // Rest day adjustment
  if (restDays === 0) {
    // Back-to-back: slight decrease
    predicted *= 0.97;
  } else if (restDays >= 3) {
    // Well rested: slight increase
    predicted *= 1.02;
  }
  
  // Calculate edge vs line
  const line = prop.consensusLine;
  const edge = line > 0 ? (predicted - line) / line : 0;
  
  // Determine recommendation
  const recommendation = getRecommendation(predicted, line, edge, prop);
  
  // Calculate confidence
  const confidence = calculateConfidence(analytics, prop.propType, edge);
  
  // Generate factors
  const factors = generateFactors(
    analytics,
    prop.propType,
    trend,
    isHome,
    predicted,
    line,
    restDays
  );
  
  return {
    playerId: analytics.playerId,
    playerName: analytics.playerName,
    team: analytics.team,
    propType: prop.propType,
    line,
    predictedValue: Math.round(predicted * 10) / 10,
    confidence,
    edge: Math.round(edge * 1000) / 10, // percentage
    recommendation,
    factors,
    overOdds: prop.bestOverOdds.odds,
    underOdds: prop.bestUnderOdds.odds,
    bestBookmaker: recommendation === "over" ? prop.bestOverOdds.bookmaker : prop.bestUnderOdds.bookmaker,
    seasonAvg,
    last5Avg: recentAvg,
    last10Avg: last10Data.recentAvg,
  };
}

function getSplitValue(
  split: { points: number; rebounds: number; assists: number; threes: number },
  propType: PlayerPropType
): number {
  switch (propType) {
    case "points":
      return split.points;
    case "rebounds":
      return split.rebounds;
    case "assists":
      return split.assists;
    case "threes":
      return split.threes;
    case "pra":
      return split.points + split.rebounds + split.assists;
    case "points_rebounds":
      return split.points + split.rebounds;
    case "points_assists":
      return split.points + split.assists;
    case "rebounds_assists":
      return split.rebounds + split.assists;
    default:
      return 0;
  }
}

function getRecommendation(
  predicted: number,
  line: number,
  edge: number,
  prop: AggregatedPlayerProp
): "over" | "under" | "pass" {
  // Check if edge meets threshold
  if (Math.abs(edge) < MIN_EDGE_THRESHOLD) {
    return "pass";
  }
  
  // Check odds value
  const overImplied = americanToImpliedProbability(prop.bestOverOdds.odds);
  const underImplied = americanToImpliedProbability(prop.bestUnderOdds.odds);
  
  if (predicted > line && edge >= MIN_EDGE_THRESHOLD) {
    // Over value: predicted exceeds line and odds offer value
    const trueOverProb = estimateOverProbability(predicted, line);
    if (trueOverProb > overImplied) {
      return "over";
    }
  }
  
  if (predicted < line && -edge >= MIN_EDGE_THRESHOLD) {
    // Under value: predicted below line and odds offer value
    const trueUnderProb = 1 - estimateOverProbability(predicted, line);
    if (trueUnderProb > underImplied) {
      return "under";
    }
  }
  
  return "pass";
}

function estimateOverProbability(predicted: number, line: number): number {
  // Simple model: assume normal distribution around predicted value
  // Roughly estimate probability of exceeding line
  const diff = predicted - line;
  const stdDev = Math.max(predicted * 0.25, 2); // ~25% standard deviation
  
  // z-score
  const z = diff / stdDev;
  
  // Approximate cumulative normal distribution
  // Using simple approximation
  return 0.5 * (1 + Math.tanh(z * 0.8));
}

function calculateConfidence(
  analytics: PlayerAnalytics,
  propType: PlayerPropType,
  edge: number
): number {
  // Base confidence from consistency
  const consistencyScore = getConsistencyScore(analytics, propType);
  
  // Games played factor (more games = more confidence)
  const gamesPlayed = analytics.seasonAvg.gamesPlayed;
  const gamesFactor = Math.min(1, gamesPlayed / 30);
  
  // Minutes stability factor
  const minutesStability = Math.max(0, 1 - (analytics.consistency.minutesStdDev / 10));
  
  // Edge magnitude factor (larger edge = more confidence, but cap it)
  const edgeFactor = Math.min(1.2, 1 + Math.abs(edge));
  
  // Combine factors
  const rawConfidence =
    consistencyScore * 0.3 +
    gamesFactor * 50 +
    minutesStability * 20;
  
  const adjustedConfidence = rawConfidence * edgeFactor;
  
  // Normalize to 0-100
  return Math.max(20, Math.min(95, adjustedConfidence));
}

function generateFactors(
  analytics: PlayerAnalytics,
  propType: PlayerPropType,
  trend: "up" | "down" | "stable",
  isHome: boolean,
  predicted: number,
  line: number,
  restDays: number
): string[] {
  const factors: string[] = [];
  
  // Trend factor
  if (trend === "up") {
    factors.push(`Trending up in recent games`);
  } else if (trend === "down") {
    factors.push(`Trending down in recent games`);
  }
  
  // Home/away factor
  const split = isHome ? analytics.homeSplit : analytics.awaySplit;
  const splitValue = getSplitValue(split, propType);
  const seasonValue = getSplitValue(
    {
      points: analytics.seasonAvg.points,
      rebounds: analytics.seasonAvg.rebounds,
      assists: analytics.seasonAvg.assists,
      threes: analytics.seasonAvg.threes,
    },
    propType
  );
  
  if (splitValue > 0 && seasonValue > 0) {
    const splitDiff = ((splitValue - seasonValue) / seasonValue) * 100;
    if (Math.abs(splitDiff) > 5) {
      factors.push(
        isHome
          ? `Performs ${splitDiff > 0 ? "better" : "worse"} at home (${splitDiff > 0 ? "+" : ""}${splitDiff.toFixed(1)}%)`
          : `Performs ${splitDiff > 0 ? "better" : "worse"} on the road (${splitDiff > 0 ? "+" : ""}${splitDiff.toFixed(1)}%)`
      );
    }
  }
  
  // Rest factor
  if (restDays === 0) {
    factors.push("Back-to-back game (fatigue risk)");
  } else if (restDays >= 3) {
    factors.push("Well-rested (3+ days off)");
  }
  
  // Consistency factor
  const consistencyScore = getConsistencyScore(analytics, propType);
  if (consistencyScore >= 70) {
    factors.push("Highly consistent performer");
  } else if (consistencyScore <= 40) {
    factors.push("Variable performer (high variance)");
  }
  
  // Prediction vs line
  const diff = predicted - line;
  if (Math.abs(diff) > 0.5) {
    factors.push(
      diff > 0
        ? `Projection ${diff.toFixed(1)} above line`
        : `Projection ${Math.abs(diff).toFixed(1)} below line`
    );
  }
  
  return factors;
}

export async function predictPropsForGame(
  props: AggregatedPlayerProp[],
  analyticsMap: Map<string, PlayerAnalytics>,
  isHomeGame: (playerName: string) => boolean
): Promise<PropPrediction[]> {
  const predictions: PropPrediction[] = [];
  
  for (const prop of props) {
    // Find analytics by player name (matching can be fuzzy)
    let playerAnalytics: PlayerAnalytics | undefined;
    for (const [, analytics] of analyticsMap) {
      if (normalizedNameMatch(analytics.playerName, prop.playerName)) {
        playerAnalytics = analytics;
        break;
      }
    }
    
    if (!playerAnalytics) {
      continue; // Skip players without analytics
    }
    
    const prediction = predictProp({
      analytics: playerAnalytics,
      prop,
      isHome: isHomeGame(prop.playerName),
    });
    
    predictions.push(prediction);
  }
  
  return predictions;
}

function normalizedNameMatch(name1: string, name2: string): boolean {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // Check if last name matches
  const parts1 = n1.split(" ");
  const parts2 = n2.split(" ");
  const last1 = parts1[parts1.length - 1];
  const last2 = parts2[parts2.length - 1];
  
  if (last1 === last2 && parts1[0][0] === parts2[0][0]) {
    return true; // Same last name and first initial
  }
  
  return false;
}

export function rankPredictionsByValue(predictions: PropPrediction[]): PropPrediction[] {
  return predictions
    .filter((p) => p.recommendation !== "pass")
    .sort((a, b) => {
      // Sort by edge * confidence (value score)
      const scoreA = Math.abs(a.edge) * a.confidence;
      const scoreB = Math.abs(b.edge) * b.confidence;
      return scoreB - scoreA;
    });
}
