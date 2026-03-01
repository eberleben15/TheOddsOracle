"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserGroupIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { PlayerPropCard } from "@/components/PlayerPropCard";
import type { PropValueBet, PropPrediction } from "@/lib/player-props/player-types";

interface PlayerPropsSectionProps {
  gameId: string;
  sport: string;
}

interface PlayerPropsData {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  valueBets: PropValueBet[];
  allPredictions: PropPrediction[];
  summary: {
    totalProps: number;
    valueBets: number;
    highValue: number;
    mediumValue: number;
    lowValue: number;
  };
  fromCache?: boolean;
}

export function PlayerPropsSection({ gameId, sport }: PlayerPropsSectionProps) {
  const [data, setData] = useState<PlayerPropsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchProps = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/player-props?gameId=${gameId}&sport=${sport}`);
        if (!response.ok) {
          if (response.status === 404) {
            setData(null);
            return;
          }
          throw new Error("Failed to fetch player props");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProps();
  }, [gameId, sport]);

  // Don't render if not NBA
  if (sport !== "basketball_nba" && sport !== "nba") {
    return null;
  }

  const topValueBets = data?.valueBets.slice(0, expanded ? 6 : 3) ?? [];

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-dark)] flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-purple-500" />
          Player Props
        </h2>
        <Link
          href={`/sports/${sport}/${gameId}/player-props`}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />
            <span className="ml-2 text-gray-500">Loading player props...</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && !data && (
          <div className="p-6 text-center text-gray-500">
            <UserGroupIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p>No player props available for this game yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Props typically become available closer to game time.
            </p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="p-4">
            {/* Summary Stats */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Value Bets:</span>
                <span className="font-semibold text-[var(--text-dark)]">
                  {data.summary.valueBets}
                </span>
              </div>
              {data.summary.highValue > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {data.summary.highValue} High
                </span>
              )}
              {data.summary.mediumValue > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  {data.summary.mediumValue} Medium
                </span>
              )}
              {data.summary.lowValue > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  {data.summary.lowValue} Low
                </span>
              )}
            </div>

            {/* Value Bets */}
            {topValueBets.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <FireIcon className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-[var(--text-dark)]">
                    Top Value Props
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {topValueBets.map((vb, idx) => (
                    <PlayerPropCard
                      key={`${vb.prediction.playerId}-${vb.prediction.propType}-${idx}`}
                      prediction={vb.prediction}
                      valueBet={vb}
                      compact
                    />
                  ))}
                </div>
                
                {data.valueBets.length > 3 && !expanded && (
                  <button
                    onClick={() => setExpanded(true)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Show {data.valueBets.length - 3} more value bets
                  </button>
                )}
                {expanded && (
                  <button
                    onClick={() => setExpanded(false)}
                    className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Show less
                  </button>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 py-4">
                <p>No value bets identified for this game.</p>
                <Link
                  href={`/sports/${sport}/${gameId}/player-props`}
                  className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                >
                  View all {data.summary.totalProps} props →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
