import { TeamStats, GameResult, HeadToHead } from "@/types";

// API Basketball base URL
const API_BASKETBALL_BASE_URL = "https://api-basketball.p.rapidapi.com";

// Note: This is a placeholder implementation
// You'll need to sign up for API Basketball at https://www.api-basketball.com/
// and configure the API key in your .env.local file

export async function getTeamStats(teamId: number): Promise<TeamStats | null> {
  const apiKey = process.env.STATS_API_KEY;

  if (!apiKey) {
    console.warn("STATS_API_KEY is not set. Using mock data.");
    return getMockTeamStats(teamId);
  }

  try {
    // Example endpoint - adjust based on actual API Basketball documentation
    const url = `${API_BASKETBALL_BASE_URL}/teams/statistics?team=${teamId}&season=2023-2024`;
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "api-basketball.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch team stats: ${response.statusText}`);
    }

    const data = await response.json();
    // Transform API response to our TeamStats type
    // Adjust based on actual API response structure
    return transformToTeamStats(data);
  } catch (error) {
    console.error("Error fetching team stats:", error);
    return getMockTeamStats(teamId);
  }
}

export async function getRecentGames(
  teamId: number,
  limit: number = 10
): Promise<GameResult[]> {
  const apiKey = process.env.STATS_API_KEY;

  if (!apiKey) {
    console.warn("STATS_API_KEY is not set. Using mock data.");
    return getMockRecentGames(teamId, limit);
  }

  try {
    // Example endpoint - adjust based on actual API Basketball documentation
    const url = `${API_BASKETBALL_BASE_URL}/games?team=${teamId}&last=${limit}`;
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "api-basketball.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recent games: ${response.statusText}`);
    }

    const data = await response.json();
    // Transform API response to our GameResult type
    return transformToGameResults(data);
  } catch (error) {
    console.error("Error fetching recent games:", error);
    return getMockRecentGames(teamId, limit);
  }
}

export async function getHeadToHead(
  team1Id: number,
  team2Id: number
): Promise<HeadToHead | null> {
  const apiKey = process.env.STATS_API_KEY;

  if (!apiKey) {
    console.warn("STATS_API_KEY is not set. Using mock data.");
    return getMockHeadToHead(team1Id, team2Id);
  }

  try {
    // Example endpoint - adjust based on actual API Basketball documentation
    const url = `${API_BASKETBALL_BASE_URL}/games?h2h=${team1Id}-${team2Id}`;
    const response = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "api-basketball.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch head-to-head: ${response.statusText}`);
    }

    const data = await response.json();
    return transformToHeadToHead(data, team1Id, team2Id);
  } catch (error) {
    console.error("Error fetching head-to-head:", error);
    return getMockHeadToHead(team1Id, team2Id);
  }
}

// Mock data functions for development/testing
export function getMockTeamStats(teamId: number): TeamStats {
  return {
    id: teamId,
    name: `Team ${teamId}`,
    code: `T${teamId}`,
    wins: Math.floor(Math.random() * 20) + 10,
    losses: Math.floor(Math.random() * 10) + 5,
    pointsPerGame: Math.floor(Math.random() * 20) + 70,
    pointsAllowedPerGame: Math.floor(Math.random() * 15) + 65,
    recentGames: [],
  };
}

export function getMockRecentGames(teamId: number, limit: number): GameResult[] {
  const games: GameResult[] = [];
  for (let i = 0; i < limit; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i - 1);
    games.push({
      id: i,
      date: date.toISOString(),
      homeTeam: `Team ${teamId}`,
      awayTeam: `Opponent ${i}`,
      homeScore: Math.floor(Math.random() * 40) + 60,
      awayScore: Math.floor(Math.random() * 40) + 60,
      winner: Math.random() > 0.5 ? `Team ${teamId}` : `Opponent ${i}`,
    });
  }
  return games;
}

export function getMockHeadToHead(
  team1Id: number,
  team2Id: number
): HeadToHead {
  const games = getMockRecentGames(team1Id, 5);
  return {
    games,
    homeTeamWins: Math.floor(Math.random() * 3) + 2,
    awayTeamWins: Math.floor(Math.random() * 3),
  };
}

// Transform functions - adjust based on actual API response structure
function transformToTeamStats(data: any): TeamStats {
  // Implement based on actual API response
  return getMockTeamStats(1);
}

function transformToGameResults(data: any): GameResult[] {
  // Implement based on actual API response
  return getMockRecentGames(1, 10);
}

function transformToHeadToHead(
  data: any,
  team1Id: number,
  team2Id: number
): HeadToHead {
  // Implement based on actual API response
  return getMockHeadToHead(team1Id, team2Id);
}

