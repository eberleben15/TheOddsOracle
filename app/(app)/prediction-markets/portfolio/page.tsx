"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { kalshiTickerToABEContractId } from "@/lib/abe";
import type { ABEPosition, PortfolioRiskReport } from "@/types/abe";
import type { KalshiSettlement } from "@/types/kalshi";

type KalshiStatus = {
  signedIn: boolean;
  connected: boolean;
  apiKeyIdMasked?: string;
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
  const [settlements, setSettlements] = useState<KalshiSettlement[]>([]);
  const [connectLoading, setConnectLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [connectForm, setConnectForm] = useState({ apiKeyId: "", privateKeyPem: "" });

  useEffect(() => {
    fetch("/api/kalshi/status")
      .then((r) => r.json())
      .then((data: KalshiStatus) => setKalshiStatus(data))
      .catch(() => setKalshiStatus({ signedIn: false, connected: false }));
  }, []);

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
      const res = await fetch("/api/abe/portfolio-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions }),
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

  const connectKalshi = async () => {
    setConnectLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/kalshi/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connect failed");
      setConnectForm({ apiKeyId: "", privateKeyPem: "" });
      const statusRes = await fetch("/api/kalshi/status");
      const statusData = await statusRes.json();
      setKalshiStatus(statusData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setConnectLoading(false);
    }
  };

  const disconnectKalshi = async () => {
    setConnectLoading(true);
    setError(null);
    try {
      await fetch("/api/kalshi/connect", { method: "DELETE" });
      setKalshiStatus((prev) => (prev ? { ...prev, connected: false, apiKeyIdMasked: undefined } : null));
      setPositions([]);
      setSettlements([]);
      setReport(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Disconnect failed");
    } finally {
      setConnectLoading(false);
    }
  };

  const syncFromKalshi = async () => {
    setSyncLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/kalshi/positions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setPositions(data.positions ?? []);
      setSettlements(data.settlements ?? []);
      setKalshiStatus((prev) => prev ? { ...prev, connected: true } : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncLoading(false);
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
          Add Kalshi positions to see factor exposure, concentration risk, and
          overexposure warnings. Connect your Kalshi account to sync positions automatically.
        </p>
      </div>

      {/* Connect Kalshi */}
      {kalshiStatus && (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
            Kalshi connection
          </h2>
          {!kalshiStatus.signedIn ? (
            <p className="text-sm text-gray-500">
              Sign in to connect your Kalshi API keys and sync positions automatically.
            </p>
          ) : kalshiStatus.connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[var(--text-body)]">
                Connected {kalshiStatus.apiKeyIdMasked && `(${kalshiStatus.apiKeyIdMasked})`}
              </span>
              <button
                type="button"
                onClick={syncFromKalshi}
                disabled={syncLoading}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {syncLoading ? "Syncing…" : "Sync from Kalshi"}
              </button>
              <button
                type="button"
                onClick={disconnectKalshi}
                disabled={connectLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Add your API Key ID and private key from Kalshi → Account &amp; security → API Keys. Your key is stored encrypted and never shared.
              </p>
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">API Key ID</label>
                  <input
                    type="text"
                    value={connectForm.apiKeyId}
                    onChange={(e) => setConnectForm((p) => ({ ...p, apiKeyId: e.target.value }))}
                    placeholder="e.g. a952bcbe-ec3b-4b5b-b8f9-11dae589608c"
                    className="w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs text-gray-500 mb-1">Private key (PEM)</label>
                  <textarea
                    value={connectForm.privateKeyPem}
                    onChange={(e) => setConnectForm((p) => ({ ...p, privateKeyPem: e.target.value }))}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={connectKalshi}
                disabled={connectLoading || !connectForm.apiKeyId.trim() || !connectForm.privateKeyPem.trim()}
                className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                {connectLoading ? "Connecting…" : "Connect Kalshi"}
              </button>
            </div>
          )}
        </div>
      )}

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
            No positions yet. Sync from Kalshi above or add one manually (use real Kalshi tickers for live factor data).
          </p>
        ) : (
          <ul className="space-y-2">
            {positions.map((p, i) => (
              <li
                key={`${p.contractId}-${i}`}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <span className="text-sm font-mono">
                  {p.contractId.replace("kalshi:", "")} · {p.size} @ {(p.costPerShare * 100).toFixed(0)}¢
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
            </p>
          </div>

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
                    {c.contractIdA.replace("kalshi:", "")} ↔ {c.contractIdB.replace("kalshi:", "")}:{" "}
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
    </div>
  );
}
