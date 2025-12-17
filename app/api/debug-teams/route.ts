/**
 * Debug endpoint to check team ID lookups
 * Usage: http://localhost:3000/api/debug-teams?team=Nebraska
 */

import { NextRequest, NextResponse } from "next/server";
import { searchTeamByName } from "@/lib/stats-api-new";
import { getTeamInfo, lookupTeamInDatabase } from "@/lib/teams-database";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const teamName = searchParams.get("team");

  if (!teamName) {
    return NextResponse.json(
      { error: "Missing 'team' parameter. Usage: /api/debug-teams?team=Wisconsin" },
      { status: 400 }
    );
  }

  try {
    // Check database first - use lookupTeamInDatabase which searches by name
    const dbTeamId = lookupTeamInDatabase(teamName);
    const dbTeam = dbTeamId ? getTeamInfo(dbTeamId) : null;
    
    // Check API search
    const apiTeamId = await searchTeamByName(teamName);

    return NextResponse.json({
      query: teamName,
      database: dbTeam ? {
        found: true,
        id: dbTeam.id,
        name: dbTeam.name,
        code: dbTeam.code,
      } : {
        found: false,
      },
      api: {
        teamId: apiTeamId,
        source: dbTeam ? "database" : "api_search",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Failed to lookup team",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

