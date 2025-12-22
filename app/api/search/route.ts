import { NextRequest, NextResponse } from "next/server";
import { getUpcomingGames, getLiveGames } from "@/lib/odds-api";
import { OddsGame, LiveGame } from "@/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const searchTerm = query.trim().toLowerCase();

  try {
    // Fetch both live and upcoming games
    const [liveGames, upcomingGames] = await Promise.all([
      getLiveGames().catch(() => []),
      getUpcomingGames().catch(() => []),
    ]);

    // Combine all games and deduplicate by ID (prefer live games over upcoming)
    const gamesMap = new Map<string, OddsGame | LiveGame>();
    
    // Add upcoming games first
    upcomingGames.forEach((game) => {
      gamesMap.set(game.id, game);
    });
    
    // Add live games (will overwrite upcoming if same ID, which is what we want)
    liveGames.forEach((game) => {
      gamesMap.set(game.id, game);
    });
    
    const allGames = Array.from(gamesMap.values());

    // Score and filter games by search term (better matching algorithm)
    const scoredGames = allGames
      .map((game) => {
        const homeTeam = (game.home_team || "").toLowerCase();
        const awayTeam = (game.away_team || "").toLowerCase();
        const sportTitle = (game.sport_title || "").toLowerCase();
        const fullMatchup = `${awayTeam} vs ${homeTeam}`.toLowerCase();

        let score = 0;
        let matches = false;

        // Exact match (highest priority)
        if (homeTeam === searchTerm || awayTeam === searchTerm) {
          score = 100;
          matches = true;
        }
        // Starts with (high priority)
        else if (homeTeam.startsWith(searchTerm) || awayTeam.startsWith(searchTerm)) {
          score = 80;
          matches = true;
        }
        // Contains in team name (medium priority)
        else if (homeTeam.includes(searchTerm) || awayTeam.includes(searchTerm)) {
          score = 60;
          matches = true;
        }
        // Contains in full matchup string (lower priority)
        else if (fullMatchup.includes(searchTerm)) {
          score = 40;
          matches = true;
        }
        // Sport title match (lowest priority)
        else if (sportTitle.includes(searchTerm)) {
          score = 20;
          matches = true;
        }

        // Boost score for live games
        const isLive = "scores" in game && game.scores && game.scores.length > 0;
        if (isLive && matches) {
          score += 10;
        }

        return { game, score, matches };
      })
      .filter((item) => item.matches)
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .map((item) => item.game);

    // Extract unique teams from all games (not just matching)
    const allTeams = new Set<string>();
    allGames.forEach((game) => {
      if (game.home_team) allTeams.add(game.home_team);
      if (game.away_team) allTeams.add(game.away_team);
    });

    // Score and filter teams that match the search term
    const scoredTeams = Array.from(allTeams)
      .map((team) => {
        const teamLower = team.toLowerCase();
        let score = 0;
        let matches = false;

        // Exact match
        if (teamLower === searchTerm) {
          score = 100;
          matches = true;
        }
        // Starts with
        else if (teamLower.startsWith(searchTerm)) {
          score = 80;
          matches = true;
        }
        // Contains
        else if (teamLower.includes(searchTerm)) {
          score = 60;
          matches = true;
        }

        return { team, score, matches };
      })
      .filter((item) => item.matches)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.team);

    return NextResponse.json({
      query: searchTerm,
      games: scoredGames.slice(0, 20), // Limit to 20 games
      teams: scoredTeams.slice(0, 10), // Limit to 10 teams
      totalGames: scoredGames.length,
      totalTeams: scoredTeams.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to perform search", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

