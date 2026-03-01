"use client";

import { useEffect, useState } from "react";
import {
  ArrowPathIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserGroupIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { PROP_TYPE_LABELS } from "@/lib/player-props/player-types";

interface PredictionRow {
  id: string;
  gameId: string;
  playerName: string;
  propType: string;
  line: number;
  predictedValue: number;
  confidence: number;
  edge: number;
  recommendation: string;
  actualValue: number | null;
  hit: boolean | null;
  createdAt: string;
  settledAt: string | null;
}

interface PropTypePerformance {
  propType: string;
  total: number;
  hits: number;
  hitRate: number;
  avgEdge: number;
}

interface DailyPerformance {
  date: string;
  total: number;
  hits: number;
  hitRate: number;
}

interface AdminData {
  performance: {
    total: number;
    hits: number;
    misses: number;
    passes: number;
    hitRate: number;
    byPropType: Record<string, { total: number; hits: number }>;
    byRecommendation: Record<string, { total: number; hits: number }>;
  };
  recentPredictions: PredictionRow[];
  counts: {
    byRecommendation: Record<string, number>;
    settled: number;
    pending: number;
  };
  dailyPerformance: DailyPerformance[];
  byPropType: PropTypePerformance[];
}

export default function PlayerPropsAdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [filterPropType, setFilterPropType] = useState<string>("all");

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/player-props?days=${days}`);
      if (!res.ok) throw new Error("Failed to fetch data");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [days]);

  const filteredPredictions = data?.recentPredictions.filter((p) => {
    if (filterPropType === "all") return true;
    return p.propType === filterPropType;
  }) ?? [];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-dark)] flex items-center gap-2">
            <UserGroupIcon className="h-7 w-7 text-purple-500" />
            Player Props Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Performance tracking for NBA player prop predictions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchData}
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
          <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Data Display */}
      {data && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
              <div className="text-2xl font-bold text-[var(--text-dark)]">
                {data.performance.total}
              </div>
              <div className="text-sm text-gray-500">Total Predictions</div>
            </div>
            <div className="p-4 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-600">
                {data.performance.hits}
              </div>
              <div className="text-sm text-green-700 dark:text-green-400">Hits</div>
            </div>
            <div className="p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="text-2xl font-bold text-red-600">
                {data.performance.misses}
              </div>
              <div className="text-sm text-red-700 dark:text-red-400">Misses</div>
            </div>
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
              <div className="text-2xl font-bold text-[var(--text-dark)]">
                {(data.performance.hitRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Hit Rate</div>
            </div>
            <div className="p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <div className="text-2xl font-bold text-yellow-600">
                {data.counts.pending}
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">Pending</div>
            </div>
          </div>

          {/* Performance by Prop Type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-blue-500" />
                Performance by Prop Type
              </h2>
              {data.byPropType.length > 0 ? (
                <div className="space-y-3">
                  {data.byPropType.map((pt) => (
                    <div
                      key={pt.propType}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div>
                        <span className="font-medium text-[var(--text-dark)]">
                          {PROP_TYPE_LABELS[pt.propType as keyof typeof PROP_TYPE_LABELS] || pt.propType}
                        </span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({pt.total} predictions)
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {pt.hits}/{pt.total}
                        </span>
                        <span
                          className={`font-bold ${
                            pt.hitRate >= 55
                              ? "text-green-600"
                              : pt.hitRate >= 50
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {pt.hitRate.toFixed(1)}%
                        </span>
                        <span className="text-sm text-gray-500">
                          Avg Edge: {pt.avgEdge.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No validated predictions yet
                </p>
              )}
            </div>

            {/* By Recommendation */}
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-4 flex items-center gap-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                Performance by Recommendation
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      OVER
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {data.performance.byRecommendation?.over?.total || 0}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-400">
                    {data.performance.byRecommendation?.over?.hits || 0} hits (
                    {data.performance.byRecommendation?.over?.total
                      ? (
                          (data.performance.byRecommendation.over.hits /
                            data.performance.byRecommendation.over.total) *
                          100
                        ).toFixed(1)
                      : 0}
                    %)
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
                    <span className="font-medium text-red-700 dark:text-red-400">
                      UNDER
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {data.performance.byRecommendation?.under?.total || 0}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-400">
                    {data.performance.byRecommendation?.under?.hits || 0} hits (
                    {data.performance.byRecommendation?.under?.total
                      ? (
                          (data.performance.byRecommendation.under.hits /
                            data.performance.byRecommendation.under.total) *
                          100
                        ).toFixed(1)
                      : 0}
                    %)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Trend */}
          {data.dailyPerformance.length > 0 && (
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5">
              <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-4">
                Daily Performance Trend
              </h2>
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max">
                  {data.dailyPerformance.slice(-14).map((day) => (
                    <div
                      key={day.date}
                      className="flex flex-col items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 min-w-[60px]"
                    >
                      <span className="text-xs text-gray-500">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          day.hitRate >= 55
                            ? "text-green-600"
                            : day.hitRate >= 50
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {day.hitRate.toFixed(0)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {day.hits}/{day.total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recent Predictions Table */}
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden">
            <div className="p-5 border-b border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text-dark)]">
                  Recent Predictions
                </h2>
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterPropType}
                    onChange={(e) => setFilterPropType(e.target.value)}
                    className="text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5"
                  >
                    <option value="all">All Props</option>
                    <option value="points">Points</option>
                    <option value="rebounds">Rebounds</option>
                    <option value="assists">Assists</option>
                    <option value="threes">3-Pointers</option>
                    <option value="pra">PRA</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prop
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Line
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Predicted
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Edge
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rec
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actual
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {filteredPredictions.slice(0, 25).map((pred) => (
                    <tr
                      key={pred.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-[var(--text-dark)]">
                        {pred.playerName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {PROP_TYPE_LABELS[pred.propType as keyof typeof PROP_TYPE_LABELS] || pred.propType}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-[var(--text-dark)]">
                        {pred.line}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-[var(--text-dark)]">
                        {pred.predictedValue.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span
                          className={`font-medium ${
                            Math.abs(pred.edge) >= 5
                              ? "text-green-600"
                              : Math.abs(pred.edge) >= 3
                                ? "text-yellow-600"
                                : "text-gray-500"
                          }`}
                        >
                          {pred.edge.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            pred.recommendation === "over"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : pred.recommendation === "under"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {pred.recommendation.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-[var(--text-dark)]">
                        {pred.actualValue !== null ? pred.actualValue : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pred.hit === null ? (
                          <ClockIcon className="h-5 w-5 text-gray-400 mx-auto" />
                        ) : pred.hit ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircleIcon className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">
                        {formatDate(pred.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPredictions.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No predictions found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
