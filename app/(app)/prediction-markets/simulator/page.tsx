"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  StrategyComparisonResult,
  StrategyStats,
  StrategySimulatorStrategy,
} from "@/types/abe";

function strategyLabel(s: StrategySimulatorStrategy): string {
  if (s.type === "flat") return `Flat $${s.stakeUsd}`;
  if (s.type === "flat_fraction")
    return `Flat ${(s.fractionOfInitial * 100).toFixed(0)}%`;
  return `${(s.kellyFraction * 100).toFixed(0)}% Kelly`;
}

export default function SimulatorPage() {
  const [initialBankroll, setInitialBankroll] = useState("1000");
  const [numBets, setNumBets] = useState("100");
  const [numRuns, setNumRuns] = useState("5000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StrategyComparisonResult | null>(null);

  const run = () => {
    setError(null);
    setLoading(true);
    fetch("/api/simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initialBankrollUsd: Number(initialBankroll) || 1000,
        numBets: Number(numBets) || 100,
        numRuns: Number(numRuns) || 5000,
      }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(new Error(e?.error ?? "Request failed")));
        return r.json();
      })
      .then((data: StrategyComparisonResult) => setResult(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/prediction-markets"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Prediction markets
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-dark)]">
          Strategy Simulator
        </h1>
        <p className="text-[var(--text-body)] mt-1">
          Compare flat vs fractional Kelly over many simulated bet sequences. Uses random bets with a slight positive edge by default.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
          Parameters
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Initial bankroll ($)</span>
            <input
              type="number"
              min={100}
              step={100}
              value={initialBankroll}
              onChange={(e) => setInitialBankroll(e.target.value)}
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Bets per run</span>
            <input
              type="number"
              min={10}
              max={500}
              value={numBets}
              onChange={(e) => setNumBets(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Monte Carlo runs</span>
            <input
              type="number"
              min={500}
              max={20000}
              step={500}
              value={numRuns}
              onChange={(e) => setNumRuns(e.target.value)}
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Running…" : "Run comparison"}
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      {result && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-dark)]">
            Results (initial bankroll ${result.initialBankrollUsd.toFixed(0)}, {result.strategies[0]?.numRuns ?? 0} runs, {result.strategies[0]?.numBetsPerRun ?? 0} bets each)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.strategies.map((s: StrategyStats, i: number) => (
              <StrategyCard key={i} stats={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StrategyCard({ stats }: { stats: StrategyStats }) {
  const label = strategyLabel(stats.strategy);
  const p = stats.terminalBankrollPercentiles;
  const dd = stats.maxDrawdownPercentiles;
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
      <p className="text-sm font-semibold text-[var(--text-dark)] mb-3">
        {label}
      </p>
      <div className="text-sm text-[var(--text-body)] space-y-2">
        <p>
          Median terminal bankroll:{" "}
          <strong>${stats.medianTerminalBankrollUsd.toFixed(0)}</strong>
        </p>
        <p className="text-xs text-gray-500">
          5th–95th %: ${p.p5.toFixed(0)} – ${p.p95.toFixed(0)}
        </p>
        <p>
          Median max drawdown:{" "}
          <strong>{(stats.medianMaxDrawdown * 100).toFixed(0)}%</strong>
        </p>
        <p className="text-xs text-gray-500">
          95th % max DD: {(dd.p95 * 100).toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
