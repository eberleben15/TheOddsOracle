import { getUpcomingGames, getGameOdds } from "@/lib/odds-api";
import {
  getTeamSeasonStats,
  findTeamByName,
  getHeadToHead as getSportsDataH2H,
} from "@/lib/sportsdata-api";
import { apiCache } from "@/lib/api-cache";
import { StatsDisplay } from "@/components/StatsDisplay";
import { MatchupHeader } from "@/components/MatchupHeader";
import { BettingInsights } from "@/components/BettingInsights";
import { AdvancedAnalytics } from "@/components/AdvancedAnalytics";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { parseOdds } from "@/lib/odds-utils";
import { notFound } from "next/navigation";
import { TeamStats, HeadToHead } from "@/types";

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

  // Check for API key
  const hasAPIKey = !!process.env.SPORTSDATA_API_KEY;
  
  let homeTeamStats: TeamStats | null = null;
  let awayTeamStats: TeamStats | null = null;
  let recentGames = { home: [], away: [] };
  let headToHead: HeadToHead | null = null;
  let apiError: string | null = null;

  if (!hasAPIKey) {
    apiError = "⚠️ SportsData.io API Key Required: Please configure SPORTSDATA_API_KEY in your .env.local file. Visit https://sportsdata.io for access.";
  } else {
    try {
      console.log(`[MATCHUP] Fetching stats for ${game.away_team} vs ${game.home_team}`);
      
      // Find teams in SportsData.io
      const [awayTeam, homeTeam] = await Promise.all([
        findTeamByName(game.away_team),
        findTeamByName(game.home_team),
      ]);

      if (!awayTeam || !homeTeam) {
        apiError = `❌ Team Not Found: Could not find "${!awayTeam ? game.away_team : game.home_team}" in SportsData.io database. This team may not be available in the NCAA basketball data.`;
        console.error(apiError);
      } else {
        // Fetch real stats from SportsData.io - NO FALLBACK DATA
        const [awayStats, homeStats] = await Promise.all([
          getTeamSeasonStats(game.away_team),
          getTeamSeasonStats(game.home_team),
        ]);

        if (!awayStats || !homeStats) {
          apiError = `❌ Stats Unavailable: Could not retrieve season statistics for one or both teams. Data may not be available yet for the current season.`;
          console.error(apiError);
        } else {
          homeTeamStats = homeStats;
          awayTeamStats = awayStats;

          // Recent games are already included in TeamStats from SportsData.io
          recentGames = {
            home: homeStats.recentGames || [],
            away: awayStats.recentGames || [],
          };

          // Fetch head-to-head history
          try {
            const h2hGames = await getSportsDataH2H(awayTeam.Key, homeTeam.Key, 5);
            
            if (h2hGames.length > 0) {
              // Count wins for each team - use winnerKey for reliable matching
              const awayWins = h2hGames.filter(g => g.winnerKey === awayTeam.Key).length;
              const homeWins = h2hGames.filter(g => g.winnerKey === homeTeam.Key).length;
              
              headToHead = {
                games: h2hGames,
                team1Wins: awayWins,
                team2Wins: homeWins,
                awayTeamWins: awayWins,
                homeTeamWins: homeWins,
              };
            }
          } catch (h2hError) {
            console.warn("Could not fetch head-to-head data:", h2hError);
            // H2H is optional, don't fail the entire page
          }

          console.log(`[MATCHUP] ✅ Successfully loaded stats for both teams`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      apiError = `❌ API Error: ${errorMessage}`;
      console.error("Failed to fetch stats from SportsData.io:", error);
    }
  }

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <MatchupHeader 
          game={game} 
          awayTeamStats={awayTeamStats || undefined}
          homeTeamStats={homeTeamStats || undefined}
        />

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

