"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Select, SelectItem } from "@nextui-org/react";
import type { Sport } from "@/lib/sports/sport-config";
import { getAllSports } from "@/lib/sports/sport-config";

type SlatePosition = {
  candidateId: string;
  stakeUsd: number;
  shares?: number;
  reason?: string;
  label?: string;
};

type ExcludedItem = {
  id: string;
  label?: string;
  reason: string;
};

type SlateResult = {
  positions: SlatePosition[];
  objectiveValue?: number;
  metrics?: { expectedReturn?: number; numCorrelatedPairs?: number };
  excludedReasons?: Record<string, string>;
  excludedWithLabels?: ExcludedItem[];
  solver: string;
  solveTimeMs?: number;
  constraintsUsed?: {
    bankrollUsd: number;
    kellyFraction?: number;
    maxPositions?: number;
    maxFractionPerPosition?: number;
    maxFactorFraction?: number;
  };
  candidateCounts?: { sports: number; kalshi: number; polymarket: number };
};

const SPORT_OPTIONS = getAllSports();

export function BuildSlateSection() {
  const [sport, setSport] = useState<Sport>("cbb");
  const [includeKalshi, setIncludeKalshi] = useState(false);
  const [includePolymarket, setIncludePolymarket] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SlateResult | null>(null);

  function copySlateToClipboard() {
    if (!result?.positions.length) return;
    const text = result.positions
      .map((p) => `${p.label ?? p.candidateId}\t$${p.stakeUsd.toFixed(2)}${p.reason ? `\t${p.reason}` : ""}`)
      .join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }

  function downloadSlateCsv() {
    if (!result?.positions.length) return;
    const header = "label,candidateId,stakeUsd,reason";
    const rows = result.positions.map((p) =>
      [
        `"${(p.label ?? p.candidateId).replace(/"/g, '""')}"`,
        p.candidateId,
        p.stakeUsd.toFixed(2),
        p.reason ? `"${p.reason.replace(/"/g, '""')}"` : "",
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `slate-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const [copyDone, setCopyDone] = useState(false);

  async function buildSlate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/abe/decision-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          limit: 25,
          includeKalshi: includeKalshi || undefined,
          includePolymarket: includePolymarket || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to build slate");
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-text-dark mb-3">Build my slate</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        One-click portfolio: we pick positions and sizes from today’s value bets using your bankroll and risk limits.
      </p>
      <p className="text-xs text-gray-500 mb-4">
        Sizing uses your risk capital from{" "}
        <Link href="/settings" className="text-primary hover:underline">
          Settings
        </Link>
        . Set it there for personalized stakes.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          label="Sport"
          selectedKeys={[sport]}
          onSelectionChange={(keys) => {
            const v = Array.from(keys)[0];
            if (v) setSport(v as Sport);
          }}
          className="w-40"
          size="sm"
        >
          {SPORT_OPTIONS.map((s) => (
            <SelectItem key={s}>{s.toUpperCase()}</SelectItem>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={includeKalshi}
            onChange={(e) => setIncludeKalshi(e.target.checked)}
            className="rounded border-default"
          />
          Include Kalshi
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={includePolymarket}
            onChange={(e) => setIncludePolymarket(e.target.checked)}
            className="rounded border-default"
          />
          Include Polymarket
        </label>
        <Button
          color="primary"
          onPress={buildSlate}
          isDisabled={loading}
          isLoading={loading}
        >
          {loading ? "Building…" : "Build my slate"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
      )}

      {result && (
        <Card className="border border-default-200">
          <CardBody className="gap-4">
            {result.constraintsUsed && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Based on <strong>${result.constraintsUsed.bankrollUsd.toLocaleString()}</strong> risk capital
                {result.constraintsUsed.maxPositions != null && (
                  <> · up to {result.constraintsUsed.maxPositions} positions</>
                )}
                . <Link href="/settings" className="text-primary hover:underline">Edit in Settings</Link>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <span>Solver: <strong>{result.solver}</strong></span>
              {result.solveTimeMs != null && (
                <span>Solved in {(result.solveTimeMs).toFixed(0)}ms</span>
              )}
              {result.metrics?.expectedReturn != null && (
                <span>Est. return: ${result.metrics.expectedReturn.toFixed(2)}</span>
              )}
              {result.candidateCounts && (
                <span>
                  Candidates: {result.candidateCounts.sports} sports
                  {result.candidateCounts.kalshi > 0 && `, ${result.candidateCounts.kalshi} Kalshi`}
                  {result.candidateCounts.polymarket > 0 && `, ${result.candidateCounts.polymarket} Polymarket`}
                </span>
              )}
            </div>
            {result.positions.length === 0 ? (
              <p className="text-sm text-gray-500">No positions selected (no positive-edge candidates or constraints too tight).</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {result.positions.map((p) => (
                    <li
                      key={p.candidateId}
                      className="flex flex-wrap items-baseline justify-between gap-2 text-sm border-b border-default-100 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="font-medium text-text-dark">
                        {p.label ?? p.candidateId}
                      </span>
                      <span className="text-value font-medium">
                        ${p.stakeUsd.toFixed(0)}
                      </span>
                      {p.reason && (
                        <span className="text-gray-500 text-xs w-full">{p.reason}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-default-100">
                  <Button size="sm" variant="flat" onPress={copySlateToClipboard}>
                    {copyDone ? "Copied!" : "Copy to clipboard"}
                  </Button>
                  <Button size="sm" variant="flat" onPress={downloadSlateCsv}>
                    Download CSV
                  </Button>
                </div>
              </>
            )}
            {result.excludedReasons && Object.keys(result.excludedReasons).length > 0 && (
              <p className="text-xs text-gray-500">
                {Object.keys(result.excludedReasons).length} candidate(s) excluded (correlation/position limits).
              </p>
            )}
            {result.excludedWithLabels && result.excludedWithLabels.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-xs text-gray-600 dark:text-gray-400 list-none font-medium">
                  Why we skipped {result.excludedWithLabels.length} bet(s)
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-default-200">
                  {result.excludedWithLabels.map((ex) => (
                    <li key={ex.id} className="flex flex-wrap gap-2">
                      <span className="font-medium text-text-dark truncate max-w-[200px]" title={ex.label ?? ex.id}>
                        {ex.label ?? ex.id}
                      </span>
                      <span className="text-gray-500">— {ex.reason}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardBody>
        </Card>
      )}
    </section>
  );
}
