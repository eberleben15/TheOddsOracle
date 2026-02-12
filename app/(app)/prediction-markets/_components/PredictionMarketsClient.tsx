"use client";

import { useState, useEffect, useCallback } from "react";
import { KalshiMarketCard } from "./KalshiMarketCard";
import type { KalshiMarket, KalshiMarketStatus } from "@/types/kalshi";
import { ArrowPathIcon, FunnelIcon } from "@heroicons/react/24/outline";

const STATUS_OPTIONS: { value: KalshiMarketStatus | ""; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "settled", label: "Settled" },
  { value: "", label: "All" },
];

interface PredictionMarketsClientProps {
  /** When set, only markets for this series are shown. */
  seriesTicker?: string;
  /** When set, only markets in this category are shown (aggregates series in category). */
  category?: string;
  /** Optional title to show above the list (e.g. series name). */
  title?: string;
}

export function PredictionMarketsClient({ seriesTicker, category, title }: PredictionMarketsClientProps) {
  const [markets, setMarkets] = useState<KalshiMarket[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<KalshiMarketStatus | "">("open");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarkets = useCallback(
    async (cursorParam?: string | null, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }
      try {
        const params = new URLSearchParams();
        params.set("limit", category ? "80" : "24");
        if (status) params.set("status", status);
        if (!category && cursorParam) params.set("cursor", cursorParam);
        if (seriesTicker) params.set("series_ticker", seriesTicker);
        if (category) params.set("category", category);
        const res = await fetch(`/api/kalshi/markets?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (append) {
          setMarkets((prev) => [...prev, ...(data.markets || [])]);
        } else {
          setMarkets(data.markets || []);
        }
        setCursor(category ? "" : (data.cursor || null));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load markets");
        if (!append) setMarkets([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [status, seriesTicker, category]
  );

  useEffect(() => {
    fetchMarkets(null, false);
  }, [fetchMarkets]);

  const handleLoadMore = () => {
    if (cursor && !loadingMore) fetchMarkets(cursor, true);
  };

  return (
    <div className="space-y-6">
      {title && (
        <h2 className="text-lg font-semibold text-text-dark">{title}</h2>
      )}
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-text-body">Status</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value || "all"}
              onClick={() => setStatus(opt.value as KalshiMarketStatus | "")}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${status === opt.value
                  ? "bg-gray-800 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchMarkets(null, false)}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Markets grid */}
      {!loading && markets.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {markets.map((market) => (
              <KalshiMarketCard key={market.ticker} market={market} />
            ))}
          </div>
          {cursor && !category && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-lg bg-gray-800 text-white font-medium hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty */}
      {!loading && !error && markets.length === 0 && (
        <div className="text-center py-12 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-text-body">No markets found for this filter.</p>
          <p className="text-sm text-gray-400 mt-1">
            Try a different status or refresh.
          </p>
        </div>
      )}
    </div>
  );
}
