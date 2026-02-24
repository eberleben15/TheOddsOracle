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
  /** For total bets: 'over' or 'under' */
  totalSide?: 'over' | 'under';
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
  /** Set when model strongly disagrees with market (e.g. heavy underdog favored); confidence is downweighted */
  marketDiscrepancyWarning?: string;
}

export interface FavorableBetAnalysis {
  bets: FavorableBet[];
  bestBet?: FavorableBet;
  totalValueBets: number;
  averageEdge: number;
  highestEdge: number;
}

/** CI width thresholds per sport — beyond filter we skip; between acceptable and filter we downweight */
const CI_THRESHOLDS: Record<string, { spreadAcceptable: number; spreadFilter: number; totalAcceptable: number; totalFilter: number }> = {
  cbb: { spreadAcceptable: 12, spreadFilter: 26, totalAcceptable: 22, totalFilter: 50 },
  basketball_ncaab: { spreadAcceptable: 12, spreadFilter: 26, totalAcceptable: 22, totalFilter: 50 },
  nba: { spreadAcceptable: 10, spreadFilter: 22, totalAcceptable: 20, totalFilter: 42 },
  basketball_nba: { spreadAcceptable: 10, spreadFilter: 22, totalAcceptable: 20, totalFilter: 42 },
  nhl: { spreadAcceptable: 1.5, spreadFilter: 3.5, totalAcceptable: 2.5, totalFilter: 6 },
  icehockey_nhl: { spreadAcceptable: 1.5, spreadFilter: 3.5, totalAcceptable: 2.5, totalFilter: 6 },
  mlb: { spreadAcceptable: 2, spreadFilter: 5, totalAcceptable: 4, totalFilter: 10 },
  baseball_mlb: { spreadAcceptable: 2, spreadFilter: 5, totalAcceptable: 4, totalFilter: 10 },
  default: { spreadAcceptable: 12, spreadFilter: 26, totalAcceptable: 22, totalFilter: 50 },
};

function getTotalUncertaintyMultiplier(
  sim: MatchupPrediction["simulation"],
  sport: string | null
): number {
  if (!sim?.confidenceIntervals?.total) return 1;
  const ci = sim.confidenceIntervals.total;
  const width = ci.upper - ci.lower;
  const th = CI_THRESHOLDS[sport ?? "default"] ?? CI_THRESHOLDS.default;
  if (width <= th.totalAcceptable) return 1;
  if (width >= th.totalFilter) return 0.4;
  const mult = 1 - ((width - th.totalAcceptable) / (th.totalFilter - th.totalAcceptable)) * 0.6;
  return Math.max(0.4, mult);
}

