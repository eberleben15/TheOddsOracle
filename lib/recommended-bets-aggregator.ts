/**
 * Recommended Bets Aggregator
 * 
 * Analyzes all upcoming games to find the best value betting opportunities
 * across the entire slate of games.
 */

import { OddsGame, TeamStats } from "@/types";
import { getUpcomingGamesBySport } from "./odds-api";
import { getTeamSeasonStats, findTeamByName } from "./sports/unified-sports-api";
import { getSportFromGame } from "./sports/sport-detection";
import { parseOdds } from "./odds-utils";
import { analyzeFavorableBets } from "./favorable-bet-engine";
import { calculateTeamAnalytics, predictMatchup } from "./advanced-analytics";
import type { RecommendedBet } from "@/types";
import { Sport, getSportConfig } from "./sports/sport-config";
import { recommendedBetsCache } from "./recommended-bets-cache";
import { teamStatsCache } from "./team-stats-cache";

/**
 * Get recommended bets across all upcoming games for a specific sport
 * Uses caching to avoid recalculating on every request
 */
export async function getRecommendedBets(sport: Sport = "cbb", limit: number = 10): Promise<RecommendedBet[]> {
  try {
    // Check cache first
    const cached = recommendedBetsCache.get(sport);
    if (cached) {
      return cached.slice(0, limit);
    }

    const config = getSportConfig(sport);
    const oddsApiKey = config.oddsApiKey;
    
    // Fetch upcoming games with odds for the sport
    const games = await getUpcomingGamesBySport(oddsApiKey);
    
    if (games.length === 0) {
      return [];
    }

    const allBets: RecommendedBet[] = [];

    // Process games in parallel (but limit concurrency to avoid rate limits)
    const batchSize = 5;
    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (game) => {
          try {
            return await analyzeGameForBets(game);
          } catch (error) {
            console.warn(`Error analyzing game ${game.id}:`, error);
            return [];
          }
        })
      );

      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          allBets.push(...result.value);
        }
      });
    }

    // Consolidate duplicate bets (same type, team, and price from different books)
    const consolidatedBets = consolidateBets(allBets);

    // Sort by edge (highest first), then by confidence
    consolidatedBets.sort((a, b) => {
      if (Math.abs(b.edge - a.edge) > 0.5) {
        return b.edge - a.edge;
      }
      return b.confidence - a.confidence;
    });

    // Cache the results
    recommendedBetsCache.set(sport, consolidatedBets);

    // Return top N bets
    return consolidatedBets.slice(0, limit);
  } catch (error) {
    console.error("Error getting recommended bets:", error);
    return [];
  }
}

/**
 * Analyze a single game for favorable bets
 */
async function analyzeGameForBets(game: OddsGame): Promise<RecommendedBet[]> {
  try {
    // Detect sport from game
    const sport = getSportFromGame(game);
    
    // Parse odds
    const parsedOdds = parseOdds(game);
    if (parsedOdds.length === 0) {
      return [];
    }

    // Get team stats
    const awayTeamName = game.away_team;
    const homeTeamName = game.home_team;

    const [awayTeam, homeTeam] = await Promise.all([
      findTeamByName(sport, awayTeamName),
      findTeamByName(sport, homeTeamName),
    ]);

    if (!awayTeam || !homeTeam) {
      return [];
    }

    // Check cache for team stats first
    let awayTeamStats = teamStatsCache.get(sport, awayTeamName);
    let homeTeamStats = teamStatsCache.get(sport, homeTeamName);

    // Fetch missing stats
    if (!awayTeamStats) {
      awayTeamStats = await getTeamSeasonStats(sport, awayTeamName);
      if (awayTeamStats) {
        teamStatsCache.set(sport, awayTeamName, awayTeamStats);
      }
    }
    if (!homeTeamStats) {
      homeTeamStats = await getTeamSeasonStats(sport, homeTeamName);
      if (homeTeamStats) {
        teamStatsCache.set(sport, homeTeamName, homeTeamStats);
      }
    }

    if (!awayTeamStats || !homeTeamStats) {
      return [];
    }

    const awayAnalytics = calculateTeamAnalytics(
      awayTeamStats,
      awayTeamStats.recentGames || [],
      false,
      sport
    );
    const homeAnalytics = calculateTeamAnalytics(
      homeTeamStats,
      homeTeamStats.recentGames || [],
      true,
      sport
    );

    const prediction = predictMatchup(
      awayAnalytics,
      homeAnalytics,
      awayTeamStats,
      homeTeamStats,
      sport
    );

    // Analyze favorable bets
    const analysis = analyzeFavorableBets(
      game,
      parsedOdds,
      prediction,
      awayTeamStats,
      homeTeamStats
    );

    // Convert to RecommendedBet format
    const recommendedBets: RecommendedBet[] = analysis.bets.map((bet, idx) => {
      // Format game time
      const gameTime = game.commence_time
        ? new Date(game.commence_time).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : 'TBD';

      // Ensure decimal odds are stored correctly (should already be decimal from API)
      const decimalOdds = bet.currentOdds.decimal;
      
      // Validate odds are reasonable
      if (decimalOdds < 1.0) {
        console.warn(`[getRecommendedBets] Invalid decimal odds for bet ${bet.recommendation}: ${decimalOdds}`);
      }

      return {
        id: `${game.id}-${bet.type}-${bet.team || 'total'}-${bet.currentOdds.decimal.toFixed(2)}-${idx}`,
        gameId: game.id,
        gameTitle: `${awayTeamName} @ ${homeTeamName}`,
        gameTime: gameTime,
        type: bet.type,
        recommendation: bet.recommendation,
        bookmaker: bet.bookmaker,
        bookmakers: bet.bookmakers, // Include all bookmakers
        currentOdds: {
          decimal: decimalOdds, // Store as decimal (primary format)
          american: bet.currentOdds.american,
          impliedProbability: bet.currentOdds.impliedProbability,
        },
        ourPrediction: bet.ourPrediction,
        edge: bet.edge,
        confidence: bet.confidence,
        reason: bet.reason,
        valueRating: bet.valueRating,
        team: bet.team, // Preserve team info for consolidation
      };
    });

    return recommendedBets;
  } catch (error) {
    console.error(`Error analyzing game ${game.id}:`, error);
    return [];
  }
}

