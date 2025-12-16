/**
 * Stats API Route - Powered by SportsData.io
 * 
 * Endpoints:
 * - GET /api/stats?type=team&name=Wisconsin - Get team season stats
 * - GET /api/stats?type=recent&teamKey=WIS&limit=5 - Get recent games
 * - GET /api/stats?type=h2h&team1=WIS&team2=MICH - Get head-to-head
 * - GET /api/stats?type=schedule&teamKey=WIS - Get team schedule
 * - GET /api/stats?type=boxscore&gameId=12345 - Get box score
 * - GET /api/stats?type=players&teamKey=WIS - Get player stats
 * - GET /api/stats?type=standings&conference=Big Ten - Get conference standings
 * - GET /api/stats?type=test - Test API connection
 */

import { NextResponse } from "next/server";
import {
  getTeamSeasonStats,
  getTeamRecentGames,
  getHeadToHead,
  getTeamSchedule,
  getBoxScore,
  getTeamPlayerStats,
  getConferenceStandings,
  testConnection,
  findTeamByName,
  isConfigured,
} from "@/lib/sportsdata-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Check if API is configured
    if (!isConfigured()) {
      return NextResponse.json(
        { 
          error: "SportsData.io API key not configured",
          help: "Set SPORTSDATA_API_KEY in your .env.local file"
        },
        { status: 503 }
      );
    }

    // Test connection
    if (type === "test") {
      const result = await testConnection();
      return NextResponse.json(result);
    }

    // Get team stats
    if (type === "team") {
      const name = searchParams.get("name");
      if (!name) {
        return NextResponse.json(
          { error: "Missing 'name' parameter" },
          { status: 400 }
        );
      }
      
      const stats = await getTeamSeasonStats(name);
      if (!stats) {
        return NextResponse.json(
          { error: `Team not found: ${name}` },
          { status: 404 }
        );
      }
      
      return NextResponse.json(stats);
    }

    // Get recent games
    if (type === "recent") {
      const teamKey = searchParams.get("teamKey");
      const limit = parseInt(searchParams.get("limit") || "5");
      
      if (!teamKey) {
        return NextResponse.json(
          { error: "Missing 'teamKey' parameter" },
          { status: 400 }
        );
      }
      
      const games = await getTeamRecentGames(teamKey, limit);
      return NextResponse.json(games);
    }

    // Get head-to-head
    if (type === "h2h") {
      const team1 = searchParams.get("team1");
      const team2 = searchParams.get("team2");
      const limit = parseInt(searchParams.get("limit") || "5");
      
      if (!team1 || !team2) {
        return NextResponse.json(
          { error: "Missing 'team1' and/or 'team2' parameters" },
          { status: 400 }
        );
      }
      
      const games = await getHeadToHead(team1, team2, limit);
      return NextResponse.json(games);
    }

    // Get team schedule
    if (type === "schedule") {
      const teamKey = searchParams.get("teamKey");
      
      if (!teamKey) {
        return NextResponse.json(
          { error: "Missing 'teamKey' parameter" },
          { status: 400 }
        );
      }
      
      const schedule = await getTeamSchedule(teamKey);
      return NextResponse.json(schedule);
    }

    // Get box score
    if (type === "boxscore") {
      const gameId = searchParams.get("gameId");
      
      if (!gameId) {
        return NextResponse.json(
          { error: "Missing 'gameId' parameter" },
          { status: 400 }
        );
      }
      
      const boxScore = await getBoxScore(parseInt(gameId));
      if (!boxScore) {
        return NextResponse.json(
          { error: `Box score not found for game: ${gameId}` },
          { status: 404 }
        );
      }
      
      return NextResponse.json(boxScore);
    }

    // Get player stats
    if (type === "players") {
      const teamKey = searchParams.get("teamKey");
      
      if (!teamKey) {
        return NextResponse.json(
          { error: "Missing 'teamKey' parameter" },
          { status: 400 }
        );
      }
      
      const players = await getTeamPlayerStats(teamKey);
      return NextResponse.json(players);
    }

    // Get conference standings
    if (type === "standings") {
      const conference = searchParams.get("conference");
      
      if (!conference) {
        return NextResponse.json(
          { error: "Missing 'conference' parameter" },
          { status: 400 }
        );
      }
      
      const standings = await getConferenceStandings(conference);
      return NextResponse.json(standings);
    }

    // Find team by name
    if (type === "findTeam") {
      const name = searchParams.get("name");
      
      if (!name) {
        return NextResponse.json(
          { error: "Missing 'name' parameter" },
          { status: 400 }
        );
      }
      
      const team = await findTeamByName(name);
      if (!team) {
        return NextResponse.json(
          { error: `Team not found: ${name}` },
          { status: 404 }
        );
      }
      
      return NextResponse.json(team);
    }

    // Invalid type
    return NextResponse.json(
      { 
        error: "Invalid 'type' parameter",
        validTypes: ["team", "recent", "h2h", "schedule", "boxscore", "players", "standings", "findTeam", "test"]
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in stats API route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
