"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MatchupCard } from "./MatchupCard";
import { LiveGameCard } from "./LiveGameCard";
import { GameSearchAndFilter } from "./GameSearchAndFilter";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@nextui-org/spinner";
import type { OddsGame, LiveGame } from "@/types";
import { Sport, getSportConfig } from "@/lib/sports/sport-config";

interface SportGamesData {
  liveGames: LiveGame[];
  upcomingGames: OddsGame[];
  teamLogos: Record<string, string>;
  loading: boolean;
  error: string | null;
}

const SPORTS: Sport[] = ["cbb", "nba", "nhl", "mlb", "nfl"];

const SPORT_LABELS: Record<Sport, string> = {
  cbb: "CBB",
  nba: "NBA",
  nhl: "NHL",
  mlb: "MLB",
  nfl: "NFL",
};

export interface TabbedGamesSectionProps {
  initialSport: Sport;
  initialLiveGames: LiveGame[];
  initialUpcomingGames: OddsGame[];
  initialTeamLogos: Record<string, string>;
}

export function TabbedGamesSection({
  initialSport,
  initialLiveGames,
  initialUpcomingGames,
  initialTeamLogos,
}: TabbedGamesSectionProps) {
  const [activeSport, setActiveSport] = useState<Sport>(initialSport);
  const [filteredGames, setFilteredGames] = useState<OddsGame[]>(initialUpcomingGames);
  
  const [sportsData, setSportsData] = useState<Record<Sport, SportGamesData>>(() => {
    const initial: Record<string, SportGamesData> = {};
    for (const sport of SPORTS) {
      if (sport === initialSport) {
        initial[sport] = {
          liveGames: initialLiveGames,
          upcomingGames: initialUpcomingGames,
          teamLogos: initialTeamLogos,
          loading: false,
          error: null,
        };
      } else {
        initial[sport] = {
          liveGames: [],
          upcomingGames: [],
          teamLogos: {},
          loading: false,
          error: null,
        };
      }
    }
    return initial as Record<Sport, SportGamesData>;
  });

  const fetchSportData = useCallback(async (sport: Sport) => {
    if (sportsData[sport].upcomingGames.length > 0 || sportsData[sport].loading) {
      return;
    }

    setSportsData(prev => ({
      ...prev,
      [sport]: { ...prev[sport], loading: true, error: null },
    }));

    try {
      const res = await fetch(`/api/games/${sport}`);
      if (!res.ok) {
        throw new Error("Failed to fetch games");
      }
      const data = await res.json();
      
      setSportsData(prev => ({
        ...prev,
        [sport]: {
          liveGames: data.liveGames || [],
          upcomingGames: data.upcomingGames || [],
          teamLogos: data.teamLogos || {},
          loading: false,
          error: null,
        },
      }));
    } catch (err) {
      setSportsData(prev => ({
        ...prev,
        [sport]: {
          ...prev[sport],
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load games",
        },
      }));
    }
  }, [sportsData]);

  useEffect(() => {
    if (activeSport !== initialSport && sportsData[activeSport].upcomingGames.length === 0) {
      fetchSportData(activeSport);
    }
  }, [activeSport, initialSport, sportsData, fetchSportData]);

  useEffect(() => {
    setFilteredGames(sportsData[activeSport].upcomingGames);
  }, [activeSport, sportsData]);

  const currentData = sportsData[activeSport];
  const config = getSportConfig(activeSport);

  const getGameCount = (sport: Sport) => {
    const data = sportsData[sport];
    return data.liveGames.length + data.upcomingGames.length;
  };

  return (
    <div>
      {/* Sport Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {SPORTS.map((sport) => {
          const isActive = sport === activeSport;
          const count = getGameCount(sport);
          const sportConfig = getSportConfig(sport);
          
          return (
            <button
              key={sport}
              onClick={() => setActiveSport(sport)}
              className={`
                px-4 py-2.5 text-sm font-medium transition-colors relative
                ${isActive 
                  ? "text-primary border-b-2 border-primary -mb-px" 
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }
              `}
            >
              <span className="flex items-center gap-2">
                {SPORT_LABELS[sport]}
                {count > 0 && (
                  <span className={`
                    text-xs px-1.5 py-0.5 rounded-full
                    ${isActive 
                      ? "bg-primary/10 text-primary" 
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    }
                  `}>
                    {count}
                  </span>
                )}
                {sportsData[sport].loading && (
                  <Spinner size="sm" className="w-3 h-3" />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading State */}
      {currentData.loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-gray-500">Loading {config.displayName} games...</span>
        </div>
      )}

      {/* Error State */}
      {currentData.error && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-sm">
          {currentData.error}
          <button
            onClick={() => fetchSportData(activeSport)}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Games Content */}
      {!currentData.loading && !currentData.error && (
        <>
          {/* Live Games */}
          {currentData.liveGames.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[var(--text-body)] text-sm font-medium">
                  {currentData.liveGames.length} live
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {currentData.liveGames.map((game) => (
                  <LiveGameCard key={game.id} game={game} teamLogos={currentData.teamLogos} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Games */}
          {currentData.upcomingGames.length > 0 ? (
            <>
              <GameSearchAndFilter
                games={currentData.upcomingGames}
                onFilteredGamesChange={setFilteredGames}
              />
              {filteredGames.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredGames.map((game) => (
                    <MatchupCard 
                      key={game.id} 
                      game={game} 
                      sport={activeSport} 
                      teamLogos={currentData.teamLogos} 
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  type="no_results"
                  message="No games match your search criteria. Try adjusting your filters."
                />
              )}
            </>
          ) : !currentData.liveGames.length ? (
            <EmptyState
              type="no_games"
              message={`No upcoming ${config.displayName} games found. Check back later for new matchups!`}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
