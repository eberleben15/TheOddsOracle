/**
 * Favorable Bet Engine
 * 
 * Identifies betting lines that don't match up with our AI predictions,
 * highlighting value betting opportunities where the market odds are mispriced.
 */

import { TeamStats, OddsGame } from "@/types";
import { ParsedOdds, decimalToAmerican } from "./odds-utils";
import { calculateImpliedProbability, hasValue } from "./betting-utils";
import { MatchupPrediction } from "./advanced-analytics";

export interface FavorableBet {
  type: 'moneyline' | 'spread' | 'total';
  team?: 'away' | 'home';
  recommendation: string;
  bookmaker: string;
  bookmakers?: string[]; // List of all bookmakers offering this bet at this price
  currentOdds: {
    decimal: number;
    american: number;
    impliedProbability: number;
  };
  ourPrediction: {
    probability: number;
    expectedValue: number; // Expected value percentage
  };
  edge: number; // Difference between our probability and implied probability
  confidence: number; // 0-100 confidence in this bet
  reason: string;
  valueRating: 'high' | 'medium' | 'low'; // Value rating
}

export interface FavorableBetAnalysis {
  bets: FavorableBet[];
  bestBet?: FavorableBet;
  totalValueBets: number;
  averageEdge: number;
  highestEdge: number;
}

/**
 * Analyze odds and predictions to find favorable bets
 */
