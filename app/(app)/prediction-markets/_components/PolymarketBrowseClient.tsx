"use client";

import { useState, useEffect } from "react";
import { PolymarketEventCard } from "./PolymarketEventCard";
import type { PolymarketEvent } from "@/types/polymarket";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export function PolymarketBrowseClient() {
  const [events, setEvents] = useState<PolymarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = () => {
    setLoading(true);
    setError(null);
    fetch("/api/polymarket/events?limit=24&active=true&closed=false")
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
        <p className="text-sm text-[var(--text-body)]">Loading Polymarket events…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
        {error}
        <button
          type="button"
          onClick={fetchEvents}
          className="ml-3 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasOpenMarket = (event: PolymarketEvent) =>
    event.markets?.some((m) => !m.closed) ?? false;
  const displayEvents = events.filter(hasOpenMarket);

  if (displayEvents.length === 0) {
    return (
      <p className="text-sm text-[var(--text-body)] py-8">
        No active Polymarket events right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {displayEvents.map((event) => (
        <PolymarketEventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
