"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Button, 
  Card, 
  CardBody, 
  Select, 
  SelectItem,
  Slider,
  Chip,
  Tooltip,
  Progress,
} from "@nextui-org/react";
import {
  SparklesIcon,
  Cog6ToothIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BoltIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { Sport } from "@/lib/sports/sport-config";
import { getAllSports, getSportConfig } from "@/lib/sports/sport-config";
import type { BankrollSummary } from "@/types/abe";

type SlatePosition = {
  candidateId: string;
  stakeUsd: number;
  shares?: number;
  reason?: string;
  label?: string;
  expectedValue?: number;
  confidence?: number;
  odds?: number;
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
  candidateCounts?: { sports: number; kalshi: number; polymarket: number; playerProps?: number };
};

const SPORT_OPTIONS = getAllSports();

export default function SlateBuilderPage() {
  const [sport, setSport] = useState<Sport>("cbb");
  const [includeKalshi, setIncludeKalshi] = useState(false);
  const [includePolymarket, setIncludePolymarket] = useState(false);
  const [includePlayerProps, setIncludePlayerProps] = useState(false);
  const [maxPositions, setMaxPositions] = useState(10);
  const [minEdge, setMinEdge] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SlateResult | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [bankroll, setBankroll] = useState<BankrollSummary | null>(null);
  const [bankrollLoading, setBankrollLoading] = useState(true);

  useEffect(() => {
    fetch("/api/bankroll")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BankrollSummary | null) => setBankroll(data))
      .catch(() => setBankroll(null))
      .finally(() => setBankrollLoading(false));
  }, []);

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
          limit: maxPositions,
          includeKalshi: includeKalshi || undefined,
          includePolymarket: includePolymarket || undefined,
          includePlayerProps: includePlayerProps || undefined,
          minEdge: minEdge / 100,
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

  const totalStake = result?.positions.reduce((sum, p) => sum + p.stakeUsd, 0) ?? 0;
  const sportConfig = getSportConfig(sport);

  return (
    <div className="min-h-full bg-[var(--body-bg)] p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-dark)]">Slate Builder</h1>
              <p className="text-gray-500">AI-powered portfolio construction</p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-4 max-w-2xl">
            Build an optimized betting portfolio in one click. We analyze value bets across sports and prediction markets, 
            then select positions and size them based on your bankroll and risk tolerance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Bankroll Status */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardBody className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[var(--text-dark)] flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-emerald-500" />
                    Bankroll
                  </h3>
                  <Link href="/settings" className="text-xs text-primary hover:underline">
                    Edit
                  </Link>
                </div>
                {bankrollLoading ? (
                  <div className="animate-pulse h-8 bg-gray-200 rounded" />
                ) : bankroll ? (
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-dark)] tabular-nums">
                      ${bankroll.bankrollUsd.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{bankroll.riskMessage}</p>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Max position</span>
                        <span className="font-medium">${bankroll.recommendedMaxPositionUsd.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Kelly fraction</span>
                        <span className="font-medium">{(bankroll.kellyFraction * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">No bankroll set</p>
                    <Link 
                      href="/settings" 
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Set up in Settings →
                    </Link>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Build Configuration */}
            <Card className="border border-gray-200 dark:border-gray-700">
              <CardBody className="p-4">
                <h3 className="font-semibold text-[var(--text-dark)] flex items-center gap-2 mb-4">
                  <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
                  Configuration
                </h3>

                {/* Sport Selection */}
                <div className="mb-4">
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Sport</label>
                  <Select
                    selectedKeys={[sport]}
                    onSelectionChange={(keys) => {
                      const v = Array.from(keys)[0];
                      if (v) setSport(v as Sport);
                    }}
                    size="sm"
                    classNames={{ trigger: "bg-gray-50 dark:bg-gray-800" }}
                  >
                    {SPORT_OPTIONS.map((s) => (
                      <SelectItem key={s}>{getSportConfig(s).displayName}</SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Max Positions */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <label className="text-gray-600 dark:text-gray-400">Max positions</label>
                    <span className="font-medium text-[var(--text-dark)]">{maxPositions}</span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={1}
                    maxValue={25}
                    value={maxPositions}
                    onChange={(v) => setMaxPositions(v as number)}
                    className="max-w-full"
                  />
                </div>

                {/* Min Edge */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <label className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      Min edge
                      <Tooltip content="Only include bets with expected value above this threshold">
                        <InformationCircleIcon className="h-4 w-4 text-gray-400" />
                      </Tooltip>
                    </label>
                    <span className="font-medium text-[var(--text-dark)]">{minEdge}%</span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.5}
                    minValue={0}
                    maxValue={10}
                    value={minEdge}
                    onChange={(v) => setMinEdge(v as number)}
                    className="max-w-full"
                  />
                </div>

                {/* Market Sources */}
                <div className="mb-4">
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">Include markets</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeKalshi}
                        onChange={(e) => setIncludeKalshi(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Kalshi</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={includePolymarket}
                        onChange={(e) => setIncludePolymarket(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>Polymarket</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <input
                        type="checkbox"
                        checked={includePlayerProps}
                        onChange={(e) => setIncludePlayerProps(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <span>NBA Player Props</span>
                      <Chip size="sm" color="secondary" variant="flat">New</Chip>
                    </label>
                  </div>
                </div>

                {/* Build Button */}
                <Button
                  color="primary"
                  size="lg"
                  onPress={buildSlate}
                  isDisabled={loading || !bankroll}
                  isLoading={loading}
                  className="w-full font-semibold"
                  startContent={!loading && <BoltIcon className="h-5 w-5" />}
                >
                  {loading ? "Building..." : "Build My Slate"}
                </Button>

                {!bankroll && !bankrollLoading && (
                  <p className="text-xs text-amber-600 mt-2 text-center">
                    Set up your bankroll first to enable slate building
                  </p>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {error && (
              <Card className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 mb-4">
                <CardBody className="p-4 flex items-start gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">Error building slate</p>
                    <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                  </div>
                </CardBody>
              </Card>
            )}

            {!result && !loading && !error && (
              <Card className="border border-gray-200 dark:border-gray-700 h-full min-h-[400px]">
                <CardBody className="flex flex-col items-center justify-center text-center p-8">
                  <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <ChartBarIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-dark)] mb-2">Ready to build</h3>
                  <p className="text-gray-500 max-w-md">
                    Configure your preferences and click "Build My Slate" to generate an optimized 
                    portfolio of bets based on today's value opportunities.
                  </p>
                </CardBody>
              </Card>
            )}

            {loading && (
              <Card className="border border-gray-200 dark:border-gray-700 h-full min-h-[400px]">
                <CardBody className="flex flex-col items-center justify-center text-center p-8">
                  <div className="mb-4">
                    <Progress
                      size="sm"
                      isIndeterminate
                      aria-label="Building slate..."
                      className="max-w-md"
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--text-dark)] mb-2">Building your slate...</h3>
                  <p className="text-gray-500">
                    Analyzing value bets and optimizing positions
                  </p>
                </CardBody>
              </Card>
            )}

            {result && !loading && (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardBody className="p-3 text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Positions</p>
                      <p className="text-2xl font-bold text-[var(--text-dark)]">{result.positions.length}</p>
                    </CardBody>
                  </Card>
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardBody className="p-3 text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Total Stake</p>
                      <p className="text-2xl font-bold text-[var(--text-dark)]">${totalStake.toFixed(0)}</p>
                    </CardBody>
                  </Card>
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardBody className="p-3 text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Est. Return</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {result.metrics?.expectedReturn != null ? `$${result.metrics.expectedReturn.toFixed(0)}` : "—"}
                      </p>
                    </CardBody>
                  </Card>
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardBody className="p-3 text-center">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Solve Time</p>
                      <p className="text-2xl font-bold text-[var(--text-dark)]">
                        {result.solveTimeMs != null ? `${result.solveTimeMs.toFixed(0)}ms` : "—"}
                      </p>
                    </CardBody>
                  </Card>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-2">
                  <Chip size="sm" variant="flat" color="default">
                    Solver: {result.solver}
                  </Chip>
                  {result.candidateCounts && (
                    <>
                      <Chip size="sm" variant="flat" color="primary">
                        {result.candidateCounts.sports} {sportConfig.displayName} bets
                      </Chip>
                      {result.candidateCounts.kalshi > 0 && (
                        <Chip size="sm" variant="flat" color="secondary">
                          {result.candidateCounts.kalshi} Kalshi
                        </Chip>
                      )}
                      {result.candidateCounts.polymarket > 0 && (
                        <Chip size="sm" variant="flat" color="secondary">
                          {result.candidateCounts.polymarket} Polymarket
                        </Chip>
                      )}
                      {result.candidateCounts.playerProps && result.candidateCounts.playerProps > 0 && (
                        <Chip size="sm" variant="flat" color="secondary">
                          {result.candidateCounts.playerProps} Player Props
                        </Chip>
                      )}
                    </>
                  )}
                </div>

                {/* Positions List */}
                <Card className="border border-gray-200 dark:border-gray-700">
                  <CardBody className="p-0">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-[var(--text-dark)]">Selected Positions</h3>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="flat" 
                          onPress={copySlateToClipboard}
                          startContent={copyDone ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                        >
                          {copyDone ? "Copied!" : "Copy"}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="flat" 
                          onPress={downloadSlateCsv}
                          startContent={<ArrowDownTrayIcon className="h-4 w-4" />}
                        >
                          CSV
                        </Button>
                      </div>
                    </div>

                    {result.positions.length === 0 ? (
                      <div className="p-8 text-center">
                        <XMarkIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">
                          No positions selected. Try lowering the minimum edge or increasing max positions.
                        </p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {result.positions.map((p, idx) => (
                          <li key={p.candidateId} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <span className="text-sm text-gray-400 font-medium w-6">{idx + 1}.</span>
                                <div>
                                  <p className="font-medium text-[var(--text-dark)]">
                                    {p.label ?? p.candidateId}
                                  </p>
                                  {p.reason && (
                                    <p className="text-xs text-gray-500 mt-1">{p.reason}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-lg font-bold text-emerald-600">${p.stakeUsd.toFixed(0)}</p>
                                {bankroll && (
                                  <p className="text-xs text-gray-500">
                                    {((p.stakeUsd / bankroll.bankrollUsd) * 100).toFixed(1)}% of bankroll
                                  </p>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardBody>
                </Card>

                {/* Excluded Bets */}
                {result.excludedWithLabels && result.excludedWithLabels.length > 0 && (
                  <Card className="border border-gray-200 dark:border-gray-700">
                    <CardBody className="p-4">
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 list-none flex items-center gap-2">
                          <span className="group-open:rotate-90 transition-transform">▶</span>
                          Why we skipped {result.excludedWithLabels.length} bet(s)
                        </summary>
                        <ul className="mt-3 space-y-2 text-sm">
                          {result.excludedWithLabels.map((ex) => (
                            <li key={ex.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                              <XMarkIcon className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-[var(--text-dark)]">{ex.label ?? ex.id}</span>
                                <span className="text-gray-500"> — {ex.reason}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </CardBody>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
