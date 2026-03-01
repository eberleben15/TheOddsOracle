"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronUpIcon, WalletIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { ABEPosition, PortfolioRiskReport, BankrollSummary } from "@/types/abe";

export function UnifiedPortfolioSection() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dashboard-portfolio-collapsed") === "true";
    }
    return false;
  });

  const [positions, setPositions] = useState<ABEPosition[]>([]);
  const [report, setReport] = useState<PortfolioRiskReport | null>(null);
  const [bankroll, setBankroll] = useState<BankrollSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem("dashboard-portfolio-collapsed", String(newValue));
      return newValue;
    });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [positionsRes, bankrollRes] = await Promise.all([
        fetch("/api/positions"),
        fetch("/api/bankroll"),
      ]);

      const positionsData = await positionsRes.json();
      const bankrollData = bankrollRes.ok ? await bankrollRes.json() : null;

      const nextPositions = positionsData.positions ?? [];
      setPositions(nextPositions);
      setBankroll(bankrollData);

      if (nextPositions.length > 0) {
        try {
          const res = await fetch("/api/abe/portfolio-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ positions: nextPositions }),
          });
          const data = await res.json();
          if (res.ok) setReport(data as PortfolioRiskReport);
        } catch {
          setReport(null);
        }
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
  const kalshiCount = positions.filter(p => p.contractId.startsWith("kalshi:")).length;
  const polymarketCount = positions.filter(p => p.contractId.startsWith("polymarket:")).length;

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-3 group"
        >
          <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
            <WalletIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-semibold text-[var(--text-dark)] group-hover:text-primary transition-colors flex items-center gap-2">
              Portfolio Overview
              {isCollapsed ? (
                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronUpIcon className="w-4 h-4 text-gray-400" />
              )}
            </h2>
            <p className="text-sm text-gray-500">Combined risk & performance</p>
          </div>
        </button>
        <Link
          href="/prediction-markets/portfolio"
          className="text-sm font-medium text-primary hover:underline shrink-0"
        >
          Full Analysis →
        </Link>
      </div>

      {/* Content */}
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden">
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-3 w-20 bg-gray-200 rounded mb-2" />
                    <div className="h-7 w-16 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Total Value</p>
                  <p className="text-2xl font-bold text-[var(--text-dark)] tabular-nums">
                    ${totalNotional.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {positions.length} positions
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Bankroll</p>
                  <p className="text-2xl font-bold text-[var(--text-dark)] tabular-nums">
                    {bankroll ? `$${bankroll.bankrollUsd.toFixed(0)}` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {bankroll ? "risk capital" : "Set in Settings"}
                  </p>
                </div>

                {report && (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Concentration</p>
                      <p className={`text-2xl font-bold tabular-nums ${
                        report.concentrationRisk > 0.4 ? "text-amber-600" : "text-[var(--text-dark)]"
                      }`}>
                        {(report.concentrationRisk * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {report.concentrationRisk > 0.4 ? "high" : "healthy"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Volatility (1σ)</p>
                      <p className="text-2xl font-bold text-[var(--text-dark)] tabular-nums">
                        {report.varianceCurve ? `±$${report.varianceCurve.volatilityUsd.toFixed(0)}` : "—"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        expected range
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Expanded Details */}
              {!isCollapsed && (
                <>
                  {/* Position Breakdown */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mb-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Position Breakdown</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[var(--text-dark)]">Kalshi</span>
                          <span className="text-sm font-bold text-[var(--text-dark)] tabular-nums">{kalshiCount}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${positions.length ? (kalshiCount / positions.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-[var(--text-dark)]">Polymarket</span>
                          <span className="text-sm font-bold text-[var(--text-dark)] tabular-nums">{polymarketCount}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full" 
                            style={{ width: `${positions.length ? (polymarketCount / positions.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Factor Exposure */}
                  {report && report.factorExposures.length > 0 && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mb-4">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Top Factor Exposure</p>
                      <div className="space-y-2">
                        {report.factorExposures.slice(0, 3).map((e) => (
                          <div key={e.factorId} className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between text-sm mb-0.5">
                                <span className="font-medium text-[var(--text-dark)]">{e.factorName}</span>
                                <span className="text-gray-500 tabular-nums">{(e.fraction * 100).toFixed(0)}%</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

                  {/* Warnings */}
                  {report && report.warnings.length > 0 && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                      <div className="flex items-start gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Risk Warnings</p>
                          <ul className="text-sm text-amber-900 dark:text-amber-100 space-y-0.5">
                            {report.warnings.slice(0, 2).map((w, i) => (
                              <li key={i}>• {w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {positions.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-gray-500 mb-3">No positions tracked yet</p>
                      <Link
                        href="/settings"
                        className="inline-block px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                      >
                        Connect Accounts
                      </Link>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
