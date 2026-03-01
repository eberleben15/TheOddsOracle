/**
 * Player Props API
 * 
 * GET /api/player-props?gameId={gameId}&sport={sport}
 * Returns player prop predictions and value bets for a game.
 * 
 * GET /api/player-props?sport={sport}&limit={limit}
 * Returns all value props across upcoming games for a sport.
 */

import { NextResponse } from "next/server";
import {
  getEventPlayerProps,
  aggregatePlayerProps,
  findValuePropsForGame,
  getAllPlayerPropsForSport,
  findValuePropsForMultipleGames,
  getPropPredictionsForGame,
  getValuePropPredictions,
  savePropPredictions,
} from "@/lib/player-props";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");
    const sport = searchParams.get("sport") || "basketball_nba";
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const forceRefresh = searchParams.get("refresh") === "true";
    
    // Single game props
    if (gameId) {
      // Check if we have cached predictions
      if (!forceRefresh) {
        const cachedPredictions = await getPropPredictionsForGame(gameId);
        if (cachedPredictions.length > 0) {
          // Return cached predictions
          return NextResponse.json({
            gameId,
            predictions: cachedPredictions,
            fromCache: true,
          });
        }
      }
      
      // Fetch fresh props
      const propOdds = await getEventPlayerProps(sport, gameId, "extended");
      if (!propOdds) {
        return NextResponse.json(
          { error: "Could not fetch player props for this game" },
          { status: 404 }
        );
      }
      
      // Find value bets
      const result = await findValuePropsForGame(
        propOdds,
        propOdds.homeTeam,
        propOdds.awayTeam
      );
      
      // Save predictions to database
      await savePropPredictions(gameId, result.allPredictions);
      
      return NextResponse.json({
        ...result,
        fromCache: false,
      });
    }
    
    // All value props for a sport
    const allPropOdds = await getAllPlayerPropsForSport(sport, "default", limit);
    if (allPropOdds.length === 0) {
      return NextResponse.json({
        games: [],
        topValueBets: [],
        summary: {
          totalGames: 0,
          totalProps: 0,
          totalValueBets: 0,
          byTier: { high: 0, medium: 0, low: 0 },
        },
      });
    }
    
    const result = await findValuePropsForMultipleGames(allPropOdds);
    
    // Save all predictions
    for (const game of result.games) {
      await savePropPredictions(game.gameId, game.allPredictions);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in player props API:", error);
    return NextResponse.json(
      { error: "Failed to fetch player props" },
      { status: 500 }
    );
  }
}
