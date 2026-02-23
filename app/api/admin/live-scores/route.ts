/**
 * Live Scores API
 * 
 * Fetches live game scores from ESPN for games that are currently in progress.
 * Used to update prediction cards with real-time scores.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";

interface LiveScore {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "pre" | "in" | "post";
  statusDetail: string;
  period: string;
  clock: string;
}

interface ESPNCompetitor {
  homeAway: "home" | "away";
  team: { displayName: string; shortDisplayName?: string };
  score?: string | number;
}

interface ESPNStatus {
  type?: {
    id?: string;
    name?: string;
    state?: string;
    completed?: boolean;
    description?: string;
    shortDetail?: string;
  };
  period?: number;
  displayClock?: string;
}

interface ESPNEvent {
  id: string;
  name: string;
  competitions?: Array<{
    competitors?: ESPNCompetitor[];
    status?: ESPNStatus;
  }>;
}

interface ESPNScoreboardResponse {
  events?: ESPNEvent[];
}

const SPORT_ESPN_MAP: Record<string, { sport: string; league: string }> = {
  basketball_ncaab: { sport: "basketball", league: "mens-college-basketball" },
  basketball_nba: { sport: "basketball", league: "nba" },
  icehockey_nhl: { sport: "hockey", league: "nhl" },
  baseball_mlb: { sport: "baseball", league: "mlb" },
};

async function fetchESPNScoreboard(sport: string, league: string): Promise<ESPNEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
  
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 }, // Cache for 30 seconds
    });
    
    if (!res.ok) {
      console.error(`ESPN scoreboard fetch failed for ${league}:`, res.status);
      return [];
    }
    
    const data: ESPNScoreboardResponse = await res.json();
    return data.events || [];
  } catch (error) {
    console.error(`ESPN scoreboard error for ${league}:`, error);
    return [];
  }
}

function parseScore(score: string | number | undefined): number {
  if (score == null) return 0;
  if (typeof score === "number") return score;
  return parseInt(score, 10) || 0;
}

function mapEventToLiveScore(event: ESPNEvent, sportKey: string): LiveScore | null {
  const competition = event.competitions?.[0];
  if (!competition?.competitors) return null;

  const homeComp = competition.competitors.find((c) => c.homeAway === "home");
  const awayComp = competition.competitors.find((c) => c.homeAway === "away");
  if (!homeComp || !awayComp) return null;

  const status = competition.status;
  const stateStr = status?.type?.state || "pre";
  const gameStatus: "pre" | "in" | "post" = 
    stateStr === "in" ? "in" : 
    stateStr === "post" ? "post" : "pre";

  return {
    gameId: event.id,
    homeTeam: homeComp.team.displayName,
    awayTeam: awayComp.team.displayName,
    homeScore: parseScore(homeComp.score),
    awayScore: parseScore(awayComp.score),
    status: gameStatus,
    statusDetail: status?.type?.shortDetail || status?.type?.description || "",
    period: status?.period ? `${status.period}` : "",
    clock: status?.displayClock || "",
  };
}

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const sports = searchParams.get("sports")?.split(",") || Object.keys(SPORT_ESPN_MAP);
    const gameIds = searchParams.get("gameIds")?.split(",");

    const allScores: LiveScore[] = [];

    // Fetch scoreboards for each sport
    for (const sportKey of sports) {
      const espnConfig = SPORT_ESPN_MAP[sportKey];
      if (!espnConfig) continue;

      const events = await fetchESPNScoreboard(espnConfig.sport, espnConfig.league);
      
      for (const event of events) {
        const liveScore = mapEventToLiveScore(event, sportKey);
        if (liveScore) {
          allScores.push(liveScore);
        }
      }
    }

    // Filter to specific gameIds if provided (by matching team names since we don't have ESPN IDs stored)
    let filteredScores = allScores;
    if (gameIds && gameIds.length > 0) {
      // We'll return all live/in-progress games and let the client match by team names
      filteredScores = allScores.filter(s => s.status === "in" || s.status === "post");
    }

    return NextResponse.json({
      scores: filteredScores,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching live scores:", error);
    return NextResponse.json(
      { error: "Failed to fetch live scores" },
      { status: 500 }
    );
  }
}
