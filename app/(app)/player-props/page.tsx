"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  FunnelIcon,
  FireIcon,
  TrophyIcon,
  CalendarIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { PlayerPropCard } from "@/components/PlayerPropCard";
import type {
  PropValueBet,
  PlayerPropType,
} from "@/lib/player-props/player-types";
import { PROP_TYPE_LABELS } from "@/lib/player-props/player-types";

interface GameSummary {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  valueBets: PropValueBet[];
  summary: {
    totalProps: number;
    valueBets: number;
    highValue: number;
    mediumValue: number;
    lowValue: number;
  };
}

interface AllPropsData {
  games: GameSummary[];
  topValueBets: PropValueBet[];
  summary: {
    totalGames: number;
    totalProps: number;
    totalValueBets: number;
    byTier: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

type FilterTier = "all" | "high" | "medium" | "low";

const PROP_TYPES: PlayerPropType[] = [
  "points",
  "rebounds",
  "assists",
  "threes",
  "steals",
  "blocks",
  "pra",
];

export default function PlayerPropsMainPage() {
  const [data, setData] = useState<AllPropsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<FilterTier>("all");
  const [filterPropType, setFilterPropType] = useState<string>("all");

  const fetchProps = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/player-props?sport=basketball_nba&limit=10");
      if (!response.ok) {
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

  useEffect(() => {
    fetchProps();
  }, []);

  const filteredValueBets = data?.topValueBets.filter((vb) => {
    if (filterTier !== "all" && vb.tier !== filterTier) return false;
    if (filterPropType !== "all" && vb.prediction.propType !== filterPropType) return false;
    return true;
  }) ?? [];

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-full bg-[var(--body-bg)] p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-dark)] flex items-center gap-2">
                <TrophyIcon className="h-7 w-7 text-purple-500" />
                NBA Player Props
              </h1>
              <p className="text-gray-500 mt-1">
                AI-powered player prop predictions and value bets
              </p>
            </div>
            <button
              onClick={fetchProps}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !data && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Analyzing player props...</p>
              <p className="text-xs text-gray-400 mt-1">
                This may take a moment as we fetch odds and calculate predictions.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Data Display */}
        {data && !loading && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
                <div className="text-2xl font-bold text-[var(--text-dark)]">
                  {data.summary.totalGames}
                </div>
                <div className="text-sm text-gray-500">Games</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
                <div className="text-2xl font-bold text-[var(--text-dark)]">
                  {data.summary.totalProps}
                </div>
                <div className="text-sm text-gray-500">Props Analyzed</div>
              </div>
              <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-600">
                  {data.summary.byTier.high}
                </div>
                <div className="text-sm text-green-700 dark:text-green-400">High Value</div>
              </div>
              <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                <div className="text-2xl font-bold text-yellow-600">
                  {data.summary.byTier.medium}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-400">Medium Value</div>
              </div>
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-600">
                  {data.summary.byTier.low}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-400">Low Value</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-500">Filters:</span>
              </div>
              
              {/* Tier Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Value:</span>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value as FilterTier)}
                  className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              
              {/* Prop Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Prop:</span>
                <select
                  value={filterPropType}
                  onChange={(e) => setFilterPropType(e.target.value)}
                  className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5"
                >
                  <option value="all">All Props</option>
                  {PROP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PROP_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Top Value Bets */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-4 flex items-center gap-2">
                <FireIcon className="h-5 w-5 text-orange-500" />
                Top Value Bets ({filteredValueBets.length})
              </h2>
              {filteredValueBets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredValueBets.map((vb, idx) => (
                    <div key={`${vb.prediction.playerId}-${vb.prediction.propType}-${idx}`}>
                      <Link
                        href={`/sports/nba/${vb.gameId}/player-props`}
                        className="block mb-1"
                      >
                        <span className="text-xs text-gray-500 hover:text-blue-500 transition-colors flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {vb.homeTeam} vs {vb.awayTeam} · {formatTime(vb.commenceTime)}
                        </span>
                      </Link>
                      <PlayerPropCard
                        prediction={vb.prediction}
                        valueBet={vb}
                        showDetails={false}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No value bets match your filters
                </div>
              )}
            </section>

            {/* Games List */}
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-4">
                Upcoming Games
              </h2>
              <div className="space-y-3">
                {data.games.map((game) => (
                  <Link
                    key={game.gameId}
                    href={`/sports/nba/${game.gameId}/player-props`}
                    className="block p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--text-dark)] group-hover:text-blue-600 transition-colors">
                          {game.awayTeam} @ {game.homeTeam}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatTime(game.commenceTime)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="font-medium text-[var(--text-dark)]">
                              {game.summary.valueBets}
                            </span>
                            <span className="text-gray-500"> value bets</span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {game.summary.highValue} high · {game.summary.mediumValue} med · {game.summary.lowValue} low
                          </div>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {data.games.length === 0 && (
              <div className="text-center py-12">
                <TrophyIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No NBA games found in the next 24 hours</p>
                <p className="text-sm text-gray-400 mt-1">
                  Check back closer to game time for player props
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
