import { NextResponse } from "next/server";
import { getTeamStats, getRecentGames, getHeadToHead } from "@/lib/stats-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'team', 'recent', 'h2h'
    const teamId = searchParams.get("teamId");
    const team1Id = searchParams.get("team1Id");
    const team2Id = searchParams.get("team2Id");
    const limit = searchParams.get("limit");

    if (type === "team" && teamId) {
      const stats = await getTeamStats(parseInt(teamId));
      return NextResponse.json(stats);
    }

    if (type === "recent" && teamId) {
      const games = await getRecentGames(
        parseInt(teamId),
        limit ? parseInt(limit) : 10
      );
      return NextResponse.json(games);
    }

    if (type === "h2h" && team1Id && team2Id) {
      const h2h = await getHeadToHead(
        parseInt(team1Id),
        parseInt(team2Id)
      );
      return NextResponse.json(h2h);
    }

    return NextResponse.json(
      { error: "Invalid parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in stats API route:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

