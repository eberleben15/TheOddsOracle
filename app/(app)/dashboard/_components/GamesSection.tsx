"use client";

import { useState } from "react";
import { MatchupCard } from "./MatchupCard";
import { LiveGameCard } from "./LiveGameCard";
import { GameSearchAndFilter } from "./GameSearchAndFilter";
import { EmptyState } from "@/components/EmptyState";
import { OddsGame, LiveGame } from "@/types";
import { Sport, getSportConfig } from "@/lib/sports/sport-config";

export interface GamesSectionProps {
  liveGames: LiveGame[];
  upcomingGames: OddsGame[];
  sport: Sport;
  teamLogos?: Record<string, string>;
  /** If true, show a compact "Today's games" style header. If false, show full sport page header. */
  compact?: boolean;
  /** Optional action (e.g. "View all" link) rendered to the right of the section heading. */
  rightHeaderAction?: React.ReactNode;
}

export function GamesSection({
  liveGames,
  upcomingGames,
  sport,
  teamLogos,
  compact = false,
  rightHeaderAction,
}: GamesSectionProps) {
  const [filteredUpcomingGames, setFilteredUpcomingGames] = useState<OddsGame[]>(upcomingGames);
  const config = getSportConfig(sport);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-[var(--text-dark)]">
            {compact ? "Today's games" : config.displayName}
          </h2>
          {compact && <span className="text-sm text-[var(--text-body)]">— {config.displayName}</span>}
        </div>
        {rightHeaderAction}
      </div>

      {liveGames.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--gray-600)]" aria-hidden />
            <span className="text-[var(--text-body)] text-sm font-medium">
              {liveGames.length} live
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {liveGames.map((game) => (
              <LiveGameCard key={game.id} game={game} teamLogos={teamLogos} />
            ))}
          </div>
        </div>
      )}

      {upcomingGames.length > 0 ? (
        <>
          <GameSearchAndFilter
            games={upcomingGames}
            onFilteredGamesChange={setFilteredUpcomingGames}
          />
          {filteredUpcomingGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredUpcomingGames.map((game) => (
                <MatchupCard key={game.id} game={game} sport={sport} teamLogos={teamLogos} />
              ))}
            </div>
          ) : (
            <EmptyState
              type="no_results"
              message="No games match your search criteria. Try adjusting your filters."
            />
          )}
        </>
      ) : !liveGames.length ? (
        <EmptyState
          type="no_games"
          message="No upcoming games found. Check back later for new matchups!"
        />
      ) : null}
    </section>
  );
}
