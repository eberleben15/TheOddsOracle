import { getUpcomingGames, getGameOdds } from "@/lib/odds-api";
import { apiCache } from "@/lib/api-cache";
import { StatsDisplay } from "./_components/StatsDisplay";
import { MatchupHeader } from "./_components/MatchupHeader";
import { AddToSandboxOdds } from "./_components/AddToSandboxOdds";
import { BettingInsights } from "./_components/BettingInsights";
import { AdvancedAnalyticsWrapper } from "./_components/AdvancedAnalyticsWrapper";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { EmptyState } from "@/components/EmptyState";
import { parseOdds, buildBestOddsSnapshot } from "@/lib/odds-utils";
import { notFound } from "next/navigation";
import { TeamStats, HeadToHead, GameResult } from "@/types";
import { getSportFromGame } from "@/lib/sports/sport-detection";
import { getTeamSeasonStats, getRecentGames, findTeamByName } from "@/lib/sports/unified-sports-api";
import { Sport, SPORT_CONFIGS } from "@/lib/sports/sport-config";

interface MatchupPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sport?: string }>;
}

export default async function MatchupPage({ params, searchParams }: MatchupPageProps) {
  const { id: gameId } = await params;
  const { sport: sportParam } = await searchParams;
  const sportFromUrl = sportParam && sportParam in SPORT_CONFIGS ? (sportParam as Sport) : undefined;

  // Clear cache at the start of each request for fresh data
  apiCache.clear();
  console.log("[PAGE] Cache cleared for new request");

  // Fetch game details (pass sport so we fetch the right league, e.g. NHL)
  let game = null;
  try {
    game = await getGameOdds(gameId, sportFromUrl);
  } catch (error) {
    console.error("Error fetching game:", error);
  }

  if (!game) {
    notFound();
  }

  // Detect sport from game
  const sport: Sport = getSportFromGame(game);
  console.log(`[MATCHUP] Detected sport: ${sport} from game sport_key: ${game.sport_key}`);

  // CBB, NBA, NHL use ESPN (free). NFL/MLB would need a key when enabled.
  const hasAPIKey = !!process.env.SPORTSDATA_API_KEY;
  const canLoadStats = sport === "cbb" || sport === "nba" || sport === "nhl" || hasAPIKey;

  let homeTeamStats: TeamStats | null = null;
  let awayTeamStats: TeamStats | null = null;
  let recentGames: { home: GameResult[]; away: GameResult[] } = {
    home: [] as GameResult[],
    away: [] as GameResult[],
  };
  let headToHead: HeadToHead | null = null;
  let apiError: string | null = null;

  if (!canLoadStats) {
    apiError =
      "⚠️ Stats for this sport require an API key. CBB uses free ESPN data; for other sports configure SPORTSDATA_API_KEY or add a data source.";
  } else {
    try {
      console.log(`[MATCHUP] Fetching stats for ${game.away_team} vs ${game.home_team} (${sport})`);

      const [awayTeam, homeTeam] = await Promise.all([
        findTeamByName(sport, game.away_team),
        findTeamByName(sport, game.home_team),
      ]);

      if (!awayTeam || !homeTeam) {
        apiError = `❌ Team Not Found: Could not find "${!awayTeam ? game.away_team : game.home_team}" for ${sport.toUpperCase()}.`;
        console.error(apiError);
      } else {
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

          const [awayRecent, homeRecent] = await Promise.all([
            getRecentGames(sport, game.away_team, 5),
            getRecentGames(sport, game.home_team, 5),
          ]);

          recentGames = { home: homeRecent, away: awayRecent };
          homeTeamStats.recentGames = homeRecent;
          awayTeamStats.recentGames = awayRecent;

          if (sport === "cbb") {
            try {
              const { freeStatsAggregator } = await import("@/lib/free-stats-aggregator");
              const h2h = await freeStatsAggregator.getHeadToHeadByKey(
                awayTeam.Key,
                homeTeam.Key,
                5
              );
              if (h2h && h2h.games.length > 0) {
                headToHead = h2h;
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
      console.error(`Failed to fetch stats for ${sport}:`, error);
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

        <AddToSandboxOdds
          gameId={game.id}
          awayTeamName={game.away_team}
          homeTeamName={game.home_team}
          firstOdds={parseOdds(game)[0] ?? null}
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
                odds={buildBestOddsSnapshot(parseOdds(game)) ?? undefined}
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

