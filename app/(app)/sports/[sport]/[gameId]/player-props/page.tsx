"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  FunnelIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ChartBarIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { PlayerPropCard, PlayerPropList } from "@/components/PlayerPropCard";
import type {
  PropPrediction,
  PropValueBet,
  PlayerPropType,
} from "@/lib/player-props/player-types";
import { PROP_TYPE_LABELS } from "@/lib/player-props/player-types";

interface PlayerPropsData {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
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

export default function PlayerPropsPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const sport = params.sport as string;

  const [data, setData] = useState<PlayerPropsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<FilterTier>("all");
  const [filterPropType, setFilterPropType] = useState<string>("all");
  const [showAllProps, setShowAllProps] = useState(false);

  const fetchProps = async (refresh = false) => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/player-props?gameId=${gameId}&sport=${sport}${refresh ? "&refresh=true" : ""}`;
      const response = await fetch(url);
      
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
  }, [gameId, sport]);

  const filteredValueBets = data?.valueBets.filter((vb) => {
    if (filterTier !== "all" && vb.tier !== filterTier) return false;
    if (filterPropType !== "all" && vb.prediction.propType !== filterPropType) return false;
    return true;
  }) ?? [];

  const filteredPredictions = data?.allPredictions.filter((p) => {
    if (filterPropType !== "all" && p.propType !== filterPropType) return false;
    if (!showAllProps && p.recommendation === "pass") return false;
    return true;
  }) ?? [];

  return (
    <div className="min-h-full bg-[var(--body-bg)] p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-[var(--text-dark)] transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-dark)]">
                Player Props
              </h1>
              {data && (
                <p className="text-gray-500 mt-1">
                  {data.homeTeam} vs {data.awayTeam}
                </p>
              )}
            </div>
            <button
              onClick={() => fetchProps(true)}
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
              <p className="text-gray-500">Loading player props...</p>
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
                  {data.summary.totalProps}
                </div>
                <div className="text-sm text-gray-500">Total Props</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
                <div className="text-2xl font-bold text-blue-600">
                  {data.summary.valueBets}
                </div>
                <div className="text-sm text-gray-500">Value Bets</div>
              </div>
              <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <div className="text-2xl font-bold text-green-600">
                  {data.summary.highValue}
                </div>
                <div className="text-sm text-green-700 dark:text-green-400">High Value</div>
              </div>
              <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                <div className="text-2xl font-bold text-yellow-600">
                  {data.summary.mediumValue}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-400">Medium Value</div>
              </div>
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <div className="text-2xl font-bold text-blue-600">
                  {data.summary.lowValue}
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

              {/* Show All Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllProps}
                  onChange={(e) => setShowAllProps(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Show all props
                </span>
              </label>
            </div>

            {/* Value Bets Section */}
            {filteredValueBets.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-4 flex items-center gap-2">
                  <FireIcon className="h-5 w-5 text-orange-500" />
                  Value Bets ({filteredValueBets.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredValueBets.map((vb, idx) => (
                    <PlayerPropCard
                      key={`${vb.prediction.playerId}-${vb.prediction.propType}-${idx}`}
                      prediction={vb.prediction}
                      valueBet={vb}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All Predictions */}
            <section>
              <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-blue-500" />
                All Predictions ({filteredPredictions.length})
              </h2>
              {filteredPredictions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPredictions.map((prediction, idx) => (
                    <PlayerPropCard
                      key={`${prediction.playerId}-${prediction.propType}-${idx}`}
                      prediction={prediction}
                      showDetails={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No predictions match your filters
                </div>
              )}
            </section>

            {/* Cache indicator */}
            {data.fromCache && (
              <p className="text-xs text-gray-400 mt-4 text-center">
                Showing cached predictions. Click refresh for latest data.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
