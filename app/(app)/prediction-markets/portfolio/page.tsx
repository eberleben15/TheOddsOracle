"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { kalshiTickerToABEContractId } from "@/lib/abe";
import type { ABEPosition, ABEContract, PortfolioRiskReport, BankrollSummary } from "@/types/abe";
import type { KalshiSettlement } from "@/types/kalshi";

type KalshiStatus = {
  signedIn: boolean;
  connected: boolean;
  apiKeyIdMasked?: string;
};

type PolymarketStatus = {
  signedIn: boolean;
  connected: boolean;
  walletAddressMasked?: string;
};

export default function PortfolioPage() {
  const [positions, setPositions] = useState<ABEPosition[]>([]);
  const [ticker, setTicker] = useState("");
  const [side, setSide] = useState<"yes" | "no">("yes");
  const [size, setSize] = useState("");
  const [costPerShare, setCostPerShare] = useState("");
  const [report, setReport] = useState<PortfolioRiskReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kalshiStatus, setKalshiStatus] = useState<KalshiStatus | null>(null);
  const [polymarketStatus, setPolymarketStatus] = useState<PolymarketStatus | null>(null);
  const [settlements, setSettlements] = useState<KalshiSettlement[]>([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [useDemoPortfolio, setUseDemoPortfolio] = useState(false);
  const [demoContracts, setDemoContracts] = useState<ABEContract[]>([]);
  const [bankrollSummary, setBankrollSummary] = useState<BankrollSummary | null>(null);

  useEffect(() => {
    fetch("/api/kalshi/status")
      .then((r) => r.json())
      .then((data: KalshiStatus) => setKalshiStatus(data))
      .catch(() => setKalshiStatus({ signedIn: false, connected: false }));
    fetch("/api/polymarket/status")
      .then((r) => r.json())
      .then((data: PolymarketStatus) => setPolymarketStatus(data))
      .catch(() => setPolymarketStatus({ signedIn: false, connected: false }));
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { admin?: boolean } | null) => setIsAdmin(!!data?.admin))
      .catch(() => setIsAdmin(false));
  }, []);

  const fetchBankroll = useCallback((demo?: boolean) => {
    const url = demo ? "/api/bankroll?demo=1" : "/api/bankroll";
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BankrollSummary | null) => setBankrollSummary(data))
      .catch(() => setBankrollSummary(null));
  }, []);

  useEffect(() => {
    fetchBankroll(useDemoPortfolio && isAdmin);
  }, [useDemoPortfolio, isAdmin, fetchBankroll]);

  const addPosition = () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    const s = Number(size);
    const c = Number(costPerShare);
    if (Number.isNaN(s) || s <= 0 || Number.isNaN(c) || c < 0 || c > 1) return;
    const contractId = kalshiTickerToABEContractId(t, side);
    setPositions((prev) => [...prev, { contractId, side, size: s, costPerShare: c }]);
    setTicker("");
    setSize("");
    setCostPerShare("");
  };

  const removePosition = (index: number) => {
    setPositions((prev) => prev.filter((_, i) => i !== index));
    setReport(null);
  };

  const analyze = async () => {
    if (positions.length === 0) {
      setError("Add at least one position.");
      return;
    }
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const body: { positions: ABEPosition[]; contracts?: ABEContract[] } = { positions };
      if (useDemoPortfolio && demoContracts.length > 0) body.contracts = demoContracts;
      const res = await fetch("/api/abe/portfolio-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setReport(data as PortfolioRiskReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const syncPositions = async () => {
    setSyncLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/positions");
      const data = await res.json();
      const nextPositions = data.positions ?? [];
      setPositions(nextPositions);
      setSettlements([]);
      setKalshiStatus((prev) => prev ? { ...prev, connected: !!(data.kalshiConnected) } : null);
      setPolymarketStatus((prev) => prev ? { ...prev, connected: !!(data.polymarketConnected) } : null);
      if (nextPositions.length > 0) {
        fetch("/api/positions/snapshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions: nextPositions }),
        }).catch(() => {});
      }
      if (data.positions?.length && data.kalshiConnected) {
        const kalshiRes = await fetch("/api/kalshi/positions");
        const kalshiData = await kalshiRes.json();
        if (kalshiRes.ok && kalshiData.settlements) setSettlements(kalshiData.settlements ?? []);
      }
    } catch {
      setPositions([]);
    } finally {
      setSyncLoading(false);
    }
  };

  const loadSavedSnapshot = async () => {
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/positions/snapshot");
      const data = await res.json();
      setPositions(data.positions ?? []);
      if (data.contracts?.length) setDemoContracts(data.contracts);
    } catch {
      setPositions([]);
    }
  };

  const loadDemoPortfolio = async () => {
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/demo-portfolio");
      if (!res.ok) throw new Error("Demo portfolio is admin-only");
      const data = await res.json();
      setPositions(data.positions ?? []);
      setDemoContracts(data.contracts ?? []);
      setUseDemoPortfolio(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load demo");
    }
  };

  const loadRealPositions = async () => {
    setError(null);
    setReport(null);
    setUseDemoPortfolio(false);
    setDemoContracts([]);
    try {
      const res = await fetch("/api/positions");
      const data = await res.json();
      setPositions(data.positions ?? []);
    } catch {
      setPositions([]);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/prediction-markets"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Prediction Markets
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-dark)]">
          Portfolio Risk
        </h1>
        <p className="text-[var(--text-body)] mt-1">
          View positions, factor exposure, and concentration risk. Connect Kalshi and Polymarket in <Link href="/settings" className="text-primary underline">Settings</Link> to sync positions.
        </p>
      </div>

      <>
      {/* Admin: demo portfolio toggle */}
      {isAdmin && (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-2">
            Demo portfolio (admin)
          </h2>
          {useDemoPortfolio ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-emerald-600 font-medium">Showing demo portfolio</span>
              <button
                type="button"
                onClick={loadRealPositions}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                Load my real positions
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--text-body)] mb-2">
                Load a dummy portfolio to test risk and bankroll views without real data.
              </p>
              <button
                type="button"
                onClick={loadDemoPortfolio}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700"
              >
                Use demo portfolio
              </button>
            </>
          )}
        </div>
      )}

      {/* Bankroll summary (edit in Settings) */}
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-[var(--text-dark)]">
            Bankroll {bankrollSummary?.isDemo && <span className="text-amber-600 text-xs">(demo)</span>}
          </h2>
          <Link href="/settings" className="text-xs text-primary hover:underline font-medium">
            Edit in Settings
          </Link>
        </div>
        {bankrollSummary ? (
          <div className="p-3 rounded-lg bg-gray-50 text-sm text-[var(--text-body)] space-y-1">
            <p>Risk capital: <strong>${bankrollSummary.bankrollUsd.toFixed(0)}</strong></p>
            <p className="mt-1">{bankrollSummary.riskMessage}</p>
            {bankrollSummary.pDrawdown30In45Days != null && (
              <p>P(30% drawdown in 45 days): <strong>{(bankrollSummary.pDrawdown30In45Days * 100).toFixed(0)}%</strong></p>
            )}
            {bankrollSummary.riskOfRuin != null && bankrollSummary.riskOfRuin > 0 && (
              <p>Risk-of-ruin (heuristic): <strong>{(bankrollSummary.riskOfRuin * 100).toFixed(0)}%</strong></p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Set risk capital and Kelly fraction in <Link href="/settings" className="text-primary underline">Settings</Link> to see sizing and risk metrics.</p>
        )}
      </div>

      {/* Sync + connection hint */}
      {kalshiStatus && polymarketStatus && !kalshiStatus.connected && !polymarketStatus.connected && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900">
          Connect Kalshi or Polymarket in <Link href="/settings" className="font-medium underline">Settings</Link> to sync positions, or add positions manually below.
        </div>
      )}
      <div className="mb-6 flex flex-wrap gap-3">
        {(kalshiStatus?.connected || polymarketStatus?.connected) && (
          <button
            type="button"
            onClick={syncPositions}
            disabled={syncLoading}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {syncLoading ? "Syncing…" : "Sync positions"}
          </button>
        )}
        <button
          type="button"
          onClick={loadSavedSnapshot}
          className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
        >
          Load saved snapshot
        </button>
      </div>

      {/* Add position form */}
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
          Add position
        </h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g. KXBTC-24"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Side</label>
            <select
              value={side}
              onChange={(e) => setSide(e.target.value as "yes" | "no")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Size (#)</label>
            <input
              type="number"
              min={1}
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="100"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Cost/share (0–1)
            </label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={costPerShare}
              onChange={(e) => setCostPerShare(e.target.value)}
              placeholder="0.65"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            type="button"
            onClick={addPosition}
            className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700"
          >
            Add
          </button>
        </div>
      </div>

      {/* Positions list */}
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
          Positions ({positions.length})
        </h2>
        {positions.length === 0 ? (
          <p className="text-sm text-gray-500">
            No positions yet. Connect accounts in <Link href="/settings" className="text-primary underline">Settings</Link> and sync, or add one manually (use real Kalshi tickers for live factor data).
          </p>
        ) : (
          <ul className="space-y-2">
            {positions.map((p, i) => (
              <li
                key={`${p.contractId}-${i}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm font-mono">
                  {p.contractId.startsWith("polymarket:")
                    ? p.contractId.replace("polymarket:", "").replace(/:yes|:no$/, "")
                    : p.contractId.replace("kalshi:", "")}{" "}
                  · {p.side} · {p.size} @ {(p.costPerShare * 100).toFixed(0)}¢
                </span>
                <button
                  type="button"
                  onClick={() => removePosition(i)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {positions.length > 0 && (
          <button
            type="button"
            onClick={analyze}
            disabled={loading}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze portfolio"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
            <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
              Summary
            </h2>
            <p className="text-sm text-[var(--text-body)]">
              Total notional: <strong>${report.totalNotional.toFixed(2)}</strong>
              {" · "}
              Concentration risk:{" "}
              <strong>{(report.concentrationRisk * 100).toFixed(0)}%</strong>
              {report.avgLockupDays != null && (
                <> · Avg lockup: <strong>{report.avgLockupDays} days</strong></>
              )}
            </p>
          </div>

          {report.varianceCurve && (
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
              <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
                Variance curve
              </h2>
              <p className="text-xs text-[var(--text-body)] mb-3">
                Correlation-aware portfolio P&L volatility. 1σ = one standard deviation; 90% range ≈ 5th to 95th percentile under normal approximation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-gray-50">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">1σ volatility</p>
                  <p className="text-lg font-semibold text-[var(--text-dark)] tabular-nums">
                    ±${report.varianceCurve.volatilityUsd.toFixed(0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-50">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">5th % (downside)</p>
                  <p className="text-lg font-semibold text-red-700 tabular-nums">
                    ${report.varianceCurve.p5PnlUsd.toFixed(0)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">95th % (upside)</p>
                  <p className="text-lg font-semibold text-emerald-700 tabular-nums">
                    +${report.varianceCurve.p95PnlUsd.toFixed(0)}
                  </p>
                </div>
              </div>
              <div className="relative h-8 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="absolute inset-y-0 bg-red-200 rounded-l-full"
                  style={{
                    left: "0%",
                    width: "50%",
                  }}
                />
                <div
                  className="absolute inset-y-0 left-1/2 -translate-x-px w-0.5 bg-[var(--text-dark)]"
                  style={{ zIndex: 1 }}
                  title="Expected (0)"
                />
                <div
                  className="absolute inset-y-0 bg-emerald-200 rounded-r-full"
                  style={{
                    left: "50%",
                    width: "50%",
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-600 left-2"
                  style={{ zIndex: 2 }}
                >
                  {report.varianceCurve.p5PnlUsd.toFixed(0)}
                </div>
                <div
                  className="absolute top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-500 right-2"
                  style={{ zIndex: 2 }}
                >
                  +{report.varianceCurve.p95PnlUsd.toFixed(0)}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                90% P&L range: ${report.varianceCurve.p5PnlUsd.toFixed(0)} to +${report.varianceCurve.p95PnlUsd.toFixed(0)}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
            <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
              Factor exposure
            </h2>
            <div className="space-y-2">
              {report.factorExposures.map((e) => (
                <div key={e.factorId} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-0.5">
                      <span className="font-medium text-[var(--text-dark)]">
                        {e.factorName}
                      </span>
                      <span className="text-gray-500 tabular-nums">
                        ${e.notional.toFixed(0)} ({(e.fraction * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${e.fraction * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {report.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-sm font-semibold text-amber-800 mb-2">
                Warnings
              </h2>
              <ul className="list-disc list-inside text-sm text-amber-900 space-y-1">
                {report.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {report.correlations.length > 0 && (
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
              <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
                Correlations (top pairs)
              </h2>
              <ul className="text-xs text-[var(--text-body)] space-y-1 font-mono">
                {report.correlations.slice(0, 10).map((c, i) => (
                  <li key={i}>
                    {c.contractIdA.replace(/^(kalshi|polymarket):/, "").replace(/:yes|:no$/, "")} ↔ {c.contractIdB.replace(/^(kalshi|polymarket):/, "").replace(/:yes|:no$/, "")}:{" "}
                    {(c.correlation * 100).toFixed(0)}%
                    {c.reason ? ` (${c.reason})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Past settlements (from Kalshi sync) */}
      {settlements.length > 0 && (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mt-6">
          <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
            Past settlements ({settlements.length})
          </h2>
          <ul className="text-xs text-[var(--text-body)] space-y-1 font-mono max-h-48 overflow-y-auto">
            {settlements.slice(0, 50).map((s, i) => (
              <li key={i}>
                {s.ticker} · {s.market_result ?? "—"} · {s.settled_time ? new Date(s.settled_time).toLocaleDateString() : ""}
                {s.revenue != null ? ` · $${(s.revenue / 100).toFixed(2)}` : ""}
              </li>
            ))}
          </ul>
          {settlements.length > 50 && (
            <p className="text-xs text-gray-500 mt-2">Showing first 50 of {settlements.length}</p>
          )}
        </div>
      )}
      </>
    </div>
  );
}
