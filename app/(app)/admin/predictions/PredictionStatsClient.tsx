"use client";

import { useState, useEffect } from "react";
import { Button, Spinner, Chip } from "@nextui-org/react";
import { ArrowPathIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/outline";

interface TrackingStats {
  total: number;
  validated: number;
  unvalidated: number;
}

interface OddsHistoryStats {
  totalSnapshots: number;
  gamesTracked: number;
  openingLines: number;
  closingLines: number;
  bySport: Record<string, number>;
}

interface CLVStats {
  totalWithClv: number;
  avgClv: number | null;
  positiveCLV: number;
  negativeCLV: number;
  zeroCLV: number;
}

interface StatsResponse {
  stats: TrackingStats;
  oddsHistoryStats: OddsHistoryStats;
  clvStats: CLVStats;
}

export function PredictionStatsClient() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/predictions/stats");
      if (!res.ok) {
        console.error("Failed to fetch stats:", res.status, res.statusText);
        return;
      }
      const text = await res.text();
      if (!text) {
        console.error("Empty response from stats API");
        return;
      }
      const parsed = JSON.parse(text);
      setData(parsed);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center justify-center h-24">
            <Spinner size="sm" />
          </div>
        ))}
      </div>
    );
  }

  const stats = data?.stats;
  const oddsStats = data?.oddsHistoryStats;
  const clvStats = data?.clvStats;
  const clvRate = clvStats && clvStats.totalWithClv > 0
    ? ((clvStats.positiveCLV / clvStats.totalWithClv) * 100).toFixed(1)
    : null;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-600">Prediction Stats</h2>
        <Button
          size="sm"
          variant="flat"
          startContent={loading ? <Spinner size="sm" /> : <ArrowPathIcon className="w-4 h-4" />}
          onClick={fetchStats}
          isDisabled={loading}
        >
          Refresh
        </Button>
      </div>
      
      {/* Core Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Predictions</h3>
          <p className="text-3xl font-bold">{stats?.total ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Validated</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.validated ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Pending</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats?.unvalidated ?? 0}</p>
        </div>
      </div>

      {/* CLV Stats */}
      {clvStats && clvStats.totalWithClv > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              Average CLV
              <Chip size="sm" color={clvStats.avgClv && clvStats.avgClv > 0 ? "success" : clvStats.avgClv && clvStats.avgClv < 0 ? "danger" : "default"}>
                Spread
              </Chip>
            </h3>
            <p className={`text-3xl font-bold flex items-center gap-2 ${
              clvStats.avgClv && clvStats.avgClv > 0 ? "text-green-600" : 
              clvStats.avgClv && clvStats.avgClv < 0 ? "text-red-600" : ""
            }`}>
              {clvStats.avgClv !== null ? (
                <>
                  {clvStats.avgClv > 0 ? "+" : ""}{clvStats.avgClv.toFixed(2)} pts
                  {clvStats.avgClv > 0 ? <ArrowTrendingUpIcon className="w-6 h-6" /> : <ArrowTrendingDownIcon className="w-6 h-6" />}
                </>
              ) : "-"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Positive = beating closing line
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">CLV Win Rate</h3>
            <p className={`text-3xl font-bold ${
              clvRate && parseFloat(clvRate) > 50 ? "text-green-600" : "text-amber-600"
            }`}>
              {clvRate ? `${clvRate}%` : "-"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {clvStats.positiveCLV} positive / {clvStats.totalWithClv} with CLV data
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">CLV Breakdown</h3>
            <div className="flex gap-2">
              <Chip color="success" variant="flat">+{clvStats.positiveCLV}</Chip>
              <Chip color="danger" variant="flat">-{clvStats.negativeCLV}</Chip>
              <Chip color="default" variant="flat">={clvStats.zeroCLV}</Chip>
            </div>
          </div>
        </div>
      )}

      {/* Odds History Stats */}
      {oddsStats && oddsStats.totalSnapshots > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Odds History Tracking</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-500">Snapshots:</span>{" "}
              <span className="font-medium">{oddsStats.totalSnapshots}</span>
            </div>
            <div>
              <span className="text-gray-500">Games:</span>{" "}
              <span className="font-medium">{oddsStats.gamesTracked}</span>
            </div>
            <div>
              <span className="text-gray-500">Opening Lines:</span>{" "}
              <span className="font-medium">{oddsStats.openingLines}</span>
            </div>
            <div>
              <span className="text-gray-500">Closing Lines:</span>{" "}
              <span className="font-medium">{oddsStats.closingLines}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
