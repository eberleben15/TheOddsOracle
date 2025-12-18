import { getUpcomingGames, getLiveGames } from "@/lib/odds-api";
import { MatchupCard } from "@/components/MatchupCard";
import { LiveGameCard } from "@/components/LiveGameCard";
import { StatusCard } from "@/components/StatusCard";
import { StatsCards } from "@/components/StatsCards";

export const revalidate = 30; // Revalidate every 30 seconds for live scores

export default async function DashboardPage() {
  let upcomingGames = [];
  let liveGames = [];
  let error = null;

  try {
    // Fetch both live and upcoming games in parallel
    const [live, upcoming] = await Promise.all([
      getLiveGames().catch(() => []), // Don't fail if live games fail
      getUpcomingGames(),
    ]);
    
    liveGames = live;
    
    // Filter out live games from upcoming to avoid duplicates
    const liveGameIds = new Set(liveGames.map(g => g.id));
    upcomingGames = upcoming.filter(game => !liveGameIds.has(game.id));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load games";
    console.error("Error loading games:", err);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-dark mb-2">College Basketball</h1>
        <p className="text-text-body">Live scores, upcoming matchups, and betting insights</p>
      </div>

      {error && (
        <StatusCard
          type="error"
          message={`${error}. Please check your API keys in .env.local`}
        />
      )}

      {!error && (
        <>
          {/* Stats Overview */}
          <StatsCards liveCount={liveGames.length} upcomingCount={upcomingGames.length} />

          {/* Live Games Section */}
          {liveGames.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold text-text-dark">Live Games</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <span className="flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-600 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-600"></span>
                    </span>
                  </div>
                  <span className="text-gray-600 text-sm font-medium">
                    {liveGames.length} in progress
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {liveGames.map((game) => (
                  <LiveGameCard key={game.id} game={game} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Games Section */}
          {upcomingGames.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-text-dark">
                Upcoming Matchups
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {upcomingGames.map((game) => (
                  <MatchupCard key={game.id} game={game} />
                ))}
              </div>
            </div>
          ) : !liveGames.length ? (
            <StatusCard
              message="No upcoming games found. Check back later!"
            />
          ) : null}
        </>
      )}
    </div>
  );
}

