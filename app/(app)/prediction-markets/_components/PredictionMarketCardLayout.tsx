"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@nextui-org/react";
import { ArrowTopRightOnSquareIcon, ChartBarIcon, ClockIcon, PlusCircleIcon } from "@heroicons/react/24/outline";

export interface PredictionMarketCardLayoutProps {
  /** Source badge label (e.g. "Kalshi", "Polymarket") */
  sourceLabel: string;
  /** Optional badge variant for styling (e.g. "kalshi" = green, "polymarket" = violet) */
  sourceVariant?: "kalshi" | "polymarket";
  /** External link (Polymarket/Kalshi). When externalLinkOnly, card is not clickable; link shown in footer. */
  href: string;
  title: string;
  subtitle?: string | null;
  /** Optional description snippet (truncated) */
  description?: string | null;
  /** Yes price in cents (0–100) for display */
  yesCents: number | null;
  /** No price in cents (0–100) for display */
  noCents: number | null;
  volumeLabel: string;
  closeLabel: string;
  onAddToSandbox: (side: "yes" | "no") => Promise<void>;
  /** Disable add buttons when no market (e.g. Polymarket event with no open market) */
  addDisabled?: boolean;
  /** When true, card is not a link; show "View on {source}" in footer instead */
  externalLinkOnly?: boolean;
}

const SOURCE_STYLES: Record<"kalshi" | "polymarket", string> = {
  kalshi: "text-emerald-700 bg-emerald-50 border-emerald-200",
  polymarket: "text-violet-700 bg-violet-50 border-violet-200",
};

export function PredictionMarketCardLayout({
  sourceLabel,
  sourceVariant = "kalshi",
  href,
  title,
  subtitle,
  description,
  yesCents,
  noCents,
  volumeLabel,
  closeLabel,
  onAddToSandbox,
  addDisabled = false,
  externalLinkOnly = false,
}: PredictionMarketCardLayoutProps) {
  const [adding, setAdding] = useState<"yes" | "no" | null>(null);
  const hasPrices = yesCents != null && noCents != null && (yesCents > 0 || noCents < 100);
  const badgeClass = SOURCE_STYLES[sourceVariant];

  const handleAdd = async (side: "yes" | "no") => {
    setAdding(side);
    try {
      await onAddToSandbox(side);
    } finally {
      setAdding(null);
    }
  };

  const cardClass =
    "group bg-white border border-[var(--border-color)] hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden";

  return (
    <Card
      className={cardClass}
      isPressable={!externalLinkOnly}
      as={externalLinkOnly ? "div" : "a"}
      {...(externalLinkOnly ? {} : { href, target: "_blank", rel: "noopener noreferrer" })}
    >
      <CardHeader className="flex flex-col items-stretch gap-3 pb-3 pt-4 px-4 border-b border-[var(--border-color)]">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border ${badgeClass}`}
          >
            {sourceLabel}
          </span>
          {!externalLinkOnly && (
            <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs">
              <span className="hidden sm:inline">{sourceLabel}</span>
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <h3 className="font-semibold text-[var(--text-dark)] text-left leading-snug line-clamp-2 min-h-[2.5rem]">
          {title}
        </h3>
        {subtitle ? (
          <p className="text-sm text-[var(--text-body)] text-left line-clamp-2">{subtitle}</p>
        ) : null}
        {description ? (
          <p className="text-sm text-[var(--text-body)] text-left line-clamp-3 opacity-90">{description}</p>
        ) : null}
      </CardHeader>

      <CardBody className="p-4 pt-4 gap-4">
        <div className="flex items-stretch rounded-lg border border-[var(--border-color)] overflow-hidden bg-gray-50/80">
          <div
            className="flex-1 flex flex-col items-center justify-center py-3 px-3 border-r border-[var(--border-color)]"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-body)]">Yes</span>
            <span className="text-lg font-bold text-[var(--text-dark)] mt-0.5 tabular-nums">
              {hasPrices && yesCents != null ? `${yesCents}¢` : "—"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdd("yes");
              }}
              disabled={adding !== null || addDisabled}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <PlusCircleIcon className="h-3.5 w-3.5" />
              {adding === "yes" ? "Adding…" : "Add to Sandbox"}
            </button>
          </div>
          <div
            className="flex-1 flex flex-col items-center justify-center py-3 px-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-body)]">No</span>
            <span className="text-lg font-bold text-[var(--text-dark)] mt-0.5 tabular-nums">
              {hasPrices && noCents != null ? `${noCents}¢` : "—"}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAdd("no");
              }}
              disabled={adding !== null || addDisabled}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
            >
              <PlusCircleIcon className="h-3.5 w-3.5" />
              {adding === "no" ? "Adding…" : "Add to Sandbox"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-body)] pt-1">
          <span className="flex items-center gap-1.5">
            <ChartBarIcon className="h-3.5 w-3.5 text-gray-400" />
            <span>Vol {volumeLabel}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-3.5 w-3.5 text-gray-400" />
            <span>Closes {closeLabel}</span>
          </span>
        </div>
        {externalLinkOnly && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View on {sourceLabel}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        )}
      </CardBody>
    </Card>
  );
}
