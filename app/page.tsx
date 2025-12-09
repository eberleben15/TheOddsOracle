import { getUpcomingGames } from "@/lib/odds-api";
import { MatchupCard } from "@/components/MatchupCard";
import { StatusCard } from "@/components/StatusCard";

export default async function Home() {
  let games = [];
  let error = null;

  try {
    games = await getUpcomingGames();
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load games";
    console.error("Error loading games:", err);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">The Odds Oracle</h1>
          <p className="text-gray-600">
            College Basketball Matchups & Statistics
          </p>
        </div>

        {error && (
          <StatusCard
            type="error"
            message={`⚠️ ${error}. Please check your API keys in .env.local`}
          />
        )}

        {games.length === 0 && !error && (
          <StatusCard message="No upcoming games found. Check back later!" />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <MatchupCard key={game.id} game={game} />
          ))}
        </div>
      </div>
    </main>
  );
}

