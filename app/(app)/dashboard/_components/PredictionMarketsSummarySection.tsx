"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon, ArrowTrendingUpIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface MarketSummary {
  kalshi: {
    connected: boolean;
    positionsCount: number;
    topCategories?: string[];
  };
  polymarket: {
    connected: boolean;
    positionsCount: number;
  };
}

export function PredictionMarketsSummarySection() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dashboard-pm-collapsed") === "true";
    }
    return false;
  });
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem("dashboard-pm-collapsed", String(newValue));
      return newValue;
    });
  };

  const loadSummary = useCallback(async () => {
    try {
      const [kalshiRes, polymarketRes, positionsRes] = await Promise.all([
        fetch("/api/kalshi/status"),
        fetch("/api/polymarket/status"),
        fetch("/api/positions"),
      ]);

      const kalshiData = await kalshiRes.json();
      const polymarketData = await polymarketRes.json();
      const positionsData = await positionsRes.json();

      const positions = positionsData.positions || [];
      const kalshiPositions = positions.filter((p: { contractId: string }) => 
        p.contractId.startsWith("kalshi:")
      ).length;
      const polymarketPositions = positions.filter((p: { contractId: string }) => 
        p.contractId.startsWith("polymarket:")
      ).length;

      setSummary({
        kalshi: {
          connected: !!kalshiData?.connected,
          positionsCount: kalshiPositions,
        },
        polymarket: {
          connected: !!polymarketData?.connected,
          positionsCount: polymarketPositions,
        },
      });
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const syncPositions = async () => {
    setSyncing(true);
    try {
      await fetch("/api/positions");
      await loadSummary();
    } finally {
      setSyncing(false);
    }
  };

  const totalPositions = summary 
    ? summary.kalshi.positionsCount + summary.polymarket.positionsCount 
    : 0;
  const isConnected = summary?.kalshi.connected || summary?.polymarket.connected;

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-3 group"
        >
          <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-[var(--text-dark)] group-hover:text-primary transition-colors flex items-center gap-2">
              Prediction Markets
              {totalPositions > 0 && (
                <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                  {totalPositions} positions
                </span>
              )}
              {isCollapsed ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUpIcon className="w-4 h-4 text-gray-400" />
              )}
            </h2>
            <p className="text-sm text-gray-500">Kalshi & Polymarket positions</p>
          </div>
        </button>
        <Link
          href="/prediction-markets"
          className="text-sm font-medium text-primary hover:underline shrink-0"
        >
          Browse Markets →
        </Link>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden">
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-2 gap-4">
                <div className="h-16 bg-gray-100 rounded-lg" />
                <div className="h-16 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ) : (
            <>
              {/* Platform Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Kalshi */}
                <Link
                  href="/prediction-markets/kalshi"
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[var(--text-dark)]">Kalshi</span>
                    {summary?.kalshi.connected ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Not connected
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-dark)] tabular-nums">
                    {summary?.kalshi.positionsCount ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">positions</p>
                </Link>

                {/* Polymarket */}
                <Link
                  href="/prediction-markets/polymarket"
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[var(--text-dark)]">Polymarket</span>
                    {summary?.polymarket.connected ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Connected
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Not connected
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-[var(--text-dark)] tabular-nums">
                    {summary?.polymarket.positionsCount ?? 0}
                  </p>
                  <p className="text-xs text-gray-500">positions</p>
                </Link>
              </div>

              {/* Expanded Content */}
              {!isCollapsed && (
                <>
                  {/* Quick Links */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href="/prediction-markets/kalshi"
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Browse Kalshi
                    </Link>
                    <Link
                      href="/prediction-markets/polymarket"
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Browse Polymarket
                    </Link>
                    <Link
                      href="/prediction-markets/portfolio"
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Portfolio Risk
                    </Link>
                    {isConnected && (
                      <button
                        onClick={syncPositions}
                        disabled={syncing}
                        className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <ArrowPathIcon className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                        {syncing ? "Syncing..." : "Sync"}
                      </button>
                    )}
                  </div>

                  {/* Connection Hint */}
                  {!isConnected && (
                    <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Connect your accounts in{" "}
                        <Link href="/settings" className="font-medium underline">
                          Settings
                        </Link>{" "}
                        to sync positions and track performance.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