export function analyzeFavorableBets(
  game: OddsGame,
  parsedOdds: ParsedOdds[],
  prediction: MatchupPrediction,
  awayTeamStats: TeamStats,
  homeTeamStats: TeamStats
): FavorableBetAnalysis {
  const favorableBets: FavorableBet[] = [];

  // Analyze moneyline bets
  parsedOdds.forEach((bookmakerOdds) => {
    if (bookmakerOdds.moneyline) {
      // Away team moneyline
      if (bookmakerOdds.moneyline.away) {
        const awayOdds = bookmakerOdds.moneyline.away;
        // Ensure we're using decimal odds (price should already be decimal from API)
        const awayDecimalOdds = awayOdds.price;
        
        // Validate odds are reasonable (should be >= 1.0)
        if (awayDecimalOdds >= 1.0) {
          const americanOdds = decimalToAmerican(awayDecimalOdds);
          const impliedProb = calculateImpliedProbability(americanOdds);
          const ourProb = prediction.winProbability.away / 100;
          const edge = ourProb - impliedProb;

          if (edge > 0.02) { // At least 2% edge
            const expectedValue = (ourProb * (1 / impliedProb - 1) - (1 - ourProb)) * 100;
            const confidence = calculateBetConfidence(edge, prediction.confidence);
            const valueRating = getValueRating(edge, expectedValue);

            favorableBets.push({
              type: 'moneyline',
              team: 'away',
              recommendation: `Bet ${awayTeamStats.name.split(' ')[0]} ML`,
              bookmaker: bookmakerOdds.bookmaker,
              currentOdds: {
                decimal: awayDecimalOdds, // Store as decimal
                american: americanOdds,
                impliedProbability: impliedProb * 100,
              },
              ourPrediction: {
                probability: ourProb * 100,
                expectedValue: expectedValue,
              },
              edge: edge * 100,
              confidence: confidence,
              reason: generateBetReason('moneyline', 'away', edge, awayTeamStats, homeTeamStats, prediction),
              valueRating: valueRating,
            });
          }
        } else {
          console.warn(`Invalid away odds for ${awayTeamStats.name}: ${awayDecimalOdds}`);
        }
      }

      // Home team moneyline
      if (bookmakerOdds.moneyline.home) {
        const homeOdds = bookmakerOdds.moneyline.home;
        // Ensure we're using decimal odds (price should already be decimal from API)
        const homeDecimalOdds = homeOdds.price;
        
        // Validate odds are reasonable (should be >= 1.0)
        if (homeDecimalOdds >= 1.0) {
          const americanOdds = decimalToAmerican(homeDecimalOdds);
          const impliedProb = calculateImpliedProbability(americanOdds);
          const ourProb = prediction.winProbability.home / 100;
          const edge = ourProb - impliedProb;

          if (edge > 0.02) { // At least 2% edge
            const expectedValue = (ourProb * (1 / impliedProb - 1) - (1 - ourProb)) * 100;
            const confidence = calculateBetConfidence(edge, prediction.confidence);
            const valueRating = getValueRating(edge, expectedValue);

            favorableBets.push({
              type: 'moneyline',
              team: 'home',
              recommendation: `Bet ${homeTeamStats.name.split(' ')[0]} ML`,
              bookmaker: bookmakerOdds.bookmaker,
              currentOdds: {
                decimal: homeDecimalOdds, // Store as decimal
                american: americanOdds,
                impliedProbability: impliedProb * 100,
              },
              ourPrediction: {
                probability: ourProb * 100,
                expectedValue: expectedValue,
              },
              edge: edge * 100,
              confidence: confidence,
              reason: generateBetReason('moneyline', 'home', edge, awayTeamStats, homeTeamStats, prediction),
              valueRating: valueRating,
            });
          }
        } else {
          console.warn(`Invalid home odds for ${homeTeamStats.name}: ${homeDecimalOdds}`);
        }
      }
    }

    // Analyze spread bets
    if (bookmakerOdds.spread) {
      // Away team spread
      if (bookmakerOdds.spread.away) {
        const spread = bookmakerOdds.spread.away;
        const americanOdds = decimalToAmerican(spread.price);
        const impliedProb = calculateImpliedProbability(americanOdds);
        
        // Calculate our probability of covering the spread
        const predictedSpread = prediction.predictedSpread;
        const spreadPoint = spread.point || 0;
        const ourProb = calculateSpreadCoverProbability(
          predictedSpread,
          spreadPoint,
          awayTeamStats,
          homeTeamStats
        );
        const edge = ourProb - impliedProb;

        if (edge > 0.02) {
          const expectedValue = (ourProb * (1 / impliedProb - 1) - (1 - ourProb)) * 100;
          const confidence = calculateBetConfidence(edge, prediction.confidence);
          const valueRating = getValueRating(edge, expectedValue);

          favorableBets.push({
            type: 'spread',
            team: 'away',
            recommendation: `${awayTeamStats.name.split(' ')[0]} ${spreadPoint > 0 ? '+' : ''}${spreadPoint.toFixed(1)}`,
            bookmaker: bookmakerOdds.bookmaker,
            currentOdds: {
              decimal: spread.price,
              american: americanOdds,
              impliedProbability: impliedProb * 100,
            },
            ourPrediction: {
              probability: ourProb * 100,
              expectedValue: expectedValue,
            },
            edge: edge * 100,
            confidence: confidence,
            reason: generateBetReason('spread', 'away', edge, awayTeamStats, homeTeamStats, prediction, spreadPoint),
            valueRating: valueRating,
          });
        }
      }

      // Home team spread
      if (bookmakerOdds.spread.home) {
        const spread = bookmakerOdds.spread.home;
        const americanOdds = decimalToAmerican(spread.price);
        const impliedProb = calculateImpliedProbability(americanOdds);
        
        const predictedSpread = prediction.predictedSpread;
        const spreadPoint = spread.point || 0;
        const ourProb = calculateSpreadCoverProbability(
          predictedSpread,
          spreadPoint,
          awayTeamStats,
          homeTeamStats,
          true
        );
        const edge = ourProb - impliedProb;

        if (edge > 0.02) {
          const expectedValue = (ourProb * (1 / impliedProb - 1) - (1 - ourProb)) * 100;
          const confidence = calculateBetConfidence(edge, prediction.confidence);
          const valueRating = getValueRating(edge, expectedValue);

          favorableBets.push({
            type: 'spread',
            team: 'home',
            recommendation: `${homeTeamStats.name.split(' ')[0]} ${spreadPoint > 0 ? '+' : ''}${spreadPoint.toFixed(1)}`,
            bookmaker: bookmakerOdds.bookmaker,
            currentOdds: {
              decimal: spread.price,
              american: americanOdds,
              impliedProbability: impliedProb * 100,
            },
            ourPrediction: {
              probability: ourProb * 100,
              expectedValue: expectedValue,
            },
            edge: edge * 100,
            confidence: confidence,
            reason: generateBetReason('spread', 'home', edge, awayTeamStats, homeTeamStats, prediction, spreadPoint),
            valueRating: valueRating,
          });
        }
      }
    }
  });

  // Consolidate bets: group by type, team, and similar odds (within 0.05 decimal tolerance)
  const consolidatedBets = consolidateFavorableBets(favorableBets);

  // Sort by edge (highest first)
  consolidatedBets.sort((a, b) => b.edge - a.edge);

  // Calculate summary stats
  const totalValueBets = consolidatedBets.length;
  const averageEdge = totalValueBets > 0
    ? consolidatedBets.reduce((sum, bet) => sum + bet.edge, 0) / totalValueBets
    : 0;
  const highestEdge = totalValueBets > 0 ? consolidatedBets[0].edge : 0;
  const bestBet = totalValueBets > 0 ? consolidatedBets[0] : undefined;

  return {
    bets: consolidatedBets,
    bestBet: bestBet,
    totalValueBets: totalValueBets,
    averageEdge: averageEdge,
    highestEdge: highestEdge,
  };
}

