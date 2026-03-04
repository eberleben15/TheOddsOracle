"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardBody, Slider, Chip } from "@nextui-org/react";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

type PriceMove = {
  contractId: string;
  label?: string;
  costPerShare: number;
  currentPrice: number;
  moveProb: number;
  movePct: number;
  direction: "up" | "down";
};

type PriceMovesResponse = {
  moves: PriceMove[];
  threshold: number;
  positionsChecked: number;
  message?: string;
  error?: string;
};

export default function PriceMovesPage() {
  const [moves, setMoves] = useState<PriceMove[]>([]);
  const [threshold, setThreshold] = useState(10);
  const [positionsChecked, setPositionsChecked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchMoves = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/abe/price-moves?threshold=${threshold / 100}`);
      const data: PriceMovesResponse = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Failed to load price moves");
        setMoves([]);
        return;
      }
      setMoves(data.moves ?? []);
      setPositionsChecked(data.positionsChecked ?? 0);
      if (data.message) setMessage(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setMoves([]);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    fetchMoves();
  }, [fetchMoves]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/prediction-markets/portfolio" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Portfolio
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-dark)]">Price Moves</h1>
            <p className="text-[var(--text-body)] mt-1">
              Positions with significant cost vs current price movement. Connect Kalshi or Polymarket to see alerts.
            </p>
          </div>
          <button
            onClick={fetchMoves}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {message && (
        <Card className="border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 mb-4">
          <CardBody className="p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">{message}</p>
            <Link href="/settings" className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline">
              <LinkIcon className="h-4 w-4" /> Connect accounts in Settings
            </Link>
          </CardBody>
        </Card>
      )}

      {error && (
        <Card className="border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 mb-4">
          <CardBody className="p-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Error loading price moves</p>
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Threshold slider */}
      <Card className="border border-gray-200 dark:border-gray-700 mb-6">
        <CardBody className="p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-[var(--text-dark)]">
              Show moves above
            </label>
            <span className="text-sm font-bold text-primary">{threshold}%</span>
          </div>
          <Slider
            size="sm"
            step={1}
            minValue={5}
            maxValue={50}
            value={threshold}
            onChange={(v) => setThreshold(v as number)}
            className="max-w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Positions checked: {positionsChecked}
          </p>
        </CardBody>
      </Card>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      ) : moves.length === 0 ? (
        <Card className="border border-gray-200 dark:border-gray-700">
          <CardBody className="p-8 text-center">
            <ArrowTrendingUpIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No significant price moves in your positions.</p>
            <p className="text-sm text-gray-400 mt-1">
              Try lowering the threshold or connect Kalshi/Polymarket in Settings.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {moves.map((m) => (
            <Card
              key={m.contractId}
              className="border border-gray-200 dark:border-gray-700 hover:border-primary/30 transition-colors"
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--text-dark)] truncate">
                      {m.label || m.contractId}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>Cost: {(m.costPerShare * 100).toFixed(0)}¢</span>
                      <span>Now: {(m.currentPrice * 100).toFixed(0)}¢</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {m.direction === "up" ? (
                      <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
                    )}
                    <Chip
                      size="sm"
                      color={m.direction === "up" ? "success" : "danger"}
                      variant="flat"
                    >
                      {m.direction === "up" ? "+" : ""}{(m.movePct * 100).toFixed(0)}%
                    </Chip>
                  </div>
                </div>
                {m.direction === "down" && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                    Price moved against you by {(m.movePct * -100).toFixed(0)}%. Consider reducing or closing this position on Kalshi or Polymarket.
                  </p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
