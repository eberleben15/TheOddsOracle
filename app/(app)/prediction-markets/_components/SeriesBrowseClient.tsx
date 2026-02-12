"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { KalshiSeries } from "@/types/kalshi";
import {
  categoryToSlug,
  CATEGORY_GROUPS,
  getGroupForKalshiCategory,
  getKalshiCategoriesInGroup,
} from "@/lib/kalshi-categories";
import { ArrowRightIcon, RectangleGroupIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

function groupSeriesByKalshiCategory(series: KalshiSeries[]): Map<string, KalshiSeries[]> {
  const map = new Map<string, KalshiSeries[]>();
  for (const s of series) {
    const cat = s.category?.trim() || "Other";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(s);
  }
  for (const [, list] of map) {
    list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }
  return map;
}

/** Build: groupId -> { kalshiCategory -> series[] } for categories that have series */
function buildGroupedCategories(
  byKalshiCategory: Map<string, KalshiSeries[]>
): Map<string, Map<string, KalshiSeries[]>> {
  const byGroup = new Map<string, Map<string, KalshiSeries[]>>();

  for (const [kalshiCat, seriesList] of byKalshiCategory) {
    if (seriesList.length === 0) continue;
    const groupId = getGroupForKalshiCategory(kalshiCat);
    if (!byGroup.has(groupId)) byGroup.set(groupId, new Map());
    byGroup.get(groupId)!.set(kalshiCat, seriesList);
  }

  return byGroup;
}

export function SeriesBrowseClient() {
  const [series, setSeries] = useState<KalshiSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/kalshi/series?limit=300")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.series)) {
          setSeries(data.series);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
        <p className="text-sm text-text-body">Loading categories…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
        {error}
      </div>
    );
  }

  const byKalshiCategory = groupSeriesByKalshiCategory(series);
  const grouped = buildGroupedCategories(byKalshiCategory);

  return (
    <div className="space-y-10">
      {CATEGORY_GROUPS.map((group) => {
        const categoriesInGroup = grouped.get(group.id);
        if (!categoriesInGroup || categoriesInGroup.size === 0) return null;

        const preferredOrder = getKalshiCategoriesInGroup(group.id);
        const kalshiCats = Array.from(categoriesInGroup.keys()).sort((a, b) => {
          const i = preferredOrder.indexOf(a);
          const j = preferredOrder.indexOf(b);
          if (i >= 0 && j >= 0) return i - j;
          if (i >= 0) return -1;
          if (j >= 0) return 1;
          return a.localeCompare(b);
        });
        if (kalshiCats.length === 0) return null;

        return (
          <section key={group.id} className="border border-gray-200 rounded-xl p-5 bg-white">
            <h2 className="text-lg font-semibold text-text-dark mb-1 flex items-center gap-2">
              <RectangleGroupIcon className="h-5 w-5 text-gray-500" />
              {group.label}
            </h2>
            {group.description && (
              <p className="text-sm text-text-body mb-4">{group.description}</p>
            )}
            <div className="space-y-4">
              {kalshiCats.map((kalshiCategory) => {
                const list = categoriesInGroup.get(kalshiCategory) ?? [];
                return (
                  <div key={kalshiCategory}>
                    <div className="flex items-center gap-2 mb-2">
                      <Link
                        href={`/prediction-markets/category/${categoryToSlug(kalshiCategory)}`}
                        className="font-medium text-text-dark hover:underline"
                      >
                        {kalshiCategory}
                      </Link>
                      <span className="text-xs text-text-body">
                        ({list.length} series)
                      </span>
                      <Link
                        href={`/prediction-markets/category/${categoryToSlug(kalshiCategory)}`}
                        className="text-sm text-gray-600 hover:text-text-dark font-medium"
                      >
                        View all markets →
                      </Link>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {list.slice(0, 9).map((s) => (
                        <li key={s.ticker}>
                          <Link
                            href={`/prediction-markets/series/${encodeURIComponent(s.ticker)}`}
                            className="
                              flex items-center justify-between gap-2
                              px-3 py-2 rounded-lg
                              bg-gray-50 border border-gray-100
                              hover:border-gray-200 hover:bg-gray-100
                              text-left transition-all text-sm
                            "
                          >
                            <span className="font-medium text-text-dark truncate flex-1">
                              {s.title || s.ticker}
                            </span>
                            <ArrowRightIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {list.length > 9 && (
                      <p className="text-xs text-text-body mt-2">
                        +{list.length - 9} more —{" "}
                        <Link
                          href={`/prediction-markets/category/${categoryToSlug(kalshiCategory)}`}
                          className="hover:underline"
                        >
                          view all in {kalshiCategory}
                        </Link>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
