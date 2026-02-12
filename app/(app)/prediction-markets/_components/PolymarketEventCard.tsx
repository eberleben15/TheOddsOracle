"use client";

import { Card, CardBody, CardHeader } from "@nextui-org/react";
import { ArrowTopRightOnSquareIcon, ChartBarIcon, ClockIcon } from "@heroicons/react/24/outline";
import type { PolymarketEvent, PolymarketMarket } from "@/types/polymarket";

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
  // outcomePrices missing or stale (0/1); use bestBid/bestAsk or lastTradePrice
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

export function PolymarketEventCard({ event }: PolymarketEventCardProps) {
  const market = pickDisplayMarket(event.markets);
  const { yes, no } = getMarketPrices(market);
  const hasPrices = yes > 0 || no > 0;
  const volumeStr = formatVolume(event.volume ?? event.liquidity ?? market?.volumeNum);
  const endDate = market?.endDateIso ?? market?.endDate ?? event.endDate;
  const url = event.slug ? `https://polymarket.com/event/${event.slug}` : "https://polymarket.com";

  return (
    <Card
      className="
        group bg-white border border-[var(--border-color)]
        hover:border-gray-300 hover:shadow-md
        transition-all duration-200 overflow-hidden
      "
      isPressable
      as="a"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      <CardHeader className="flex flex-col items-stretch gap-3 pb-3 pt-4 px-4 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border text-violet-700 bg-violet-50 border-violet-200">
            Polymarket
          </span>
          <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs">
            <span className="hidden sm:inline">Polymarket</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </span>
        </div>
        <h3 className="font-semibold text-[var(--text-dark)] text-left leading-snug line-clamp-2 min-h-[2.5rem]">
          {event.title}
        </h3>
        {event.subtitle ? (
          <p className="text-sm text-[var(--text-body)] text-left line-clamp-2">{event.subtitle}</p>
        ) : null}
      </CardHeader>

      <CardBody className="p-4 pt-4 gap-4">
        <div className="flex items-stretch rounded-lg border border-[var(--border-color)] overflow-hidden bg-gray-50/80">
          <div className="flex-1 flex flex-col items-center justify-center py-3 px-3 border-r border-[var(--border-color)]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-body)]">Yes</span>
            <span className="text-lg font-bold text-[var(--text-dark)] mt-0.5 tabular-nums">
              {hasPrices ? `${Math.round(yes * 100)}¢` : "—"}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-3 px-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-body)]">No</span>
            <span className="text-lg font-bold text-[var(--text-dark)] mt-0.5 tabular-nums">
              {hasPrices ? `${Math.round(no * 100)}¢` : "—"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-body)] pt-1">
          <span className="flex items-center gap-1.5">
            <ChartBarIcon className="h-3.5 w-3.5 text-gray-400" />
            <span>Vol {volumeStr}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
            <span>Closes {formatDate(endDate)}</span>
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
