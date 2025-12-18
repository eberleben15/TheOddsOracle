"use client";

import { useEffect, useState } from "react";
import { getTeamSeasonStats, findTeamByName } from "@/lib/sportsdata-api";
import { TeamLogo } from "@/components/TeamLogo";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { useParams, useRouter } from "next/navigation";
import { TeamStats, LiveGame } from "@/types";
import { formatTime } from "@/lib/utils";
import { ArrowLeftIcon, SignalIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Card, CardBody, CardHeader } from "@nextui-org/react";

export default function LiveGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params?.id as string;

  const [game, setGame] = useState<LiveGame | null>(null);
  const [awayTeamStats, setAwayTeamStats] = useState<TeamStats | null>(null);
  const [homeTeamStats, setHomeTeamStats] = useState<TeamStats | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGameData = async () => {
      if (!gameId) return;

      try {
        setLoading(true);
        // Fetch from API route instead of calling getLiveGames directly
        const response = await fetch("/api/live-games");
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch live games: ${response.statusText}`);
        }
        const liveGames = await response.json();
        const foundGame = liveGames.find((g) => g.id === gameId);

        if (!foundGame) {
          setApiError("Game not found");
          setLoading(false);
          return;
        }

        setGame(foundGame);

        // Try to get team stats if API key is available
        const hasAPIKey = !!process.env.NEXT_PUBLIC_SPORTSDATA_API_KEY;
        if (hasAPIKey) {
          try {
            const [awayTeam, homeTeam] = await Promise.all([
              findTeamByName(foundGame.away_team),
              findTeamByName(foundGame.home_team),
            ]);

            if (awayTeam && homeTeam) {
              const [awayStats, homeStats] = await Promise.all([
                getTeamSeasonStats(foundGame.away_team),
                getTeamSeasonStats(foundGame.home_team),
              ]);

              setAwayTeamStats(awayStats);
              setHomeTeamStats(homeStats);
            }
          } catch (error) {
            console.warn("Could not fetch team stats for live game:", error);
          }
        }
      } catch (error) {
        console.error("Error fetching live games:", error);
        setApiError("Failed to load live game data");
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchGameData, 10000);
    return () => clearInterval(interval);
  }, [gameId]);

  if (loading) {
    return (
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading game data...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!game) {
    return (
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ErrorDisplay error={apiError || "Game not found"} />
        </div>
      </main>
    );
  }

  // Get scores
  const awayScore = game.scores?.find((s) => s.name === game.away_team)?.score || "0";
  const homeScore = game.scores?.find((s) => s.name === game.home_team)?.score || "0";
  const awayScoreNum = parseInt(awayScore);
  const homeScoreNum = parseInt(homeScore);
  const awayWinning = awayScoreNum > homeScoreNum;
  const homeWinning = homeScoreNum > awayScoreNum;
  const isTied = awayScoreNum === homeScoreNum;

  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </Link>

        {apiError && (
          <div className="mb-6">
            <ErrorDisplay error={apiError} />
          </div>
        )}

        {/* Live Game Header */}
        <Card className="bg-white border-2 border-live mb-6 shadow-lg">
          <CardHeader className="border-b border-gray-200 bg-live-light">
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <SignalIcon className="h-6 w-6 text-live animate-pulse" />
                  <span className="absolute top-0 right-0 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-live"></span>
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Live Game</h1>
                  <p className="text-sm text-gray-600">
                    {game.sport_title} • {formatTime(game.commence_time)}
                  </p>
                </div>
              </div>
              {game.last_update && (
                <div className="text-xs text-gray-500">
                  Updated {new Date(game.last_update).toLocaleTimeString()}
                </div>
              )}
            </div>
          </CardHeader>

          <CardBody className="p-8">
            {/* Score Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              {/* Away Team */}
              <div className="text-center">
                <TeamLogo teamName={game.away_team} size={100} />
                <h2 className="text-xl font-bold mt-4 text-gray-900">{game.away_team}</h2>
                <p className="text-sm text-gray-500 mb-2">Away</p>
                {awayTeamStats && (
                  <p className="text-sm text-gray-600">
                    {awayTeamStats.wins}-{awayTeamStats.losses} Record
                  </p>
                )}
              </div>

              {/* Score */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className={`text-6xl font-bold ${awayWinning ? 'text-gray-900' : isTied ? 'text-gray-700' : 'text-gray-400'}`}>
                    {awayScore}
                  </div>
                  <div className="text-3xl font-bold text-gray-400">-</div>
                  <div className={`text-6xl font-bold ${homeWinning ? 'text-gray-900' : isTied ? 'text-gray-700' : 'text-gray-400'}`}>
                    {homeScore}
                  </div>
                </div>
                {isTied ? (
                  <div className="text-sm font-medium text-gray-600">Tied</div>
                ) : (
                  <div className="text-sm font-medium text-gray-600">
                    {awayWinning ? game.away_team : game.home_team} Leading
                  </div>
                )}
              </div>

              {/* Home Team */}
              <div className="text-center">
                <TeamLogo teamName={game.home_team} size={100} />
                <h2 className="text-xl font-bold mt-4 text-gray-900">{game.home_team}</h2>
                <p className="text-sm text-gray-500 mb-2">Home</p>
                {homeTeamStats && (
                  <p className="text-sm text-gray-600">
                    {homeTeamStats.wins}-{homeTeamStats.losses} Record
                  </p>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Team Stats Comparison */}
        {awayTeamStats && homeTeamStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="bg-white border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Team Comparison</h3>
              </CardHeader>
              <CardBody className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Points Per Game</span>
                    <div className="flex gap-4">
                      <span className="font-semibold text-gray-700">
                        {awayTeamStats.pointsPerGame?.toFixed(1) || 'N/A'}
                      </span>
                      <span className="font-semibold text-gray-700">
                        {homeTeamStats.pointsPerGame?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Points Allowed</span>
                    <div className="flex gap-4">
                      <span className="font-semibold text-gray-700">
                        {awayTeamStats.pointsAllowedPerGame?.toFixed(1) || 'N/A'}
                      </span>
                      <span className="font-semibold text-gray-700">
                        {homeTeamStats.pointsAllowedPerGame?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Record</span>
                    <div className="flex gap-4">
                      <span className="font-semibold text-gray-700">
                        {awayTeamStats.wins}-{awayTeamStats.losses}
                      </span>
                      <span className="font-semibold text-gray-700">
                        {homeTeamStats.wins}-{homeTeamStats.losses}
                      </span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-white border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Game Info</h3>
              </CardHeader>
              <CardBody className="p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-medium text-live">Live</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started</span>
                    <span className="font-medium text-gray-700">{formatTime(game.commence_time)}</span>
                  </div>
                  {game.last_update && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Update</span>
                      <span className="font-medium text-gray-700">
                        {new Date(game.last_update).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Auto-refresh notice */}
        <Card className="bg-value-light border border-value/30">
          <CardBody className="p-4">
            <p className="text-sm text-gray-700 text-center">
              This page auto-refreshes every 10 seconds to show the latest scores
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
