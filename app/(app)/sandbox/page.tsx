"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Square2StackIcon, TrashIcon, ChartBarIcon, ChartPieIcon } from "@heroicons/react/24/outline";
import type { ABEPosition, ABEContract } from "@/types/abe";

function getSource(contractId: string): string {
  if (contractId.startsWith("sandbox:sports:")) return "Sports";
  if (contractId.startsWith("kalshi:")) return "Kalshi";
  if (contractId.startsWith("polymarket:")) return "Polymarket";
  return "Other";
}

function getTitle(position: ABEPosition, contracts: ABEContract[] | undefined): string {
  const c = contracts?.find((x) => x.id === position.contractId);
  if (c?.title) return c.subtitle ? `${c.title} (${c.subtitle})` : c.title;
  if (position.contractId.startsWith("sandbox:sports:")) {
    const parts = position.contractId.split(":");
    const market = parts[3];
    const outcome = parts[4];
    if (market === "moneyline") return `${outcome === "away" ? "Away" : "Home"} ML`;
    if (market === "spread") return `${outcome === "away" ? "Away" : "Home"} spread`;
    if (market === "total") return outcome === "over" ? "Over" : "Under";
  }
  return position.contractId;
}

export default function SandboxPage() {
  const [positions, setPositions] = useState<ABEPosition[]>([]);
  const [contracts, setContracts] = useState<ABEContract[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const fetchSandbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sandbox");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load sandbox");
      setPositions(data.positions ?? []);
      setContracts(data.contracts ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sandbox");
      setPositions([]);
      setContracts(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSandbox();
  }, [fetchSandbox]);

  const removeAt = async (index: number) => {
    const next = positions.filter((_, i) => i !== index);
    setPositions(next);
    setError(null);
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: next,
          contracts: contracts?.filter((c) => next.some((p) => p.contractId === c.id)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update");
      setContracts(contracts?.filter((c) => next.some((p) => p.contractId === c.id)) ?? undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
      setPositions(positions);
    }
  };

  const clearSandbox = async () => {
    if (!confirm("Clear all items from your Sandbox?")) return;
    setClearing(true);
    setError(null);
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: [], contracts: [] }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to clear");
      }
      setPositions([]);
      setContracts(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear");
    } finally {
      setClearing(false);
    }
  };

  const bySource = positions.reduce<Record<string, ABEPosition[]>>((acc, p) => {
    const s = getSource(p.contractId);
    if (!acc[s]) acc[s] = [];
    acc[s].push(p);
    return acc;
  }, {});
  const sourceOrder = ["Sports", "Kalshi", "Polymarket", "Other"];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-dark)] flex items-center gap-2">
          <Square2StackIcon className="h-7 w-7" />
          Sandbox
        </h1>
        <p className="text-[var(--text-body)] mt-1">
          Bets you&apos;ve added from matchups and prediction markets. Use them in the Strategy
          Simulator or Portfolio Risk.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : positions.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-8 text-center">
          <p className="text-[var(--text-body)] mb-4">
            Add bets from a matchup or prediction market to get started.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/sports/cbb"
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Browse sports
            </Link>
            <Link
              href="/prediction-markets"
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
            >
              Browse prediction markets
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Link
              href="/prediction-markets/simulator?source=sandbox"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90"
            >
              <ChartBarIcon className="h-4 w-4" />
              Use in Strategy Simulator
            </Link>
            <Link
              href="/prediction-markets/portfolio?source=sandbox"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ChartPieIcon className="h-4 w-4" />
              Analyze risk
            </Link>
            <button
              type="button"
              onClick={clearSandbox}
              disabled={clearing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
              {clearing ? "Clearing…" : "Clear Sandbox"}
            </button>
          </div>

          <div className="space-y-6">
            {sourceOrder.filter((s) => bySource[s]?.length).map((source) => (
              <div key={source} className="rounded-xl border border-[var(--border-color)] bg-white overflow-hidden">
                <h2 className="text-sm font-semibold text-[var(--text-dark)] px-4 py-2 bg-gray-50 border-b border-[var(--border-color)]">
                  {source}
                </h2>
                <ul className="divide-y divide-[var(--border-color)]">
                  {bySource[source].map((position, idx) => {
                    const globalIndex = positions.indexOf(position);
                    return (
                      <li
                        key={`${position.contractId}-${position.side}-${globalIndex}`}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--text-dark)] truncate">
                            {getTitle(position, contracts)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {position.side} · size {position.size} · {(position.costPerShare * 100).toFixed(0)}¢
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAt(globalIndex)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 shrink-0"
                          title="Remove"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
