"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@nextui-org/react";
import { ClockIcon, FireIcon } from "@heroicons/react/24/outline";
import { OddsGame, LiveGame } from "@/types";
import { formatTime } from "@/lib/utils";

interface SearchResultsProps {
  query: string;
  games: (OddsGame | LiveGame)[];
  teams: string[];
  onClose: () => void;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}

// Highlight matching text in results
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-yellow-200 font-semibold">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export function SearchResults({ 
  query, 
  games, 
  teams, 
  onClose,
  selectedIndex = -1,
  onSelectIndex
}: SearchResultsProps) {
  const router = useRouter();
  const gamesRef = useRef<HTMLDivElement>(null);
  const teamsRef = useRef<HTMLDivElement>(null);

  // Deduplicate games by ID to prevent React key conflicts
  const uniqueGames = games.filter((game, index, self) => 
    index === self.findIndex((g) => g.id === game.id)
  );

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      const element = document.querySelector(`[data-search-index="${selectedIndex}"]`);
      if (element) {
        element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  if (uniqueGames.length === 0 && teams.length === 0) {
    return (
      <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border border-gray-200">
        <CardBody className="p-6">
          <div className="text-center text-gray-500">
            <p className="text-sm">No results found for</p>
            <p className="text-base font-semibold text-gray-700 mt-1">"{query}"</p>
            <p className="text-xs text-gray-400 mt-2">Try searching for a team name or game</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  const handleGameClick = (gameId: string, isLive: boolean) => {
    onClose();
    if (isLive) {
      router.push(`/live/${gameId}`);
    } else {
      router.push(`/matchup/${gameId}`);
    }
  };

  const handleTeamClick = (team: string) => {
    onClose();
    router.push(`/dashboard?team=${encodeURIComponent(team)}`);
  };

  // Calculate item index for keyboard navigation
  let currentIndex = -1;
  const getItemIndex = () => {
    currentIndex++;
    return currentIndex;
  };

  return (
    <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border border-gray-200 max-h-[500px] overflow-hidden flex flex-col w-full">
      <CardBody className="p-0 overflow-y-auto overflow-x-hidden max-h-[500px]">
        {/* Teams Section */}
        {teams.length > 0 && (
          <div className="border-b border-gray-200 w-full" ref={teamsRef}>
            <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Teams ({teams.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100 w-full">
              {teams.map((team, index) => {
                const itemIndex = getItemIndex();
                const isSelected = selectedIndex === itemIndex;
                return (
                  <button
                    key={`team-${team}-${index}`}
                    data-search-index={itemIndex}
                    onClick={() => handleTeamClick(team)}
                    className={`w-full text-left px-4 py-3 transition-colors min-w-0 ${
                      isSelected 
                        ? "bg-primary/10 border-l-2 border-primary" 
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-xs font-semibold text-gray-600">
                          {team.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 flex-1 min-w-0 truncate">
                        {highlightMatch(team, query)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Games Section */}
        {uniqueGames.length > 0 && (
          <div ref={gamesRef} className="w-full">
            <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Games ({uniqueGames.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100 w-full">
              {uniqueGames.map((game, index) => {
                const itemIndex = getItemIndex();
                const isSelected = selectedIndex === itemIndex;
                const isLive = "scores" in game && game.scores && game.scores.length > 0;
                const commenceTime = game.commence_time 
                  ? new Date(game.commence_time) 
                  : null;
                
                return (
                  <button
                    key={game.id}
                    data-search-index={itemIndex}
                    onClick={() => handleGameClick(game.id, !!isLive)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected 
                        ? "bg-primary/10 border-l-2 border-primary" 
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 min-w-0">
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate min-w-0">
                            {highlightMatch(game.away_team, query)} vs {highlightMatch(game.home_team, query)}
                          </p>
                          {isLive && (
                            <span className="flex-shrink-0 flex items-center gap-1 text-red-600 text-xs font-bold whitespace-nowrap">
                              <FireIcon className="h-3 w-3" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span className="whitespace-nowrap">{game.sport_title}</span>
                          {commenceTime && (
                            <>
                              <span className="whitespace-nowrap">•</span>
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <ClockIcon className="h-3 w-3 flex-shrink-0" />
                                {formatTime(commenceTime.toISOString())}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {isLive && (
                        <div className="flex-shrink-0">
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer hint */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 sticky bottom-0 flex-shrink-0 w-full">
          <p className="text-xs text-gray-400 text-center whitespace-nowrap">
            Use ↑↓ to navigate, Enter to select, Esc to close
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
