import { getUpcomingGamesBySport, getLiveGamesBySport } from "@/lib/odds-api";
import { DashboardClient } from "./DashboardClient";
import { isAdmin } from "@/lib/admin-utils";
import Link from "next/link";
import { OddsGame, LiveGame } from "@/types";
import { Sport, getSportConfig, SPORT_CONFIGS } from "@/lib/sports/sport-config";

export const revalidate = 30; // Revalidate every 30 seconds for live scores

interface DashboardPageProps {
  searchParams: Promise<{ sport?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const sportParam = params.sport as Sport | undefined;
  const sport: Sport = sportParam && sportParam in SPORT_CONFIGS ? sportParam : "cbb";
  const config = getSportConfig(sport);
  
  const admin = await isAdmin();
  let upcomingGames: OddsGame[] = [];
  let liveGames: LiveGame[] = [];
  let error: string | null = null;

  try {
    const oddsApiKey = config.oddsApiKey;
    
    // Fetch both live and upcoming games in parallel
    const [live, upcoming] = await Promise.all([
      getLiveGamesBySport(oddsApiKey).catch(() => []), // Don't fail if live games fail
      getUpcomingGamesBySport(oddsApiKey),
    ]);
    
    liveGames = live;
    
    // Filter out live games from upcoming to avoid duplicates
    const liveGameIds = new Set(liveGames.map(g => g.id));
    upcomingGames = upcoming.filter(game => !liveGameIds.has(game.id));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to load games";
    error = errorMessage + ". Please check your API keys in .env.local and restart the dev server.";
    console.error("Error loading games:", err);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6 flex justify-between items-start flex-wrap gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-dark mb-2">{config.displayName}</h1>
          <p className="text-text-body">Live scores, upcoming matchups, and betting insights</p>
          {!error && (liveGames.length > 0 || upcomingGames.length > 0) && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          )}
        </div>
        {admin && (
          <Link
            href="/admin/predictions"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Admin Dashboard
          </Link>
        )}
      </div>

      <DashboardClient 
        liveGames={liveGames}
        upcomingGames={upcomingGames}
        error={error}
        sport={sport}
      />
    </div>
  );
}

