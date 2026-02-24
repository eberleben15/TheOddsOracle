"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BankrollSummary, RiskProfile } from "@/types/abe";

type BankrollResponse = BankrollSummary & {
  decisionEngine?: {
    maxPositions?: number;
    maxFractionPerPosition?: number;
    maxFactorFraction?: number;
  };
};

const RISK_PROFILES: { value: RiskProfile; label: string }[] = [
  { value: "conservative", label: "Conservative (0.25 Kelly)" },
  { value: "moderate", label: "Moderate (0.5 Kelly)" },
  { value: "aggressive", label: "Aggressive (0.75 Kelly)" },
];

export function BankrollSection() {
  const [summary, setSummary] = useState<BankrollSummary | null>(null);
  const [form, setForm] = useState({
    bankrollUsd: "",
    kellyFraction: "0.25",
    riskProfile: "" as RiskProfile | "",
    maxPositions: "",
    maxFractionPerPosition: "",
    maxFactorFraction: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bankroll")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BankrollResponse | null) => {
        if (data) setSummary(data);
        if (data?.decisionEngine) {
          const de = data.decisionEngine;
          setForm((p) => ({
            ...p,
            maxPositions: de.maxPositions != null ? String(de.maxPositions) : "",
            maxFractionPerPosition: de.maxFractionPerPosition != null ? String(de.maxFractionPerPosition) : "",
            maxFactorFraction: de.maxFactorFraction != null ? String(de.maxFactorFraction) : "",
          }));
        }
      })
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    if (summary && form.bankrollUsd === "" && (summary.bankrollUsd > 0 || summary.kellyFraction !== 0.25 || summary.riskProfile)) {
      setForm((p) => ({
        ...p,
        bankrollUsd: String(summary.bankrollUsd),
        kellyFraction: String(summary.kellyFraction),
        riskProfile: summary.riskProfile ?? "",
      }));
    }
  }, [summary?.bankrollUsd, summary?.kellyFraction, summary?.riskProfile]);

  const save = async () => {
    const usd = Number(form.bankrollUsd);
    const kelly = Number(form.kellyFraction);
    if (Number.isNaN(usd) || usd < 0) return;
    if (Number.isNaN(kelly) || kelly <= 0 || kelly > 1) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        bankrollUsd: usd,
        kellyFraction: kelly,
        riskProfile: form.riskProfile || null,
      };
      if (form.maxPositions.trim() !== "") {
        const v = Number(form.maxPositions);
        if (!Number.isNaN(v) && v >= 1 && v <= 100) payload.maxPositions = v;
      } else payload.maxPositions = null;
      if (form.maxFractionPerPosition.trim() !== "") {
        const v = Number(form.maxFractionPerPosition);
        if (!Number.isNaN(v) && v > 0 && v <= 1) payload.maxFractionPerPosition = v;
      } else payload.maxFractionPerPosition = null;
      if (form.maxFactorFraction.trim() !== "") {
        const v = Number(form.maxFactorFraction);
        if (!Number.isNaN(v) && v > 0 && v <= 1) payload.maxFactorFraction = v;
      } else payload.maxFactorFraction = null;

      const res = await fetch("/api/bankroll", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      const summaryRes = await fetch("/api/bankroll");
      const next = await summaryRes.json();
      setSummary(next);
      if (next.decisionEngine) {
        const de = next.decisionEngine;
        setForm((p) => ({
          ...p,
          maxPositions: de.maxPositions != null ? String(de.maxPositions) : "",
          maxFractionPerPosition: de.maxFractionPerPosition != null ? String(de.maxFractionPerPosition) : "",
          maxFactorFraction: de.maxFactorFraction != null ? String(de.maxFactorFraction) : "",
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-dark)] mb-1">Bankroll & risk</h2>
        <p className="text-sm text-[var(--text-body)]">
          Set your risk capital and Kelly fraction. Used for recommended position sizing and risk metrics on the dashboard and Portfolio Risk page.
        </p>
      </div>

      {summary && (
        <div className="p-3 rounded-lg bg-gray-50 text-sm text-[var(--text-body)] space-y-1">
          <p>Current: <strong>${summary.bankrollUsd.toFixed(0)}</strong> risk capital · {summary.riskMessage}</p>
          {summary.pDrawdown30In45Days != null && (
            <p>P(30% drawdown in 45 days): <strong>{(summary.pDrawdown30In45Days * 100).toFixed(0)}%</strong></p>
          )}
          {summary.riskOfRuin != null && summary.riskOfRuin > 0 && (
            <p>Risk-of-ruin (heuristic): <strong>{(summary.riskOfRuin * 100).toFixed(0)}%</strong></p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bankroll (USD)</label>
            <input
              type="number"
              min={0}
              step={100}
              value={form.bankrollUsd}
              onChange={(e) => setForm((p) => ({ ...p, bankrollUsd: e.target.value }))}
              placeholder="e.g. 1000"
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Risk profile</label>
            <select
              value={form.riskProfile}
              onChange={(e) => {
                const v = (e.target.value || "") as RiskProfile | "";
                const kelly = v ? { conservative: "0.25", moderate: "0.5", aggressive: "0.75" }[v] : form.kellyFraction;
                setForm((p) => ({ ...p, riskProfile: v, kellyFraction: kelly }));
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[180px]"
            >
              <option value="">Custom (set Kelly below)</option>
              {RISK_PROFILES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kelly fraction (0–1)</label>
            <input
              type="number"
              min={0.01}
              max={1}
              step={0.05}
              value={form.kellyFraction}
              onChange={(e) => setForm((p) => ({ ...p, kellyFraction: e.target.value }))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mt-4">
        <h3 className="text-sm font-semibold text-[var(--text-dark)] mb-2">Decision engine (Build my slate)</h3>
        <p className="text-xs text-gray-500 mb-3">
          Default limits for &quot;Build my slate&quot; on the dashboard. Leave blank to use app defaults (12 positions, 2% per position, 40% per factor).
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max positions per slate (1–100)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.maxPositions}
              onChange={(e) => setForm((p) => ({ ...p, maxPositions: e.target.value }))}
              placeholder="12"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max % per position (0–1, e.g. 0.02 = 2%)</label>
            <input
              type="number"
              min={0.01}
              max={1}
              step={0.01}
              value={form.maxFractionPerPosition}
              onChange={(e) => setForm((p) => ({ ...p, maxFractionPerPosition: e.target.value }))}
              placeholder="0.02"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Max % in one factor (0–1, e.g. 0.4 = 40%)</label>
            <input
              type="number"
              min={0.1}
              max={1}
              step={0.05}
              value={form.maxFactorFraction}
              onChange={(e) => setForm((p) => ({ ...p, maxFactorFraction: e.target.value }))}
              placeholder="0.4"
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--text-body)] mt-4">
        View risk and positions on the <Link href="/prediction-markets/portfolio" className="text-primary underline">Portfolio Risk</Link> page.
      </p>
    </div>
  );
}
