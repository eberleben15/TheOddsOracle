import { getUpcomingGames, getGameOdds } from "@/lib/odds-api";
import { apiCache } from "@/lib/api-cache";
import { StatsDisplay } from "@/components/StatsDisplay";
import { MatchupHeader } from "@/components/MatchupHeader";
import { BettingInsights } from "@/components/BettingInsights";
import { AdvancedAnalyticsWrapper } from "@/components/AdvancedAnalyticsWrapper";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { EmptyState } from "@/components/EmptyState";
import { parseOdds } from "@/lib/odds-utils";
import { notFound } from "next/navigation";
import { TeamStats, HeadToHead, GameResult } from "@/types";
import { getSportFromGame } from "@/lib/sports/sport-detection";
import { getTeamSeasonStats, getRecentGames, findTeamByName } from "@/lib/sports/unified-sports-api";
import { Sport } from "@/lib/sports/sport-config";

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

  // Detect sport from game
  const sport: Sport = getSportFromGame(game);
  console.log(`[MATCHUP] Detected sport: ${sport} from game sport_key: ${game.sport_key}`);

  // Check for API key
  const hasAPIKey = !!process.env.SPORTSDATA_API_KEY;
  
  let homeTeamStats: TeamStats | null = null;
  let awayTeamStats: TeamStats | null = null;
  let recentGames: { home: GameResult[]; away: GameResult[] } = { 
    home: [] as GameResult[], 
    away: [] as GameResult[] 
  };
  let headToHead: HeadToHead | null = null;
  let apiError: string | null = null;

  if (!hasAPIKey) {
    apiError = "⚠️ SportsData.io API Key Required: Please configure SPORTSDATA_API_KEY in your .env.local file. Visit https://sportsdata.io for access.";
  } else {
    try {
      console.log(`[MATCHUP] Fetching stats for ${game.away_team} vs ${game.home_team} (${sport})`);
      
      // Find teams using unified API
      const [awayTeam, homeTeam] = await Promise.all([
        findTeamByName(sport, game.away_team),
        findTeamByName(sport, game.home_team),
      ]);

      if (!awayTeam || !homeTeam) {
        apiError = `❌ Team Not Found: Could not find "${!awayTeam ? game.away_team : game.home_team}" in SportsData.io database for ${sport.toUpperCase()}.`;
        console.error(apiError);
      } else {
        // Fetch stats using unified API
        const [awayStats, homeStats] = await Promise.all([
          getTeamSeasonStats(sport, game.away_team),
          getTeamSeasonStats(sport, game.home_team),
        ]);

        if (!awayStats || !homeStats) {
          apiError = `❌ Stats Unavailable: Could not retrieve season statistics for one or both teams. Data may not be available yet for the current season.`;
          console.error(apiError);
        } else {
          homeTeamStats = homeStats;
          awayTeamStats = awayStats;

          // Fetch recent games using unified API
          const [awayRecent, homeRecent] = await Promise.all([
            getRecentGames(sport, game.away_team, 5),
            getRecentGames(sport, game.home_team, 5),
          ]);

          recentGames = {
            home: homeRecent,
            away: awayRecent,
          };

          // Update stats with recent games
          homeTeamStats.recentGames = homeRecent;
          awayTeamStats.recentGames = awayRecent;

          // Head-to-head is only available for CBB currently
          // TODO: Implement H2H for other sports if needed
          if (sport === "cbb") {
            try {
              // Import CBB-specific H2H function
              const cbbApi = await import("@/lib/sportsdata-api");
              const h2hGames = await cbbApi.getHeadToHead(awayTeam.Key, homeTeam.Key, 5);
              
              if (h2hGames && h2hGames.length > 0) {
                // Count wins for each team
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
            }
          }

          console.log(`[MATCHUP] ✅ Successfully loaded stats for both teams (${sport})`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      apiError = `❌ API Error: ${errorMessage}`;
      console.error(`Failed to fetch stats from SportsData.io for ${sport}:`, error);
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

        {!apiError && !homeTeamStats && !awayTeamStats && (
          <div className="mb-6">
            <EmptyState 
              type="no_data"
              title="Statistics Unavailable"
              message="Team statistics are not available for this matchup. This may be because the game is too far in the future or the teams haven't played enough games this season."
            />
          </div>
        )}

        {!apiError && homeTeamStats && awayTeamStats && (
          <>
            {/* Advanced Analytics - Phase 3 */}
            <div className="mb-8">
              <AdvancedAnalyticsWrapper
                awayTeamStats={awayTeamStats}
                homeTeamStats={homeTeamStats}
                awayRecentGames={recentGames.away}
                homeRecentGames={recentGames.home}
                odds={{
                  moneyline: parseOdds(game)[0]?.moneyline ? {
                    away: parseOdds(game)[0]?.moneyline?.away?.price || 0,
                    home: parseOdds(game)[0]?.moneyline?.home?.price || 0,
                  } : undefined,
                  spread: parseOdds(game)[0]?.spread?.home?.point,
                }}
                game={game}
                parsedOdds={parseOdds(game)}
              />
            </div>

            <div className="mb-8">
              <BettingInsights
                parsedOdds={parseOdds(game)}
                awayTeamStats={awayTeamStats}
                homeTeamStats={homeTeamStats}
                awayTeamName={game.away_team}
                homeTeamName={game.home_team}
                game={game}
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

