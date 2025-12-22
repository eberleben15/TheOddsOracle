"use client";

import { useState } from "react";
import { MatchupCard } from "@/components/MatchupCard";
import { LiveGameCard } from "@/components/LiveGameCard";
import { StatusCard } from "@/components/StatusCard";
import { StatsCards } from "@/components/StatsCards";
import { RecommendedBetsSection } from "@/components/RecommendedBetsSection";
import { GameSearchAndFilter } from "@/components/GameSearchAndFilter";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { OddsGame, LiveGame } from "@/types";
import { Sport } from "@/lib/sports/sport-config";

interface DashboardClientProps {
  liveGames: LiveGame[];
  upcomingGames: OddsGame[];
  error: string | null;
  sport: Sport;
}

export function DashboardClient({ liveGames, upcomingGames, error, sport }: DashboardClientProps) {
  const [filteredUpcomingGames, setFilteredUpcomingGames] = useState<OddsGame[]>(upcomingGames);

  if (error) {
    return (
      <StatusCard
        type="error"
        message={`${error}. Please check your API keys in .env.local`}
      />
    );
  }

  return (
    <>
      {/* Stats Overview */}
      <StatsCards liveCount={liveGames.length} upcomingCount={upcomingGames.length} />

      {/* Recommended Bets Section */}
      <RecommendedBetsSection />

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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-dark">
              Upcoming Matchups
            </h2>
          </div>
          
          <GameSearchAndFilter 
            games={upcomingGames} 
            onFilteredGamesChange={setFilteredUpcomingGames}
          />

          {filteredUpcomingGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredUpcomingGames.map((game) => (
                <MatchupCard key={game.id} game={game} />
              ))}
            </div>
          ) : (
            <EmptyState 
              type="no_results"
              message="No games match your search criteria. Try adjusting your filters."
            />
          )}
        </div>
      ) : !liveGames.length ? (
        <EmptyState 
          type="no_games"
          message="No upcoming games found. Check back later for new matchups!"
        />
      ) : null}
    </>
  );
}

