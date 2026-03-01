"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { TabbedGamesSection } from "./TabbedGamesSection";
import type { OddsGame, LiveGame } from "@/types";
import type { Sport } from "@/lib/sports/sport-config";

interface SportsSummarySectionProps {
  initialSport: Sport;
  initialLiveGames: LiveGame[];
  initialUpcomingGames: OddsGame[];
  initialTeamLogos: Record<string, string>;
  gamesError?: string | null;
}

export function SportsSummarySection({
  initialSport,
  initialLiveGames,
  initialUpcomingGames,
  initialTeamLogos,
  gamesError,
}: SportsSummarySectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dashboard-sports-collapsed") === "true";
    }
    return false;
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem("dashboard-sports-collapsed", String(newValue));
      return newValue;
    });
  };

  const totalGames = initialLiveGames.length + initialUpcomingGames.length;

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-3 group"
        >
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <TrophyIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-[var(--text-dark)] group-hover:text-primary transition-colors flex items-center gap-2">
              Sports Betting
              {totalGames > 0 && (
                <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {totalGames} games
                </span>
              )}
              {isCollapsed ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUpIcon className="w-4 h-4 text-gray-400" />
              )}
            </h2>
            <p className="text-sm text-gray-500">Live odds, predictions & value bets</p>
          </div>
        </button>
        <Link
          href="/sports/cbb"
          className="text-sm font-medium text-primary hover:underline shrink-0"
        >
          All Sports →
        </Link>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden">
          <div className="p-4 sm:p-5">
            {gamesError ? (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3">
                {gamesError}. <Link href={`/sports/${initialSport}`} className="underline">Open Sports</Link> to try again.
              </p>
            ) : (
              <TabbedGamesSection
                initialSport={initialSport}
                initialLiveGames={initialLiveGames}
                initialUpcomingGames={initialUpcomingGames}
                initialTeamLogos={initialTeamLogos}
              />
            )}
          </div>
        </div>
      )}

      {/* Collapsed Preview */}
      {isCollapsed && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Live</p>
                <p className="text-xl font-semibold text-[var(--text-dark)]">{initialLiveGames.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Upcoming</p>
                <p className="text-xl font-semibold text-[var(--text-dark)]">{initialUpcomingGames.length}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/sports/cbb"
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                CBB
              </Link>
              <Link
                href="/sports/nba"
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                NBA
              </Link>
              <Link
                href="/sports/nhl"
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                NHL
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
