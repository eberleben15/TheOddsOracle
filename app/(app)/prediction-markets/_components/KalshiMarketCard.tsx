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
  if (Number.isNaN(num) || num <= 0) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/** Parse dollar string (0-1) to cents (0-100). API uses yes_bid_dollars etc. */
function parseDollarsToCents(s: string | undefined): number | null {
  if (!s || typeof s !== "string") return null;
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n < 0 || n > 1) return null;
  return Math.round(n * 100);
}

function truncateTitle(text: string | undefined, maxLen = 120): string {
  if (!text?.trim()) return "";
  const stripped = text.replace(/\s+/g, " ").trim();
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen).trim() + "…";
}

const DEFAULT_SANDBOX_SIZE = 10;

export function KalshiMarketCard({ market }: KalshiMarketCardProps) {
  // Prices: prefer bid/ask mid when last_price is 0 (thin or no trades)
  const bidAskMid =
    market.yes_bid != null && market.yes_ask != null
      ? Math.round((market.yes_bid + market.yes_ask) / 2)
      : null;
  const fromCents =
    market.last_price != null && market.last_price > 0
      ? market.last_price
      : bidAskMid ??
        market.yes_ask ??
        market.yes_bid ??
        market.last_price ??
        null;
  const fromDollars =
    parseDollarsToCents(market.last_price_dollars) ??
    (() => {
      const bid = parseDollarsToCents(market.yes_bid_dollars);
      const ask = parseDollarsToCents(market.yes_ask_dollars);
      if (bid != null && ask != null) return Math.round((bid + ask) / 2);
      return ask ?? bid ?? null;
    })();
  const yesCents = fromCents ?? fromDollars;
  const noCents = yesCents != null ? 100 - yesCents : null;
  const volumeStr = formatVolume(market.volume_fp ?? market.volume);
  const closeStr = formatCloseDate(market.close_time);

  const addToSandbox = async (side: "yes" | "no") => {
    const costCents =
      side === "yes"
        ? (yesCents ?? 50)
        : (yesCents != null ? 100 - yesCents : 50);
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
      title={truncateTitle(market.title)}
      subtitle={market.subtitle ?? undefined}
      yesCents={yesCents}
      noCents={noCents}
      volumeLabel={volumeStr}
      closeLabel={closeStr}
      onAddToSandbox={addToSandbox}
      externalLinkOnly
    />
  );
}
