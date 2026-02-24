"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { ABEPosition, ABEContract, PortfolioRiskReport, BankrollSummary } from "@/types/abe";

type ConnectionStatus = {
  kalshi: boolean;
  polymarket: boolean;
};

export function DashboardPortfolioSection() {
  const [positions, setPositions] = useState<ABEPosition[]>([]);
  const [report, setReport] = useState<PortfolioRiskReport | null>(null);
  const [bankroll, setBankroll] = useState<BankrollSummary | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({ kalshi: false, polymarket: false });
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [positionsRes, snapshotRes, bankrollRes, kalshiRes, polymarketRes] = await Promise.all([
        fetch("/api/positions"),
        fetch("/api/positions/snapshot"),
        fetch("/api/bankroll"),
        fetch("/api/kalshi/status"),
        fetch("/api/polymarket/status"),
      ]);

      const positionsData = await positionsRes.json();
      const snapshotData = snapshotRes.ok ? await snapshotRes.json() : {};
      const bankrollData = bankrollRes.ok ? await bankrollRes.json() : null;
      const kalshiData = await kalshiRes.json();
      const polymarketData = await polymarketRes.json();

      const nextPositions = positionsData.positions ?? [];
      setPositions(nextPositions);
      setBankroll(bankrollData);
      setStatus({
        kalshi: !!kalshiData?.connected,
        polymarket: !!polymarketData?.connected,
      });

      if (nextPositions.length > 0) {
        setAnalyzing(true);
        try {
          const body: { positions: ABEPosition[]; contracts?: ABEContract[] } = { positions: nextPositions };
          if (Array.isArray(snapshotData.contracts) && snapshotData.contracts.length > 0) {
            body.contracts = snapshotData.contracts;
          }
          const res = await fetch("/api/abe/portfolio-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (res.ok) setReport(data as PortfolioRiskReport);
        } catch {
          setReport(null);
        } finally {
          setAnalyzing(false);
        }
      } else {
        setReport(null);
      }
    } catch {
      setPositions([]);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalNotional = positions.reduce((sum, p) => sum + p.size * p.costPerShare, 0);
  const connectionLabel = [status.kalshi && "Kalshi", status.polymarket && "Polymarket"].filter(Boolean).join(" · ") || "Not connected";

  if (loading) {
    return (
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-dark)]">Portfolio</h2>
        </div>
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden">
          <div className="p-4 sm:p-5 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-3 w-20 bg-[var(--gray-200)] rounded mb-2" />
                  <div className="h-7 w-16 bg-[var(--gray-200)] rounded" />
                </div>
              ))}
            </div>
            <div className="h-4 w-48 bg-[var(--gray-200)] rounded" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-dark)]">
          Portfolio
        </h2>
        <Link
          href="/prediction-markets/portfolio"
          className="text-sm font-medium text-primary hover:underline"
        >
          Portfolio Risk →
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-[var(--text-body)] uppercase tracking-wider">Positions</p>
              <p className="text-xl font-semibold text-[var(--text-dark)] tabular-nums">
                {positions.length}
              </p>
              <p className="text-xs text-[var(--text-body)] mt-0.5">{connectionLabel}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-body)] uppercase tracking-wider">Notional</p>
              <p className="text-xl font-semibold text-[var(--text-dark)] tabular-nums">
                ${totalNotional.toFixed(0)}
              </p>
            </div>
            {report && (
              <>
                <div>
                  <p className="text-xs text-[var(--text-body)] uppercase tracking-wider">Concentration</p>
                  <p className="text-xl font-semibold text-[var(--text-dark)] tabular-nums">
                    {(report.concentrationRisk * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-body)] uppercase tracking-wider">Volatility (1σ)</p>
                  <p className="text-xl font-semibold text-[var(--text-dark)] tabular-nums">
                    {report.varianceCurve ? `±$${report.varianceCurve.volatilityUsd.toFixed(0)}` : "—"}
                  </p>
                </div>
              </>
            )}
          </div>

          {positions.length === 0 && (
            <p className="text-sm text-[var(--text-body)] mb-4">
              Connect Kalshi or Polymarket in Settings and sync in Portfolio Risk.
            </p>
          )}

          {positions.length > 0 && analyzing && (
            <p className="text-sm text-[var(--text-body)] mb-4">Analyzing…</p>
          )}

          {report && positions.length > 0 && !analyzing && (
            <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
              {report.factorExposures.length > 0 && (
                <div>
                  <p className="text-xs text-[var(--text-body)] uppercase tracking-wider mb-2">Factor exposure (top 5)</p>
                  <div className="space-y-2">
                    {report.factorExposures.slice(0, 5).map((e) => (
                      <div key={e.factorId} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-0.5">
                            <span className="font-medium text-[var(--text-dark)]">{e.factorName}</span>
                            <span className="text-[var(--text-body)] tabular-nums">{(e.fraction * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-[var(--gray-100)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, e.fraction * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {report.warnings.length > 0 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Warnings</p>
                  <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-0.5">
                    {report.warnings.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {bankroll && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-body)] uppercase tracking-wider">Bankroll</p>
              <p className="text-sm text-[var(--text-body)] mt-0.5">
                ${bankroll.bankrollUsd.toFixed(0)} risk capital · {bankroll.riskMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
