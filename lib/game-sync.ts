/**
 * Game Sync Service
 * 
 * Discovers new games from the Odds API and ensures every game
 * gets tracked and has a prediction generated.
 */

import { prisma } from "./prisma";
import { getUpcomingGames } from "./odds-api";
import { generatePredictionForGame } from "./prediction-generator";
import type { OddsGame } from "@/types";

/** Sports to track and generate predictions for */
export const TRACKED_SPORTS = [
  "basketball_ncaab",
  "basketball_nba",
  "icehockey_nhl",
  "baseball_mlb",
] as const;

export type TrackedSport = (typeof TRACKED_SPORTS)[number];

export interface GameSyncResult {
  success: boolean;
  gamesDiscovered: number;
  newGames: number;
  predictionsGenerated: number;
  errors: string[];
  sportBreakdown: Record<string, { discovered: number; new: number; predicted: number }>;
  duration: number;
}

/**
 * Extract odds snapshot from game data
 */
function extractOddsSnapshot(game: OddsGame): Record<string, unknown> | null {
  if (!game.bookmakers?.length) return null;
  
  const bookmaker = game.bookmakers[0];
  const snapshot: Record<string, unknown> = {};
  
  for (const market of bookmaker.markets || []) {
    if (market.key === "spreads" && market.outcomes?.length >= 2) {
      const homeOutcome = market.outcomes.find(o => o.name === game.home_team);
      if (homeOutcome?.point != null) {
        snapshot.spread = homeOutcome.point;
      }
    }
    if (market.key === "totals" && market.outcomes?.length >= 1) {
      const overOutcome = market.outcomes.find(o => o.name === "Over");
      if (overOutcome?.point != null) {
        snapshot.total = overOutcome.point;
      }
    }
    if (market.key === "h2h" && market.outcomes?.length >= 2) {
      const homeOutcome = market.outcomes.find(o => o.name === game.home_team);
      const awayOutcome = market.outcomes.find(o => o.name === game.away_team);
      if (homeOutcome?.price != null && awayOutcome?.price != null) {
        snapshot.moneyline = {
          home: homeOutcome.price,
          away: awayOutcome.price,
        };
      }
    }
  }
  
  return Object.keys(snapshot).length > 0 ? snapshot : null;
}

/**
 * Sync games from the Odds API
 * 
 * 1. Fetches upcoming games for all tracked sports
 * 2. Stores new games in TrackedGame table
 * 3. Generates predictions for games that don't have one
 */
export async function syncGames(sportsFilter?: string[]): Promise<GameSyncResult> {
  const startTime = Date.now();
  const result: GameSyncResult = {
    success: true,
    gamesDiscovered: 0,
    newGames: 0,
    predictionsGenerated: 0,
    errors: [],
    sportBreakdown: {},
    duration: 0,
  };

  // Use filtered sports or all tracked sports
  const sportsToSync = sportsFilter?.length ? sportsFilter : TRACKED_SPORTS;
  console.log("\n🔄 Starting game sync...\n");
  console.log(`   Sports: ${sportsToSync.join(", ")}`);

  // Process each sport
  for (const sport of sportsToSync) {
    const sportStats = { discovered: 0, new: 0, predicted: 0 };
    
    try {
      // Fetch upcoming games from Odds API
      const games = await getUpcomingGames(sport, "us", "h2h,spreads,totals");
      sportStats.discovered = games.length;
      result.gamesDiscovered += games.length;
      
      console.log(`📊 ${sport}: Found ${games.length} games`);
      
      // Process each game
      for (const game of games) {
        try {
          // Check if we already track this game
          const existingGame = await prisma.trackedGame.findUnique({
            where: { externalId: game.id },
          });
          
          if (!existingGame) {
            // New game - add to tracking
            const oddsSnapshot = extractOddsSnapshot(game);
            
            await prisma.trackedGame.create({
              data: {
                externalId: game.id,
                sport: game.sport_key,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                commenceTime: new Date(game.commence_time),
                oddsSnapshot: oddsSnapshot ?? undefined,
                status: "pending",
              },
            });
            
            sportStats.new++;
            result.newGames++;
            console.log(`  ✨ New: ${game.away_team} @ ${game.home_team}`);
          }
          
          // Generate prediction if needed (either new game or existing without prediction)
          const trackedGame = existingGame ?? await prisma.trackedGame.findUnique({
            where: { externalId: game.id },
          });
          
          if (trackedGame && trackedGame.status === "pending" && !trackedGame.predictionId) {
            const predictionResult = await generatePredictionForGame(game);
            
            if (predictionResult.success && predictionResult.predictionId) {
              await prisma.trackedGame.update({
                where: { id: trackedGame.id },
                data: {
                  predictionId: predictionResult.predictionId,
                  predictedAt: new Date(),
                  status: "predicted",
                },
              });
              
              sportStats.predicted++;
              result.predictionsGenerated++;
              console.log(`  ✅ Predicted: ${game.away_team} @ ${game.home_team}`);
            } else if (predictionResult.error) {
              result.errors.push(`${game.away_team} @ ${game.home_team}: ${predictionResult.error}`);
            }
          }
        } catch (gameError) {
          const errorMsg = `Error processing ${game.away_team} @ ${game.home_team}: ${gameError instanceof Error ? gameError.message : String(gameError)}`;
          result.errors.push(errorMsg);
          console.error(`  ❌ ${errorMsg}`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 50));
      }
      
      result.sportBreakdown[sport] = sportStats;
      
      // Delay between sports for rate limiting
      await new Promise(r => setTimeout(r, 200));
      
    } catch (sportError) {
      const errorMsg = `Error fetching ${sport}: ${sportError instanceof Error ? sportError.message : String(sportError)}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      result.sportBreakdown[sport] = sportStats;
    }
  }

  // Mark completed games
  await markCompletedGames();

  result.duration = Date.now() - startTime;
  result.success = result.errors.length === 0;
  
  console.log(`\n✅ Game sync complete: ${result.newGames} new games, ${result.predictionsGenerated} predictions in ${result.duration}ms\n`);
  
  return result;
}

/**
 * Mark games as completed if they've passed
 */
async function markCompletedGames(): Promise<void> {
  const now = new Date();
  
  // Mark games that have started as "completed" (for cleanup)
  // Keep predicted games for 7 days after start for outcome recording
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  await prisma.trackedGame.updateMany({
    where: {
      commenceTime: { lt: sevenDaysAgo },
      status: { in: ["pending", "predicted"] },
    },
    data: {
      status: "completed",
    },
  });
}

/**
 * Get sync statistics
 */
export async function getSyncStats(): Promise<{
  totalTracked: number;
  pending: number;
  predicted: number;
  completed: number;
  bySport: Record<string, number>;
}> {
  const [total, pending, predicted, completed] = await Promise.all([
    prisma.trackedGame.count(),
    prisma.trackedGame.count({ where: { status: "pending" } }),
    prisma.trackedGame.count({ where: { status: "predicted" } }),
    prisma.trackedGame.count({ where: { status: "completed" } }),
  ]);
  
  const bySportRaw = await prisma.trackedGame.groupBy({
    by: ["sport"],
    _count: true,
  });
  
  const bySport: Record<string, number> = {};
  for (const row of bySportRaw) {
    bySport[row.sport] = row._count;
  }
  
  return { totalTracked: total, pending, predicted, completed, bySport };
}
