"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  QuestionMarkCircleIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import type {
  StrategyComparisonResult,
  StrategyStats,
  StrategySimulatorStrategy,
} from "@/types/abe";

const PRESETS = {
  quick: { label: "Quick", numBets: 50, numRuns: 500 },
  standard: { label: "Standard", numBets: 100, numRuns: 5000 },
  accurate: { label: "Accurate", numBets: 100, numRuns: 10000 },
} as const;

const AVAILABLE_STRATEGIES: { id: string; strategy: StrategySimulatorStrategy }[] = [
  { id: "flat_2", strategy: { type: "flat_fraction", fractionOfInitial: 0.02 } },
  { id: "flat_20", strategy: { type: "flat", stakeUsd: 20 } },
  { id: "kelly_25", strategy: { type: "kelly", kellyFraction: 0.25 } },
  { id: "kelly_50", strategy: { type: "kelly", kellyFraction: 0.5 } },
];

function strategyLabel(s: StrategySimulatorStrategy): string {
  if (s.type === "flat") return `Flat $${s.stakeUsd}`;
  if (s.type === "flat_fraction")
    return `Flat ${(s.fractionOfInitial * 100).toFixed(0)}%`;
  return `${(s.kellyFraction * 100).toFixed(0)}% Kelly`;
}

function strategyKey(s: StrategySimulatorStrategy): string {
  if (s.type === "flat") return `flat_${s.stakeUsd}`;
  if (s.type === "flat_fraction") return `flat_fraction_${s.fractionOfInitial}`;
  return `kelly_${s.kellyFraction}`;
}

function parseCustomBets(text: string): { winProb: number; price: number }[] | null {
  const lines = text.trim().split(/\n/).filter(Boolean);
  const bets: { winProb: number; price: number }[] = [];
  for (const line of lines) {
    const parts = line.split(/[\s,]+/).map((p) => parseFloat(p.trim()));
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      const [price, winProb] = parts[0] <= 1 && parts[1] <= 1 ? [parts[0], parts[1]] : [parts[1], parts[0]];
      bets.push({
        price: Math.max(0.01, Math.min(0.99, price)),
        winProb: Math.max(0.05, Math.min(0.95, winProb)),
      });
    } else return null;
  }
  return bets.length >= 10 ? bets : null;
}

