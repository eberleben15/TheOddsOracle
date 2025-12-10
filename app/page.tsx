import { getUpcomingGames, getLiveGames } from "@/lib/odds-api";
import { MatchupCard } from "@/components/MatchupCard";
import { LiveGameCard } from "@/components/LiveGameCard";
import { StatusCard } from "@/components/StatusCard";

export const revalidate = 30; // Revalidate every 30 seconds for live scores

export default async function Home() {
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
    upcomingGames = upcoming;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load games";
    console.error("Error loading games:", err);
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-strong-cyan via-honey-bronze to-blaze-orange bg-clip-text text-transparent drop-shadow-2xl">
            The Odds Oracle
          </h1>
          <p className="text-gray-200 text-lg font-medium">
            Smart insights for smarter bets • College Basketball
          </p>
        </div>

        {error && (
          <StatusCard
            type="error"
            message={`⚠️ ${error}. Please check your API keys in .env.local`}
          />
        )}

        {!error && (
          <>
            {/* Live Games Section */}
            {liveGames.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-3xl font-bold text-white">Live Games</h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <span className="flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                    </div>
                    <span className="text-red-400 text-sm font-semibold">
                      {liveGames.length} game{liveGames.length !== 1 ? 's' : ''} in progress
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {liveGames.map((game) => (
                    <LiveGameCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Games Section */}
            {upcomingGames.length > 0 ? (
              <div>
                <h2 className="text-3xl font-bold mb-6 text-white">
                  Upcoming Matchups
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </main>
  );
}
