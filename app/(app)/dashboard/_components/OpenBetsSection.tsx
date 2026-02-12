"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChartPieIcon, ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
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
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
          <div className="h-10 bg-gray-200 rounded" />
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
          className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          Portfolio Risk
          <ChartPieIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {!connected ? (
          <div className="p-6 text-center">
            <p className="text-text-body text-sm mb-4">
              Connect Kalshi or Polymarket to see your positions here, or add them manually in Portfolio Risk.
            </p>
            <Link
              href="/prediction-markets/portfolio"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700"
            >
              <PlusIcon className="h-4 w-4" />
              Go to Portfolio Risk
            </Link>
          </div>
        ) : positions.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-text-body text-sm mb-4">
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
          <ul className="divide-y divide-gray-100">
            {positions.slice(0, 5).map((p, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between text-sm">
                <span className="font-mono text-text-dark truncate">
                  {p.contractId.startsWith("polymarket:")
                    ? p.contractId.replace("polymarket:", "").replace(/:yes|:no$/, "")
                    : p.contractId.replace("kalshi:", "").replace(/:yes|:no$/, "")}{" "}
                  · {p.side}
                </span>
                <span className="text-gray-500 tabular-nums">
                  {p.size} @ {(p.costPerShare * 100).toFixed(0)}¢
                </span>
              </li>
            ))}
          </ul>
        )}
        {positions.length > 5 && (
          <div className="px-4 py-2 border-t border-gray-100 text-center">
            <Link
              href="/prediction-markets/portfolio"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              View all {positions.length} positions →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
