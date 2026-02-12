"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BettingDNA } from "@/types/abe";

export default function DNAPage() {
  const [dna, setDna] = useState<BettingDNA | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/abe/dna")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BettingDNA | null) => setDna(data))
      .catch(() => setDna(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/prediction-markets" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Prediction markets
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-dark)]">Your Betting DNA</h1>
        <p className="text-[var(--text-body)] mt-1">
          Your risk profile, preferences, and how you compare. Set risk and preferences in Settings.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : !dna ? (
        <p className="text-sm text-gray-500">Could not load your DNA. Try again later.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
            <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">Risk & sizing</h2>
            <ul className="text-sm text-[var(--text-body)] space-y-1">
              <li>
                Risk profile: <strong>{dna.riskProfile ?? "Custom"}</strong>
              </li>
              <li>
                Kelly fraction: <strong>{(dna.kellyFraction * 100).toFixed(0)}%</strong>
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
            <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">Preferences</h2>
            <p className="text-sm text-[var(--text-body)]">
              Markets: {dna.preferredMarkets.length ? dna.preferredMarkets.join(", ") : "Not set"}
            </p>
            <p className="text-sm text-[var(--text-body)] mt-1">
              Sports: {dna.preferredSports.length ? dna.preferredSports.join(", ") : "Not set"}
            </p>
            <Link href="/settings" className="text-xs text-primary hover:underline mt-2 inline-block">
              Edit in Settings →
            </Link>
          </div>
          {dna.edgeSummary && (
            <div className="rounded-xl border border-[var(--border-color)] bg-white p-4">
              <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-3">Edge accuracy (platform)</h2>
              <p className="text-sm text-[var(--text-body)]">
                From validated predictions: <strong>{dna.edgeSummary.wins}</strong> wins of{" "}
                <strong>{dna.edgeSummary.totalBets}</strong> ({((dna.edgeSummary.winRate ?? 0) * 100).toFixed(0)}% win rate).
              </p>
            </div>
          )}
          {dna.comparisonSummary && (
            <div className="rounded-xl border border-[var(--border-color)] bg-gray-50 p-4">
              <h2 className="text-sm font-semibold text-[var(--text-dark)] mb-2">Comparison</h2>
              <p className="text-sm text-[var(--text-body)]">{dna.comparisonSummary}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
