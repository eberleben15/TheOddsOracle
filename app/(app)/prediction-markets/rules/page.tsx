"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ABERule, RuleTriggerType } from "@/types/abe";

export default function RulesPage() {
  const [rules, setRules] = useState<ABERule[]>([]);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState<{ fired: number; notificationsCreated: number } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    triggerType: "concentration_above" as RuleTriggerType,
    value: "0.5",
    contractId: "",
    factorId: "republican_performance",
    message: "Rule triggered.",
  });

  const fetchRules = () => {
    fetch("/api/rules")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { rules?: ABERule[] } | null) => setRules(data?.rules ?? []))
      .catch(() => setRules([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const runNow = () => {
    setRunLoading(true);
    setRunResult(null);
    fetch("/api/rules/run", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { fired?: number; notificationsCreated?: number } | null) => {
        if (data) setRunResult({ fired: data.fired ?? 0, notificationsCreated: data.notificationsCreated ?? 0 });
        fetchRules();
      })
      .catch(() => {})
      .finally(() => setRunLoading(false));
  };

  const createRule = () => {
    let triggerConfig: unknown = {};
    if (form.triggerType === "price_above" || form.triggerType === "price_below") {
      triggerConfig = { contractId: form.contractId.trim() || "kalshi:EXAMPLE:yes", value: Number(form.value) || 0.5 };
    } else if (form.triggerType === "portfolio_exposure_above") {
      triggerConfig = { factorId: form.factorId.trim() || "other", value: Number(form.value) || 0.5 };
    } else if (form.triggerType === "concentration_above") {
      triggerConfig = { value: Number(form.value) || 0.5 };
    }
    fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim() || "New rule",
        triggerType: form.triggerType,
        triggerConfig,
        actions: [{ type: "notify", message: form.message.trim() || "Rule triggered." }],
        enabled: true,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((rule: ABERule | null) => {
        if (rule) {
          setRules((prev) => [rule, ...prev]);
          setShowForm(false);
          setForm({ name: "", triggerType: "concentration_above", value: "0.5", contractId: "", factorId: "republican_performance", message: "Rule triggered." });
        }
      })
      .catch(() => {});
  };

  const deleteRule = (id: string) => {
    if (!confirm("Delete this rule?")) return;
    fetch(`/api/rules/${id}`, { method: "DELETE" })
      .then((r) => (r.ok ? fetchRules() : null))
      .catch(() => {});
  };

  const triggerLabel = (t: RuleTriggerType): string => {
    const labels: Record<RuleTriggerType, string> = {
      price_above: "Price above",
      price_below: "Price below",
      portfolio_exposure_above: "Factor exposure above",
      concentration_above: "Concentration above",
      manual: "Manual",
    };
    return labels[t] ?? t;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/prediction-markets" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Prediction markets
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-dark)]">Rules</h1>
        <p className="text-[var(--text-body)] mt-1">
          When a condition is met (e.g. portfolio concentration or price threshold), get notified. Run rules on demand or via cron.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          type="button"
          onClick={runNow}
          disabled={runLoading}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {runLoading ? "Running…" : "Run rules now"}
        </button>
        <Link
          href="/prediction-markets/notifications"
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-[var(--text-dark)]"
        >
          Notifications
        </Link>
        <button
          type="button"
          onClick={() => setShowForm((b) => !b)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-[var(--text-dark)]"
        >
          {showForm ? "Cancel" : "Add rule"}
        </button>
      </div>
      {runResult && (
        <p className="text-sm text-[var(--text-body)] mb-4">
          Last run: {runResult.fired} rule(s) fired, {runResult.notificationsCreated} notification(s) created.
        </p>
      )}

      {showForm && (
        <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mb-6">
          <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">New rule</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs text-gray-500">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. High concentration alert"
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Trigger</span>
              <select
                value={form.triggerType}
                onChange={(e) => setForm((p) => ({ ...p, triggerType: e.target.value as RuleTriggerType }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="concentration_above">Concentration above %</option>
                <option value="portfolio_exposure_above">Factor exposure above %</option>
                <option value="price_above">Contract price above</option>
                <option value="price_below">Contract price below</option>
                <option value="manual">Manual only</option>
              </select>
            </label>
            {(form.triggerType === "concentration_above" || form.triggerType === "portfolio_exposure_above") && (
              <label className="block">
                <span className="text-xs text-gray-500">Threshold (0–1, e.g. 0.5 = 50%)</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.value}
                  onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
            )}
            {form.triggerType === "portfolio_exposure_above" && (
              <label className="block">
                <span className="text-xs text-gray-500">Factor ID</span>
                <input
                  type="text"
                  value={form.factorId}
                  onChange={(e) => setForm((p) => ({ ...p, factorId: e.target.value }))}
                  placeholder="e.g. republican_performance"
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </label>
            )}
            {(form.triggerType === "price_above" || form.triggerType === "price_below") && (
              <>
                <label className="block">
                  <span className="text-xs text-gray-500">Contract ID</span>
                  <input
                    type="text"
                    value={form.contractId}
                    onChange={(e) => setForm((p) => ({ ...p, contractId: e.target.value }))}
                    placeholder="e.g. kalshi:TICKER:yes"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Price (0–1)</span>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={form.value}
                    onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </label>
              </>
            )}
            <label className="block">
              <span className="text-xs text-gray-500">Notify message</span>
              <input
                type="text"
                value={form.message}
                onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </label>
            <button
              type="button"
              onClick={createRule}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium"
            >
              Create rule
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
        <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">Your rules</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : rules.length === 0 ? (
          <p className="text-sm text-gray-500">No rules yet. Add one to get started.</p>
        ) : (
          <ul className="space-y-2">
            {rules.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-dark)]">{r.name}</p>
                  <p className="text-xs text-gray-500">
                    {triggerLabel(r.triggerType as RuleTriggerType)}
                    {("value" in r.triggerConfig && typeof r.triggerConfig.value === "number") && ` ${(r.triggerConfig.value * 100).toFixed(0)}%`}
                    {r.enabled ? " · Enabled" : " · Disabled"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteRule(r.id)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
