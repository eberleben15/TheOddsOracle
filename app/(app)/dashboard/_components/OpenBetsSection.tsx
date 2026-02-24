"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChartPieIcon, ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { ABEPosition } from "@/types/abe";

export function OpenBetsSection() {
  const [positions, setPositions] = useState<ABEPosition[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [kalshi, polymarket] = await Promise.all([
          fetch("/api/kalshi/status").then((r) => r.json()),
          fetch("/api/polymarket/status").then((r) => r.json()),
        ]);
        setConnected(!!kalshi?.connected || !!polymarket?.connected);
        if (!kalshi?.connected && !polymarket?.connected) {
          setLoading(false);
          return;
        }
        const r = await fetch("/api/positions");
        const data = r.ok ? await r.json() : null;
        if (data?.positions) setPositions(data.positions);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-dark">Open positions</h2>
        </div>
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6">
          <LoadingSkeleton type="list" count={3} />
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-dark">Open positions</h2>
        <Link
          href="/prediction-markets/portfolio"
          className="text-sm font-medium text-[var(--text-body)] hover:text-[var(--text-dark)] flex items-center gap-1"
        >
          Portfolio Risk
          <ChartPieIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden">
        {!connected ? (
          <div className="p-6 text-center">
            <p className="text-[var(--text-body)] text-sm mb-4">
              Connect Kalshi or Polymarket to see your positions here, or add them manually in Portfolio Risk.
            </p>
            <Link
              href="/prediction-markets/portfolio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gray-800)] text-white text-sm font-medium hover:opacity-90"
            >
              <PlusIcon className="h-4 w-4" />
              Go to Portfolio Risk
            </Link>
          </div>
        ) : positions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[var(--text-body)] text-sm mb-4">
              No open positions. Sync from Kalshi or Polymarket in Portfolio Risk, or add manually.
            </p>
            <Link
              href="/prediction-markets/portfolio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Sync from Kalshi
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {positions.slice(0, 5).map((p, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between text-sm">
                <span className="font-mono text-[var(--text-dark)] truncate">
                  {p.contractId.startsWith("polymarket:")
                    ? p.contractId.replace("polymarket:", "").replace(/:yes|:no$/, "")
                    : p.contractId.replace("kalshi:", "").replace(/:yes|:no$/, "")}{" "}
                  · {p.side}
                </span>
                <span className="text-[var(--text-body)] tabular-nums">
                  {p.size} @ {(p.costPerShare * 100).toFixed(0)}¢
                </span>
              </li>
            ))}
          </ul>
        )}
        {positions.length > 5 && (
          <div className="px-4 py-2 border-t border-[var(--border-color)] text-center">
            <Link
              href="/prediction-markets/portfolio"
              className="text-sm text-[var(--text-body)] hover:text-[var(--text-dark)]"
            >
              View all {positions.length} positions →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
