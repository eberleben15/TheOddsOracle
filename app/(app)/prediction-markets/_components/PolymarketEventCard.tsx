"use client";

import type { PolymarketEvent, PolymarketMarket } from "@/types/polymarket";
import { polymarketMarketToABEContractId, polymarketMarketToABEContracts } from "@/lib/abe";
import { PredictionMarketCardLayout } from "./PredictionMarketCardLayout";

interface PolymarketEventCardProps {
  event: PolymarketEvent;
}

function parseOutcomePrices(outcomePrices?: string): { yes: number; no: number } | null {
  if (!outcomePrices) return null;
  try {
    const arr = JSON.parse(outcomePrices) as unknown;
    if (Array.isArray(arr) && arr.length >= 2) {
      const yes = Number(arr[0]);
      const no = Number(arr[1]);
      if (Number.isFinite(yes) && Number.isFinite(no)) {
        return { yes, no };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** Prefer order-book / last-trade when outcomePrices are stale (0/1 or 1/0). */
function getMarketPrices(market: PolymarketMarket | undefined): { yes: number; no: number } {
  const parsed = market ? parseOutcomePrices(market.outcomePrices) : null;
  const validParsed = parsed && parsed.yes > 0 && parsed.yes < 1 && parsed.no > 0 && parsed.no < 1;
  if (validParsed) {
    return parsed;
  }
  const bid = typeof market?.bestBid === "number" ? market.bestBid : NaN;
  const ask = typeof market?.bestAsk === "number" ? market.bestAsk : NaN;
  const last = typeof market?.lastTradePrice === "number" ? market.lastTradePrice : NaN;
  if (Number.isFinite(bid) && Number.isFinite(ask)) {
    const yes = (bid + ask) / 2;
    return { yes, no: 1 - yes };
  }
  if (Number.isFinite(last) && last > 0 && last < 1) {
    return { yes: last, no: 1 - last };
  }
  return parsed ?? { yes: 0.5, no: 0.5 };
}

/** For multi-market events, prefer the first active, open market with valid prices (not 0/1). */
function pickDisplayMarket(markets: PolymarketMarket[] | undefined): PolymarketMarket | undefined {
  if (!markets?.length) return undefined;
  for (const m of markets) {
    if (m.closed) continue;
    const parsed = parseOutcomePrices(m.outcomePrices);
    const valid = parsed && parsed.yes > 0 && parsed.yes < 1 && parsed.no > 0 && parsed.no < 1;
    if (valid) return m;
    const hasBidAsk = Number.isFinite(m.bestBid) && Number.isFinite(m.bestAsk);
    const hasLast = Number.isFinite(m.lastTradePrice) && (m.lastTradePrice ?? 0) > 0 && (m.lastTradePrice ?? 0) < 1;
    if (hasBidAsk || hasLast) return m;
  }
  return markets[0];
}

function formatDate(iso: string | undefined): string {
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

function formatVolume(value: number | string | undefined): string {
  if (value == null || value === "" || value === "0") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

const DEFAULT_SANDBOX_SIZE = 10;

export function PolymarketEventCard({ event }: PolymarketEventCardProps) {
  const market = pickDisplayMarket(event.markets);
  const { yes, no } = getMarketPrices(market);
  const yesCents = yes > 0 || no > 0 ? Math.round(yes * 100) : null;
  const noCents = yesCents != null ? Math.round(no * 100) : null;
  const volumeStr = formatVolume(event.volume ?? event.liquidity ?? market?.volumeNum);
  const endDate = market?.endDateIso ?? market?.endDate ?? event.endDate;
  const closeStr = formatDate(endDate);
  const url = event.slug ? `https://polymarket.com/event/${event.slug}` : "https://polymarket.com";

  const addToSandbox = async (side: "yes" | "no") => {
    if (!market) return;
    const costPerShare = side === "yes" ? Math.max(0.01, Math.min(0.99, yes)) : Math.max(0.01, Math.min(0.99, no));
    const position = {
      contractId: polymarketMarketToABEContractId(market, side),
      side,
      size: DEFAULT_SANDBOX_SIZE,
      costPerShare,
    };
    const contracts = polymarketMarketToABEContracts(market, event);
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
      sourceLabel="Polymarket"
      sourceVariant="polymarket"
      href={url}
      title={event.title}
      subtitle={event.subtitle ?? undefined}
      yesCents={yesCents}
      noCents={noCents}
      volumeLabel={volumeStr}
      closeLabel={closeStr}
      onAddToSandbox={addToSandbox}
      addDisabled={!market}
    />
  );
}