export default function SimulatorPage() {
  const [initialBankroll, setInitialBankroll] = useState("1000");
  const [numBets, setNumBets] = useState("100");
  const [numRuns, setNumRuns] = useState("5000");
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<Set<string>>(
    new Set(["flat_2", "kelly_25", "kelly_50"])
  );
  const searchParams = use(useSearchParams());
  const [betSource, setBetSource] = useState<"demo" | "custom" | "sandbox">("demo");
  const [customBetsText, setCustomBetsText] = useState("");
  const [sandboxCount, setSandboxCount] = useState<number | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StrategyComparisonResult | null>(null);

  const strategiesToRun = AVAILABLE_STRATEGIES.filter((s) =>
    selectedStrategyIds.has(s.id)
  ).map((s) => s.strategy);

  const sourceParam = searchParams?.get("source") ?? null;
  useEffect(() => {
    if (sourceParam === "sandbox") setBetSource("sandbox");
  }, [sourceParam]);

  useEffect(() => {
    if (betSource !== "sandbox") return;
    fetch("/api/sandbox")
      .then((r) => (r.ok ? r.json() : { positions: [] }))
      .then((data: { positions?: { length: number } }) =>
        setSandboxCount(Array.isArray(data.positions) ? data.positions.length : 0)
      )
      .catch(() => setSandboxCount(0));
  }, [betSource]);

  const applyPreset = (key: keyof typeof PRESETS) => {
    const p = PRESETS[key];
    setNumBets(String(p.numBets));
    setNumRuns(String(p.numRuns));
  };

  const run = async () => {
    setError(null);
    let body: {
      initialBankrollUsd: number;
      numBets?: number;
      numRuns: number;
      bets?: { winProb: number; price: number }[];
      strategies?: StrategySimulatorStrategy[];
    } = {
      initialBankrollUsd: Number(initialBankroll) || 1000,
      numRuns: Number(numRuns) || 5000,
      strategies: strategiesToRun.length > 0 ? strategiesToRun : undefined,
    };
    if (betSource === "custom") {
      const bets = parseCustomBets(customBetsText);
      if (!bets) {
        setError("Enter at least 10 bets, one per line: price,winProb (e.g. 0.55,0.58)");
        return;
      }
      body.bets = bets;
    } else if (betSource === "sandbox") {
      const res = await fetch("/api/sandbox");
      const data = await res.json();
      const positions = Array.isArray(data.positions) ? data.positions : [];
      if (positions.length < 10) {
        setError("Sandbox is empty or has fewer than 10 bets. Add bets from a matchup or prediction market.");
        return;
      }
      body.bets = positions.map((p: { costPerShare: number }) => ({
        price: p.costPerShare,
        winProb: p.costPerShare,
      }));
    } else {
      body.numBets = Number(numBets) || 100;
    }
    setLoading(true);
    fetch("/api/simulator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok)
          return r.json().then((e) => Promise.reject(new Error(e?.error ?? "Request failed")));
        return r.json();
      })
      .then((data: StrategyComparisonResult) => setResult(data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const toggleStrategy = (id: string) => {
    setSelectedStrategyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
          Compare flat vs fractional Kelly over many simulated bet sequences.
        </p>
      </div>

      {/* Explainer */}
      <div className="rounded-xl border border-[var(--border-color)] bg-gray-50/80 p-4 mb-6">
        <button
          type="button"
          onClick={() => setShowExplainer(!showExplainer)}
          className="flex items-center gap-2 text-sm font-medium text-[var(--text-dark)] w-full text-left"
        >
          <QuestionMarkCircleIcon className="h-5 w-5 text-gray-500" />
          What does this do?
          {showExplainer ? (
            <ChevronUpIcon className="h-4 w-4 ml-auto" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 ml-auto" />
          )}
        </button>
        {showExplainer && (
          <div className="mt-3 text-sm text-[var(--text-body)] space-y-2">
            <p>
              We run thousands of possible outcomes for your bet sequence and compare how
              different staking rules (flat %, Kelly) affect final bankroll and worst
              drawdown.
            </p>
            <p>
              <strong>Bets per run</strong> = length of each simulated betting streak.{" "}
              <strong>Monte Carlo runs</strong> = number of random scenarios (more = more
              stable results, slower).
            </p>
          </div>
        )}
      </div>

      {/* Parameters */}
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
          Parameters
        </h2>

        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key as keyof typeof PRESETS)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 items-end mb-4">
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
          {betSource === "demo" && (
            <>
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
            </>
          )}
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
        </div>

        {/* Bet source */}
        <div className="mb-4">
          <span className="text-xs text-gray-500 block mb-2">Bet source</span>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="betSource"
                checked={betSource === "demo"}
                onChange={() => setBetSource("demo")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Demo (random positive-edge bets)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="betSource"
                checked={betSource === "sandbox"}
                onChange={() => setBetSource("sandbox")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">
                Sandbox {sandboxCount != null ? `(${sandboxCount} bets)` : ""}
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="betSource"
                checked={betSource === "custom"}
                onChange={() => setBetSource("custom")}
                className="rounded border-gray-300"
              />
              <span className="text-sm">My bets</span>
            </label>
          </div>
          {betSource === "demo" && (
            <p className="mt-2 text-xs text-gray-500">
              Using random bets with ~2% average edge, prices 30–70¢.
            </p>
          )}
          {betSource === "sandbox" && (
            <p className="mt-2 text-xs text-gray-500">
              {sandboxCount != null && sandboxCount < 10
                ? "Add at least 10 bets to your Sandbox to run the simulator."
                : "Using your Sandbox portfolio. winProb = cost per share (no edge assumed)."}
            </p>
          )}
          {betSource === "custom" && (
            <div className="mt-2">
              <textarea
                value={customBetsText}
                onChange={(e) => setCustomBetsText(e.target.value)}
                placeholder="One bet per line: price,winProb (e.g. 0.55,0.58). At least 10 bets."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          )}
        </div>

        {/* Strategy selection */}
        <div className="mb-4">
          <span className="text-xs text-gray-500 block mb-2">Strategies to compare</span>
          <div className="flex flex-wrap gap-4">
            {AVAILABLE_STRATEGIES.map(({ id, strategy }) => (
              <label key={id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStrategyIds.has(id)}
                  onChange={() => toggleStrategy(id)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{strategyLabel(strategy)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={run}
            disabled={
              loading ||
              strategiesToRun.length === 0 ||
              (betSource === "sandbox" && (sandboxCount == null || sandboxCount < 10))
            }
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Running…" : "Run comparison"}
          </button>
          {loading && (
            <span className="text-xs text-gray-500">This may take a few seconds.</span>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {result && (
        <ResultsSection result={result} />
      )}
    </div>
  );
}

function ResultsSection({ result }: { result: StrategyComparisonResult }) {
  const initial = result.initialBankrollUsd;
  const numRuns = result.strategies[0]?.numRuns ?? 0;
  const numBets = result.strategies[0]?.numBetsPerRun ?? 0;
  const maxMedian = Math.max(...result.strategies.map((s) => s.medianTerminalBankrollUsd));
  const minDrawdown = Math.min(...result.strategies.map((s) => s.medianMaxDrawdown));
  const bestMedianKey =
    result.strategies.length > 0
      ? strategyKey(
          result.strategies.reduce((a, b) =>
            a.medianTerminalBankrollUsd >= b.medianTerminalBankrollUsd ? a : b
          ).strategy
        )
      : "";
  const bestDrawdownKey =
    result.strategies.length > 0
      ? strategyKey(
          result.strategies.reduce((a, b) =>
            a.medianMaxDrawdown <= b.medianMaxDrawdown ? a : b
          ).strategy
        )
      : "";

  const takeaway =
    result.strategies.length > 0
      ? (() => {
          const best = result.strategies.reduce((a, b) =>
            a.medianTerminalBankrollUsd >= b.medianTerminalBankrollUsd ? a : b
          );
          const safest = result.strategies.reduce((a, b) =>
            a.medianMaxDrawdown <= b.medianMaxDrawdown ? a : b
          );
          const same = strategyKey(best.strategy) === strategyKey(safest.strategy);
          if (same)
            return `Under these assumptions, ${strategyLabel(best.strategy)} had the best median outcome and the lowest median drawdown.`;
          return `Under these assumptions, ${strategyLabel(best.strategy)} had the best median outcome; ${strategyLabel(safest.strategy)} had the lowest median drawdown.`;
        })()
      : "";

  const exportCsv = () => {
    const headers = [
      "Strategy",
      "Median terminal bankroll",
      "P5",
      "P25",
      "P75",
      "P95",
      "Median max drawdown %",
      "DD P95 %",
    ];
    const rows = result.strategies.map((s) => [
      strategyLabel(s.strategy),
      s.medianTerminalBankrollUsd.toFixed(0),
      s.terminalBankrollPercentiles.p5.toFixed(0),
      s.terminalBankrollPercentiles.p25.toFixed(0),
      s.terminalBankrollPercentiles.p75.toFixed(0),
      s.terminalBankrollPercentiles.p95.toFixed(0),
      (s.medianMaxDrawdown * 100).toFixed(0),
      (s.maxDrawdownPercentiles.p95 * 100).toFixed(0),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strategy-simulator-results.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-dark)]">Results</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Initial bankroll ${initial.toFixed(0)} · {numBets} bets · {numRuns.toLocaleString()} runs
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {takeaway && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm text-[var(--text-body)]">
          {takeaway}
        </div>
      )}

      {/* Bar charts */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Median terminal bankroll
          </h3>
          <div className="space-y-3">
            {result.strategies.map((s) => {
              const pct = maxMedian > 0 ? (s.medianTerminalBankrollUsd / maxMedian) * 100 : 0;
              return (
                <div key={strategyKey(s.strategy)} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-[var(--text-dark)] shrink-0">
                    {strategyLabel(s.strategy)}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary/70 rounded min-w-[2px]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm text-right text-gray-600 shrink-0">
                    ${s.medianTerminalBankrollUsd.toFixed(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Median max drawdown (lower is better)
          </h3>
          <div className="space-y-3">
            {result.strategies.map((s) => {
              const maxDd = Math.max(
                ...result.strategies.map((x) => x.medianMaxDrawdown),
                0.01
              );
              const pct = (s.medianMaxDrawdown / maxDd) * 100;
              return (
                <div key={strategyKey(s.strategy)} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-[var(--text-dark)] shrink-0">
                    {strategyLabel(s.strategy)}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-500/70 rounded min-w-[2px]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-sm text-right text-gray-600 shrink-0">
                    {(s.medianMaxDrawdown * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.strategies.map((s: StrategyStats, i: number) => (
          <StrategyCard
            key={i}
            stats={s}
            bestMedian={strategyKey(s.strategy) === bestMedianKey}
            bestDrawdown={strategyKey(s.strategy) === bestDrawdownKey}
          />
        ))}
      </div>
    </div>
  );
}

function StrategyCard({
  stats,
  bestMedian,
  bestDrawdown,
}: {
  stats: StrategyStats;
  bestMedian: boolean;
  bestDrawdown: boolean;
}) {
  const label = strategyLabel(stats.strategy);
  const p = stats.terminalBankrollPercentiles;
  const dd = stats.maxDrawdownPercentiles;
  const badges = [];
  if (bestMedian) badges.push("Best median");
  if (bestDrawdown) badges.push("Lowest drawdown");
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-[var(--text-dark)]">{label}</p>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {badges.map((b) => (
              <span
                key={b}
                className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
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
