"use client";

import type { KalshiMarket } from "@/types/kalshi";
import { kalshiTickerToABEContractId, kalshiMarketToABEContracts } from "@/lib/abe";
import { PredictionMarketCardLayout } from "./PredictionMarketCardLayout";

interface KalshiMarketCardProps {
  market: KalshiMarket;
}

function formatCloseDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "2-digit" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVolume(value: string | number | undefined): string {
  if (value == null || value === "" || value === "0" || value === "0.00") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return String(value);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

const DEFAULT_SANDBOX_SIZE = 10;

export function KalshiMarketCard({ market }: KalshiMarketCardProps) {
  // last_price (0-100); fallback to mid of yes_bid/yes_ask when missing
  const yesCents =
    market.last_price != null
      ? market.last_price
      : market.yes_bid != null && market.yes_ask != null
        ? Math.round((market.yes_bid + market.yes_ask) / 2)
        : market.yes_ask ?? market.yes_bid ?? null;
  const noCents = yesCents != null ? 100 - yesCents : null;
  const volumeStr = formatVolume(market.volume_fp ?? market.volume);
  const closeStr = formatCloseDate(market.close_time);

  const addToSandbox = async (side: "yes" | "no") => {
    const costCents =
      side === "yes"
        ? market.last_price ?? market.yes_bid ?? market.yes_ask ?? 50
        : 100 - (market.last_price ?? market.yes_bid ?? market.yes_ask ?? 50);
    const costPerShare = Math.max(0.01, Math.min(0.99, costCents / 100));
    const position = {
      contractId: kalshiTickerToABEContractId(market.ticker, side),
      side,
      size: DEFAULT_SANDBOX_SIZE,
      costPerShare,
    };
    const contracts = kalshiMarketToABEContracts(market);
    const contract = contracts.find((c) => c.id === position.contractId);
    const res = await fetch("/api/sandbox/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positions: [position],
        contracts: contract ? [contract] : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to add");
  };

  return (
    <PredictionMarketCardLayout
      sourceLabel="Kalshi"
      sourceVariant="kalshi"
      href={`https://kalshi.com/markets/${market.ticker}`}
      title={market.title}
      subtitle={market.subtitle ?? undefined}
      yesCents={yesCents}
      noCents={noCents}
      volumeLabel={volumeStr}
      closeLabel={closeStr}
      onAddToSandbox={addToSandbox}
    />
  );
}