/**
 * Consolidate favorable bets by grouping similar bets from different bookmakers
 * Groups by type and team, then shows all bookmakers offering similar prices
 */
function consolidateFavorableBets(bets: FavorableBet[]): FavorableBet[] {
  // Group bets by: type and team (ignore price differences for grouping)
  const betGroups = new Map<string, FavorableBet[]>();

  bets.forEach((bet) => {
    // Create a key: type-teamIdentifier (group all prices together)
    const teamIdentifier = bet.team || 'total';
    const key = `${bet.type}-${teamIdentifier}`;

    if (!betGroups.has(key)) {
      betGroups.set(key, []);
    }
    betGroups.get(key)!.push(bet);
  });

  // Consolidate each group
  const consolidated: FavorableBet[] = [];

  betGroups.forEach((group) => {
    if (group.length === 0) return;

    // Use the bet with highest edge as the base
    const baseBet = group.reduce((best, current) => 
      current.edge > best.edge ? current : best
    );

    // Collect all unique bookmakers offering this bet
    const bookmakers = Array.from(new Set(group.map(b => b.bookmaker)));

    // Find the best price (highest decimal odds = best for the bettor)
    const bestPriceBet = group.reduce((best, current) => 
      current.currentOdds.decimal > best.currentOdds.decimal ? current : best
    );

    // Calculate average edge and confidence for the group
    const avgEdge = group.reduce((sum, b) => sum + b.edge, 0) / group.length;
    const avgConfidence = group.reduce((sum, b) => sum + b.confidence, 0) / group.length;

    // Create consolidated bet using best price but average edge/confidence
    const consolidatedBet: FavorableBet = {
      ...baseBet,
      currentOdds: bestPriceBet.currentOdds, // Use best price available
      bookmaker: bookmakers.length === 1 
        ? bookmakers[0] 
        : `${bookmakers.length} books`,
      edge: avgEdge,
      confidence: avgConfidence,
      // Store all bookmakers
      bookmakers: bookmakers.length > 1 ? bookmakers : undefined,
    };

    consolidated.push(consolidatedBet);
  });

  return consolidated;
}

/**
 * Calculate probability of covering a spread
 */
