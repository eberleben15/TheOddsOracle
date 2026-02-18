"use client";

import { useState } from "react";
import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { ParsedOdds } from "@/lib/odds-utils";
import { formatDecimalOdds, formatSpread } from "@/lib/odds-utils";
import {
  sportsOutcomeToABEPosition,
  sportsOutcomeToABEContract,
} from "@/lib/abe/sports-adapter";
import type { SportsMarketType, SportsOutcomeKey } from "@/lib/abe/sports-adapter";

const DEFAULT_SIZE = 100;

interface AddToSandboxOddsProps {
  gameId: string;
  awayTeamName: string;
  homeTeamName: string;
  firstOdds: ParsedOdds | null;
}

export function AddToSandboxOdds({
  gameId,
  awayTeamName,
  homeTeamName,
  firstOdds,
}: AddToSandboxOddsProps) {
  const [adding, setAdding] = useState<string | null>(null);

  const add = async (
    marketType: SportsMarketType,
    outcomeKey: SportsOutcomeKey,
    decimalPrice: number,
    point?: number
  ) => {
    const key = `${marketType}:${outcomeKey}`;
    setAdding(key);
    try {
      const position = sportsOutcomeToABEPosition(
        gameId,
        marketType,
        outcomeKey,
        decimalPrice,
        DEFAULT_SIZE
      );
      const contract = sportsOutcomeToABEContract(
        gameId,
        awayTeamName,
        homeTeamName,
        marketType,
        outcomeKey,
        decimalPrice,
        point
      );
      const res = await fetch("/api/sandbox/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions: [position], contracts: [contract] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
    } catch {
      // silent
    } finally {
      setAdding(null);
    }
  };

  if (!firstOdds) return null;
  const hasML =
    firstOdds.moneyline?.away?.price != null || firstOdds.moneyline?.home?.price != null;
  const hasSpread =
    firstOdds.spread?.away != null || firstOdds.spread?.home != null;
  if (!hasML && !hasSpread) return null;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white p-4 mb-6">
      <h3 className="text-sm font-semibold text-[var(--text-dark)] mb-3">
        Add to Sandbox
      </h3>
      <p className="text-xs text-[var(--text-body)] mb-3">
        Add outcomes from {firstOdds.bookmaker} to your Sandbox portfolio.
      </p>
      <div className="flex flex-wrap gap-3">
        {firstOdds.moneyline?.away?.price != null && (
          <OutcomeButton
            label={`${awayTeamName.split(" ")[0]} ML ${formatDecimalOdds(firstOdds.moneyline.away.price)}`}
            adding={adding === "moneyline:away"}
            onAdd={() =>
              add("moneyline", "away", firstOdds.moneyline!.away!.price!)
            }
          />
        )}
        {firstOdds.moneyline?.home?.price != null && (
          <OutcomeButton
            label={`${homeTeamName.split(" ")[0]} ML ${formatDecimalOdds(firstOdds.moneyline.home.price)}`}
            adding={adding === "moneyline:home"}
            onAdd={() =>
              add("moneyline", "home", firstOdds.moneyline!.home!.price!)
            }
          />
        )}
        {firstOdds.spread?.away != null && (
          <OutcomeButton
            label={`${awayTeamName.split(" ")[0]} ${formatSpread(firstOdds.spread.away)}`}
            adding={adding === "spread:away"}
            onAdd={() =>
              add(
                "spread",
                "away",
                firstOdds.spread!.away!.price ?? 0.5,
                firstOdds.spread!.away?.point
              )
            }
          />
        )}
        {firstOdds.spread?.home != null && (
          <OutcomeButton
            label={`${homeTeamName.split(" ")[0]} ${formatSpread(firstOdds.spread.home)}`}
            adding={adding === "spread:home"}
            onAdd={() =>
              add(
                "spread",
                "home",
                firstOdds.spread!.home!.price ?? 0.5,
                firstOdds.spread?.home?.point
              )
            }
          />
        )}
      </div>
    </div>
  );
}

function OutcomeButton({
  label,
  adding,
  onAdd,
}: {
  label: string;
  adding: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={adding}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
    >
      <PlusCircleIcon className="h-4 w-4 text-primary" />
      {adding ? "Adding…" : label}
    </button>
  );
}
