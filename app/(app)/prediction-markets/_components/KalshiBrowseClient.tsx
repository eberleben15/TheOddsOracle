"use client";

import { useState, useEffect, useCallback } from "react";
import { KalshiMarketCard } from "./KalshiMarketCard";
import type { KalshiMarket } from "@/types/kalshi";
import { ArrowPathIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { KALSHI_BROWSE_CATEGORIES } from "@/lib/kalshi-categories";

const PAGE_SIZE = 100;

/** null = All categories */
type SelectedCategoryId = string | null;

export function KalshiBrowseClient() {
  const [markets, setMarkets] = useState<KalshiMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategoryId>(null);

  const fetchMarkets = useCallback(
    async (cursorParam?: string | null, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
        });
        if (selectedCategory) {
          params.set("category", selectedCategory);
        } else if (cursorParam) {
          params.set("cursor", cursorParam);
        }

        const res = await fetch(`/api/kalshi/markets?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || res.statusText);
        }
        const data = await res.json();
        const list = Array.isArray(data.markets) ? data.markets : [];

        if (append) {
          setMarkets((prev) => [...prev, ...list]);
        } else {
          setMarkets(list);
        }
        setCursor(selectedCategory ? null : (data.cursor || null));
        setHasMore(!!data.cursor && data.cursor.length > 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
        if (!append) setMarkets([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedCategory]
  );

  useEffect(() => {
    fetchMarkets(null, false);
  }, [fetchMarkets]);

  const handleCategoryChange = (categoryId: SelectedCategoryId) => {
    setSelectedCategory(categoryId);
    setMarkets([]);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && cursor) fetchMarkets(cursor, true);
  };

  if (loading && markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
        <p className="text-sm text-[var(--text-body)]">Loading Kalshi markets…</p>
      </div>
    );
  }

  if (error && markets.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
        {error}
        <button
          type="button"
          onClick={() => fetchMarkets(null, false)}
          className="ml-3 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <p className="text-sm text-[var(--text-body)] py-8">
        No open Kalshi markets right now.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCategoryChange(null)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Squares2X2Icon className="h-4 w-4" />
            All
          </button>
          {KALSHI_BROWSE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => fetchMarkets(null, false)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 shrink-0"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {markets.map((market) => (
          <KalshiMarketCard key={market.ticker} market={market} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-lg bg-gray-800 text-white font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-gray-700"
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
    </div>
  );
}