/**
 * Consolidate bets by grouping same type/team/price bets and listing all books
 * Groups bets that have the same game, type, team (for ML/spread), and price
 */
function consolidateBets(bets: RecommendedBet[]): RecommendedBet[] {
  // Group bets by: gameId, type, team identifier, and price (rounded to 2 decimals for matching)
  const betGroups = new Map<string, RecommendedBet[]>();

  bets.forEach((bet) => {
    // Use team field for grouping (more reliable than parsing recommendation)
    let teamIdentifier = '';
    if (bet.type === 'moneyline' || bet.type === 'spread') {
      teamIdentifier = bet.team || 'unknown';
    } else {
      teamIdentifier = 'total';
    }

    // Create a key: gameId-type-teamIdentifier-price (rounded to 2 decimals for matching)
    // Round price to 2 decimals to group similar prices together (within 0.01)
    const priceKey = bet.currentOdds.decimal.toFixed(2);
    const key = `${bet.gameId}-${bet.type}-${teamIdentifier}-${priceKey}`;

    if (!betGroups.has(key)) {
      betGroups.set(key, []);
    }
    betGroups.get(key)!.push(bet);
  });

  // Consolidate each group
  const consolidated: RecommendedBet[] = [];

  betGroups.forEach((group, key) => {
    if (group.length === 0) return;

    // Use the bet with highest edge as the base
    const baseBet = group.reduce((best, current) => 
      current.edge > best.edge ? current : best
    );

    // Collect all unique bookmakers offering this bet
    const bookmakers = Array.from(new Set(group.map(b => b.bookmaker)));

    // Calculate average edge and confidence for the group
    const avgEdge = group.reduce((sum, b) => sum + b.edge, 0) / group.length;
    const avgConfidence = group.reduce((sum, b) => sum + b.confidence, 0) / group.length;

    // Extract team identifier and price from key for the ID
    const parts = key.split('-');
    const teamId = parts.length >= 3 ? parts[2] : 'unknown';
    const priceKey = parts.length >= 4 ? parts[3] : 'unknown';

    // Create consolidated bet with unique ID that includes price to avoid duplicates
    const consolidatedBet: RecommendedBet = {
      ...baseBet,
      id: `${baseBet.gameId}-${baseBet.type}-${teamId}-${priceKey}-consolidated`,
      bookmaker: bookmakers.length === 1 
        ? bookmakers[0] 
        : `${bookmakers.length} books`,
      edge: avgEdge, // Use average edge
      confidence: avgConfidence, // Use average confidence
      bookmakers: bookmakers, // Store all bookmakers
      team: baseBet.team, // Preserve team info
    };

    consolidated.push(consolidatedBet);
  });

  return consolidated;
}

