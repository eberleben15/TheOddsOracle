"use client";

import { Card, CardBody, CardHeader } from "@nextui-org/react";
import { ArrowTopRightOnSquareIcon, ClockIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import type { KalshiMarket } from "@/types/kalshi";

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

function statusConfig(status: string): { label: string; className: string } {
  const normalized = status?.toLowerCase() ?? "";
  switch (normalized) {
    case "open":
    case "active":
      return { label: "Open", className: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    case "closed":
    case "paused":
      return { label: "Closed", className: "text-amber-700 bg-amber-50 border-amber-200" };
    case "settled":
      return { label: "Settled", className: "text-gray-600 bg-gray-100 border-gray-200" };
    case "unopened":
      return { label: "Upcoming", className: "text-blue-700 bg-blue-50 border-blue-200" };
    default:
      return { label: status || "—", className: "text-gray-600 bg-gray-100 border-gray-200" };
  }
}

export function KalshiMarketCard({ market }: KalshiMarketCardProps) {
  const yesCents = market.last_price != null ? market.last_price : null;
  const noCents = yesCents != null ? 100 - yesCents : null;
  const hasPrices = yesCents != null && (yesCents > 0 || noCents !== 100);
  const volumeStr = formatVolume(market.volume_fp ?? market.volume);
  const status = statusConfig(market.status);

  return (
    <Card
      className="
        group bg-white border border-[var(--border-color)]
        hover:border-gray-300 hover:shadow-md
        transition-all duration-200 overflow-hidden
      "
      isPressable
      as="a"
      href={`https://kalshi.com/markets/${market.ticker}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <CardHeader className="flex flex-col items-stretch gap-3 pb-3 pt-4 px-4 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${status.className}`}
          >
            {status.label}
          </span>
          <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs">
            <span className="hidden sm:inline">Kalshi</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </span>
        </div>
        <h3 className="font-semibold text-[var(--text-dark)] text-left leading-snug line-clamp-2 min-h-[2.5rem]">
          {market.title}
        </h3>
        {market.subtitle ? (
          <p className="text-sm text-[var(--text-body)] text-left line-clamp-2">
            {market.subtitle}
          </p>
        ) : null}
      </CardHeader>

      <CardBody className="p-4 pt-4 gap-4">
        {/* Yes / No odds */}
        <div className="flex items-stretch rounded-lg border border-[var(--border-color)] overflow-hidden bg-gray-50/80">
          <div className="flex-1 flex flex-col items-center justify-center py-3 px-3 border-r border-[var(--border-color)]">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-body)]">
              Yes
            </span>
            <span className="text-lg font-bold text-[var(--text-dark)] mt-0.5 tabular-nums">
              {hasPrices && yesCents != null ? `${yesCents}¢` : "—"}
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-3 px-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-body)]">
              No
            </span>
            <span className="text-lg font-bold text-[var(--text-dark)] mt-0.5 tabular-nums">
              {hasPrices && noCents != null ? `${noCents}¢` : "—"}
            </span>
          </div>
        </div>

        {/* Volume & close time */}
        <div className="flex items-center justify-between text-xs text-[var(--text-body)] pt-1">
          <span className="flex items-center gap-1.5">
            <ChartBarIcon className="h-3.5 w-3.5 text-gray-400" />
            <span>Vol {volumeStr}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
            <span>Closes {formatCloseDate(market.close_time)}</span>
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
