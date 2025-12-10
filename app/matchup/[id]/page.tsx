import { getUpcomingGames, getGameOdds } from "@/lib/odds-api";
import {
  getTeamStats,
  getRecentGames,
  getHeadToHead,
  searchTeamByName,
} from "@/lib/stats-api-new";
import { apiCache } from "@/lib/api-cache";
import { StatsDisplay } from "@/components/StatsDisplay";
import { MatchupHeader } from "@/components/MatchupHeader";
import { BettingInsights } from "@/components/BettingInsights";
import { AdvancedAnalytics } from "@/components/AdvancedAnalytics";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { parseOdds } from "@/lib/odds-utils";
import { notFound } from "next/navigation";

interface MatchupPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MatchupPage({ params }: MatchupPageProps) {
  const { id: gameId } = await params;

  // Clear cache at the start of each request for fresh data
  apiCache.clear();
  console.log("[PAGE] Cache cleared for new request");

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

  // Search for team IDs by name if API key is set
  let homeTeamId: number | null = null;
  let awayTeamId: number | null = null;
  let subscriptionError = false;
  
  const hasAPIKey = !!process.env.STATS_API_KEY;
  if (hasAPIKey) {
    try {
      [homeTeamId, awayTeamId] = await Promise.all([
        searchTeamByName(game.home_team),
        searchTeamByName(game.away_team),
      ]);
      
      if (!homeTeamId || !awayTeamId) {
        console.warn(`Could not find team IDs for "${game.home_team}" (${homeTeamId}) or "${game.away_team}" (${awayTeamId})`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg === "API_SUBSCRIPTION_REQUIRED" || errorMsg.includes("not subscribed")) {
        subscriptionError = true;
        console.error("❌ API Subscription Required: You are not subscribed to the API-Basketball API on RapidAPI.");
        console.error("   Please subscribe at: https://rapidapi.com/api-sports/api/api-basketball");
      }
    }
  } else {
    // No API key - show error
    subscriptionError = true;
  }

  let homeTeamStats = null;
  let awayTeamStats = null;
  let recentGames = { home: [], away: [] };
  let headToHead = null;
  let apiError: string | null = null;

  // Only fetch data if we have API key, no subscription error, and valid team IDs
  if (hasAPIKey && !subscriptionError && homeTeamId && awayTeamId) {
    try {
      // Fetch real stats from API - no mock data fallback
      [homeTeamStats, awayTeamStats] = await Promise.all([
        getTeamStats(homeTeamId, game.home_team),
        getTeamStats(awayTeamId, game.away_team),
      ]);

      const [homeRecent, awayRecent] = await Promise.all([
        getRecentGames(homeTeamId, 10, game.home_team),
        getRecentGames(awayTeamId, 10, game.away_team),
      ]);

      recentGames = {
        home: homeRecent,
        away: awayRecent,
      };

      headToHead = await getHeadToHead(awayTeamId, homeTeamId, game.away_team, game.home_team);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      apiError = errorMessage;
      console.error("Failed to fetch stats from API:", errorMessage);
    }
  } else if (!hasAPIKey) {
    apiError = "STATS_API_KEY is not set in environment variables";
  } else if (subscriptionError) {
    apiError = "API subscription required. Please subscribe to the API-Basketball API.";
  } else if (!homeTeamId || !awayTeamId) {
    apiError = `Could not find team IDs for "${game.home_team}" or "${game.away_team}". The teams may not exist in the API database.`;
  }

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <MatchupHeader game={game} />

        {apiError && (
          <div className="mb-6">
            <ErrorDisplay error={apiError} />
          </div>
        )}

            {!apiError && homeTeamStats && awayTeamStats && (
              <>
                {/* Advanced Analytics - Phase 3 */}
                <div className="mb-8">
                  <AdvancedAnalytics
                    awayTeamStats={awayTeamStats}
                    homeTeamStats={homeTeamStats}
                    awayRecentGames={recentGames.away}
                    homeRecentGames={recentGames.home}
                    odds={{
                      moneyline: parseOdds(game)[0]?.moneyline,
                      spread: parseOdds(game)[0]?.spread?.home?.point,
                    }}
                  />
                </div>

                <div className="mb-8">
                  <BettingInsights
                    parsedOdds={parseOdds(game)}
                    awayTeamStats={awayTeamStats}
                    homeTeamStats={homeTeamStats}
                    awayTeamName={game.away_team}
                    homeTeamName={game.home_team}
                  />
                </div>
                
                <StatsDisplay
                  homeTeamStats={homeTeamStats}
                  awayTeamStats={awayTeamStats}
                  recentGames={recentGames}
                  headToHead={headToHead || undefined}
                />
              </>
            )}
      </div>
    </main>
  );
}

