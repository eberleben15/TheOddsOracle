import { getUpcomingGames, getGameOdds } from "@/lib/odds-api";
import {
  getTeamStats,
  getRecentGames,
  getHeadToHead,
} from "@/lib/stats-api";
import { StatsDisplay } from "@/components/StatsDisplay";
import { MatchupHeader } from "@/components/MatchupHeader";
import { notFound } from "next/navigation";

interface MatchupPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MatchupPage({ params }: MatchupPageProps) {
  const { id: gameId } = await params;

  // Fetch game details
  let game = null;
  try {
    game = await getGameOdds(gameId);
  } catch (error) {
    console.error("Error fetching game:", error);
  }

  if (!game) {
    notFound();
  }

  // For now, we'll use mock data for stats since we need team IDs
  // In production, you'd map team names to IDs from your stats API
  const homeTeamId = 1; // Placeholder - map from team name
  const awayTeamId = 2; // Placeholder - map from team name

  let homeTeamStats, awayTeamStats, recentGames, headToHead;

  try {
    [homeTeamStats, awayTeamStats] = await Promise.all([
      getTeamStats(homeTeamId),
      getTeamStats(awayTeamId),
    ]);

    const [homeRecent, awayRecent] = await Promise.all([
      getRecentGames(homeTeamId, 10),
      getRecentGames(awayTeamId, 10),
    ]);

    recentGames = {
      home: homeRecent,
      away: awayRecent,
    };

    headToHead = await getHeadToHead(awayTeamId, homeTeamId);
  } catch (error) {
    console.error("Error fetching stats:", error);
    // Use mock data as fallback
    homeTeamStats = null;
    awayTeamStats = null;
    recentGames = { home: [], away: [] };
    headToHead = null;
  }

  // If stats are null, use mock data
  if (!homeTeamStats || !awayTeamStats) {
    const {
      getMockTeamStats,
      getMockRecentGames,
      getMockHeadToHead,
    } = await import("@/lib/stats-api");
    homeTeamStats = getMockTeamStats(homeTeamId);
    awayTeamStats = getMockTeamStats(awayTeamId);
    recentGames = {
      home: getMockRecentGames(homeTeamId, 10),
      away: getMockRecentGames(awayTeamId, 10),
    };
    headToHead = getMockHeadToHead(awayTeamId, homeTeamId);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <MatchupHeader game={game} />

        {homeTeamStats && awayTeamStats && (
          <StatsDisplay
            homeTeamStats={homeTeamStats}
            awayTeamStats={awayTeamStats}
            recentGames={recentGames}
            headToHead={headToHead || undefined}
          />
        )}
      </div>
    </main>
  );
}