function calculateSpreadCoverProbability(
  predictedSpread: number,
  spreadPoint: number,
  awayTeamStats: TeamStats,
  homeTeamStats: TeamStats,
  isHome: boolean = false
): number {
  // If betting on away team spread
  if (!isHome) {
    // Away team needs to cover: awayScore - homeScore > spreadPoint
    // Our prediction: predictedSpread (positive = home favored, negative = away favored)
    // If predictedSpread is negative, away is favored
    const marginNeeded = spreadPoint;
    const predictedMargin = -predictedSpread; // Convert to away team perspective
    
    // Use a normal distribution approximation
    // Standard deviation based on team consistency
    const stdDev = 10; // Typical game margin std dev
    const zScore = (predictedMargin - marginNeeded) / stdDev;
    
    // Probability of covering (normal CDF approximation)
    return Math.max(0.1, Math.min(0.9, 0.5 + 0.5 * Math.tanh(zScore)));
  } else {
    // Home team spread
    const marginNeeded = spreadPoint;
    const predictedMargin = predictedSpread; // Home team perspective
    
    const stdDev = 10;
    const zScore = (predictedMargin - marginNeeded) / stdDev;
    
    return Math.max(0.1, Math.min(0.9, 0.5 + 0.5 * Math.tanh(zScore)));
  }
}

/**
 * Calculate bet confidence based on edge and prediction confidence
 */
function calculateBetConfidence(edge: number, predictionConfidence: number): number {
  // Combine edge (0-1) and prediction confidence (0-100)
  const edgeScore = Math.min(edge * 200, 100); // Scale edge to 0-100
  return Math.round((edgeScore * 0.4) + (predictionConfidence * 0.6));
}

/**
 * Get value rating based on edge and expected value
 */
function getValueRating(edge: number, expectedValue: number): 'high' | 'medium' | 'low' {
  if (edge > 0.05 || expectedValue > 10) return 'high';
  if (edge > 0.03 || expectedValue > 5) return 'medium';
  return 'low';
}

/**
 * Generate human-readable reason for the bet
 */
function generateBetReason(
  type: 'moneyline' | 'spread',
  team: 'away' | 'home',
  edge: number,
  awayTeamStats: TeamStats,
  homeTeamStats: TeamStats,
  prediction: MatchupPrediction,
  spreadPoint?: number
): string {
  const teamStats = team === 'away' ? awayTeamStats : homeTeamStats;
  const opponentStats = team === 'away' ? homeTeamStats : awayTeamStats;
  const teamName = teamStats.name.split(' ')[0];
  
  const reasons: string[] = [];
  
  if (type === 'moneyline') {
    const ourProb = prediction.winProbability[team] / 100;
    const impliedProb = ourProb - edge; // Calculate implied probability from edge
    
    // Format probabilities properly
    const ourProbPercent = (ourProb * 100).toFixed(1);
    const impliedProbPercent = Math.max(0, Math.min(100, (impliedProb * 100))).toFixed(1);
    
    reasons.push(`Our model gives ${teamName} a ${ourProbPercent}% chance to win`);
    reasons.push(`but the market only implies ${impliedProbPercent}%`);
    
    if (teamStats.pointsPerGame > opponentStats.pointsPerGame) {
      reasons.push(`${teamName} has a stronger offense (${teamStats.pointsPerGame.toFixed(1)} vs ${opponentStats.pointsPerGame.toFixed(1)} PPG)`);
    }
    
    if (teamStats.pointsAllowedPerGame < opponentStats.pointsAllowedPerGame) {
      reasons.push(`and better defense (${teamStats.pointsAllowedPerGame.toFixed(1)} vs ${opponentStats.pointsAllowedPerGame.toFixed(1)} PAPG)`);
    }
  } else {
    reasons.push(`Our model predicts ${teamName} will cover the ${spreadPoint?.toFixed(1)} point spread`);
    reasons.push(`with a ${(edge * 100).toFixed(1)}% edge over the market`);
  }
  
  return reasons.join('. ') + '.';
}