function getSpreadUncertaintyMultiplier(
  sim: MatchupPrediction["simulation"],
  sport: string | null
): number {
  if (!sim?.confidenceIntervals?.spread) return 1;
  const ci = sim.confidenceIntervals.spread;
  const width = ci.upper - ci.lower;
  const th = CI_THRESHOLDS[sport ?? "default"] ?? CI_THRESHOLDS.default;
  if (width <= th.spreadAcceptable) return 1;
  if (width >= th.spreadFilter) return 0.4;
  const mult = 1 - ((width - th.spreadAcceptable) / (th.spreadFilter - th.spreadAcceptable)) * 0.6;
  return Math.max(0.4, mult);
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
  const sport = game.sport_key ?? null;
  const spreadMult = getSpreadUncertaintyMultiplier(prediction.simulation, sport);
  const totalMult = getTotalUncertaintyMultiplier(prediction.simulation, sport);

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
            let confidence = calculateBetConfidence(edge, prediction.confidence);
            const valueRating = getValueRating(edge, expectedValue);
            const sanity = applyMarketDiscrepancySanity(impliedProb, ourProb, edge, confidence, (c) => { confidence = c; });

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
              marketDiscrepancyWarning: sanity,
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
            let confidence = calculateBetConfidence(edge, prediction.confidence);
            const valueRating = getValueRating(edge, expectedValue);
            const sanity = applyMarketDiscrepancySanity(impliedProb, ourProb, edge, confidence, (c) => { confidence = c; });

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
              marketDiscrepancyWarning: sanity,
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
          const confidence = Math.round(calculateBetConfidence(edge, prediction.confidence) * spreadMult);
          const valueRating = getValueRating(edge, expectedValue);
          if (confidence >= 45) {
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
          const confidence = Math.round(calculateBetConfidence(edge, prediction.confidence) * spreadMult);
          const valueRating = getValueRating(edge, expectedValue);
          if (confidence >= 45) {
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
    }

    // Analyze total (Over/Under) bets
    if (bookmakerOdds.total?.over || bookmakerOdds.total?.under) {
      const ourTotal = (prediction.predictedScore?.home ?? 0) + (prediction.predictedScore?.away ?? 0);
      const line = bookmakerOdds.total.point;
      if (line == null || ourTotal <= 0) return;

      // P(over) heuristic: 0.5 + 0.5 * tanh((ourTotal - line) / 10)
      const diff = (ourTotal - line) / 10;
      const ourProbOver = 0.5 + 0.5 * Math.tanh(diff);

      // Over
      if (bookmakerOdds.total.over && bookmakerOdds.total.over.price >= 1.0) {
        const americanOdds = decimalToAmerican(bookmakerOdds.total.over.price);
        const impliedProb = calculateImpliedProbability(americanOdds);
        const edge = ourProbOver - impliedProb;
        if (edge > 0.02) {
          const expectedValue = (ourProbOver * (1 / impliedProb - 1) - (1 - ourProbOver)) * 100;
          const confidence = Math.round(calculateBetConfidence(edge, prediction.confidence) * totalMult);
          const valueRating = getValueRating(edge, expectedValue);
          if (confidence >= 45) {
            favorableBets.push({
              type: 'total',
              totalSide: 'over',
              recommendation: `Over ${line.toFixed(1)}`,
              bookmaker: bookmakerOdds.bookmaker,
              currentOdds: {
                decimal: bookmakerOdds.total.over.price,
                american: americanOdds,
                impliedProbability: impliedProb * 100,
              },
              ourPrediction: {
                probability: ourProbOver * 100,
                expectedValue,
              },
              edge: edge * 100,
              confidence,
              reason: `Our model predicts ${ourTotal.toFixed(0)} total vs line ${line.toFixed(1)} (+${(edge * 100).toFixed(1)}% edge on Over)`,
              valueRating,
            });
          }
        }
      }

      // Under
      if (bookmakerOdds.total.under && bookmakerOdds.total.under.price >= 1.0) {
        const ourProbUnder = 1 - ourProbOver;
        const americanOdds = decimalToAmerican(bookmakerOdds.total.under.price);
        const impliedProb = calculateImpliedProbability(americanOdds);
        const edge = ourProbUnder - impliedProb;
        if (edge > 0.02) {
          const expectedValue = (ourProbUnder * (1 / impliedProb - 1) - (1 - ourProbUnder)) * 100;
          const confidence = Math.round(calculateBetConfidence(edge, prediction.confidence) * totalMult);
          const valueRating = getValueRating(edge, expectedValue);
          if (confidence >= 45) {
            favorableBets.push({
              type: 'total',
              totalSide: 'under',
              recommendation: `Under ${line.toFixed(1)}`,
              bookmaker: bookmakerOdds.bookmaker,
              currentOdds: {
                decimal: bookmakerOdds.total.under.price,
                american: americanOdds,
                impliedProbability: impliedProb * 100,
              },
              ourPrediction: {
                probability: ourProbUnder * 100,
                expectedValue,
              },
              edge: edge * 100,
              confidence,
              reason: `Our model predicts ${ourTotal.toFixed(0)} total vs line ${line.toFixed(1)} (+${(edge * 100).toFixed(1)}% edge on Under)`,
              valueRating,
            });
          }
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
    const teamIdentifier =
      bet.type === 'total' ? (bet.totalSide ?? 'over') : (bet.team ?? 'total');
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

    // Edge must match the displayed odds: our prob - implied prob (from best-price book)
    const edgeFromBestPrice =
      bestPriceBet.ourPrediction.probability - bestPriceBet.currentOdds.impliedProbability;

    // Use best-price bet's confidence so odds, edge, and confidence are internally consistent
    // Preserve marketDiscrepancyWarning from any bet in the group
    const warningBet = group.find(b => b.marketDiscrepancyWarning) ?? baseBet;
    const consolidatedBet: FavorableBet = {
      ...baseBet,
      currentOdds: bestPriceBet.currentOdds,
      ourPrediction: bestPriceBet.ourPrediction,
      edge: edgeFromBestPrice,
      confidence: bestPriceBet.confidence,
      bookmaker: bookmakers.length === 1
        ? bookmakers[0]
        : `${bookmakers.length} books`,
      bookmakers: bookmakers.length > 1 ? bookmakers : undefined,
      marketDiscrepancyWarning: warningBet.marketDiscrepancyWarning,
    };

    consolidated.push(consolidatedBet);
  });

  return consolidated;
}

/**
 * Calculate probability of covering a spread.
 * Aligned with moneyline: uses predictedSpread (derived from win prob) so spread and ML never contradict.
 * Spread convention: point is the line (e.g. away -17 => point=-17, home +17 => point=+17).
 * To cover: away -17 needs (away-home) > 17, so threshold = -point.
 */
function calculateSpreadCoverProbability(
  predictedSpread: number,
  spreadPoint: number,
  awayTeamStats: TeamStats,
  homeTeamStats: TeamStats,
  isHome: boolean = false
): number {
  // Threshold to cover: spreadPoint -17 means away needs margin > 17, so marginNeeded = -spreadPoint
  const marginNeeded = -spreadPoint;
  
  if (!isHome) {
    // Away perspective: predictedMargin = away - home = -predictedSpread
    const predictedMargin = -predictedSpread;
    const stdDev = 10;
    const zScore = (predictedMargin - marginNeeded) / stdDev;
    return Math.max(0.1, Math.min(0.9, 0.5 + 0.5 * Math.tanh(zScore)));
  } else {
    // Home perspective: predictedMargin = home - away = predictedSpread
    const predictedMargin = predictedSpread;
    const stdDev = 10;
    const zScore = (predictedMargin - marginNeeded) / stdDev;
    return Math.max(0.1, Math.min(0.9, 0.5 + 0.5 * Math.tanh(zScore)));
  }
}

/**
 * Sanity gate: when model strongly disagrees with market (e.g. heavy underdog favored),
 * downweight confidence and return a warning. Prevents presenting contrarian picks as high-confidence.
 */
function applyMarketDiscrepancySanity(
  impliedProb: number,
  ourProb: number,
  edge: number,
  currentConfidence: number,
  setConfidence: (c: number) => void
): string | undefined {
  const IMPLIED_UNDERDOG_THRESHOLD = 0.15; // Market says <15% chance
  const LARGE_EDGE_THRESHOLD = 0.25;       // We say 25%+ more than market

  if (impliedProb < IMPLIED_UNDERDOG_THRESHOLD && edge > LARGE_EDGE_THRESHOLD) {
    // Heavy underdog: market <15%, we disagree by 25%+. Downweight confidence.
    setConfidence(Math.max(40, Math.round(currentConfidence * 0.6)));
    return 'Large discrepancy vs market — consider lower stakes';
  }
  if (impliedProb < 0.20 && edge > 0.20) {
    setConfidence(Math.max(50, Math.round(currentConfidence * 0.75)));
    return undefined; // No visible warning for moderate case
  }
  return undefined;
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

