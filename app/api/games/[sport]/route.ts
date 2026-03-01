/**
 * API Route: Get games by sport
 * GET /api/games/[sport]
 * 
 * Returns live and upcoming games for a specific sport with team logos.
 */

import { NextRequest, NextResponse } from "next/server";
import { getLiveGamesBySport, getUpcomingGamesBySport } from "@/lib/odds-api";
import { getTeamLogoUrl } from "@/lib/sports/unified-sports-api";
import { Sport, getSportConfig, SPORT_CONFIGS } from "@/lib/sports/sport-config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sport: string }> }
) {
  const { sport: sportParam } = await params;
  const sport = sportParam as Sport;

  if (!sport || !(sport in SPORT_CONFIGS)) {
    return NextResponse.json(
      { error: "Invalid sport" },
      { status: 400 }
    );
  }

  try {
    const config = getSportConfig(sport);
    const oddsApiKey = config.oddsApiKey;

    const [liveGames, upcomingGames] = await Promise.all([
      getLiveGamesBySport(oddsApiKey).catch(() => []),
      getUpcomingGamesBySport(oddsApiKey).catch(() => []),
    ]);

    // Filter out live games from upcoming
    const liveGameIds = new Set(liveGames.map((g) => g.id));
    const filteredUpcoming = upcomingGames.filter((game) => !liveGameIds.has(game.id));

    // Fetch team logos
    const teamLogos: Record<string, string> = {};
    if (liveGames.length > 0 || filteredUpcoming.length > 0) {
      const teamNames = new Set<string>();
      for (const g of filteredUpcoming) {
        teamNames.add(g.home_team);
        teamNames.add(g.away_team);
      }
      for (const g of liveGames) {
        teamNames.add(g.home_team);
        teamNames.add(g.away_team);
      }
      
      const results = await Promise.all(
        Array.from(teamNames).map(async (name) => {
          const url = await getTeamLogoUrl(sport, name);
          return { name, url } as const;
        })
      );
      
      for (const { name, url } of results) {
        if (url) teamLogos[name] = url;
      }
    }

    return NextResponse.json({
      sport,
      liveGames,
      upcomingGames: filteredUpcoming,
      teamLogos,
    });
  } catch (error) {
    console.error(`[API games/${sport}] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch games" },
      { status: 500 }
    );
  }
}
