"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChartPieIcon,
  ArrowTrendingUpIcon,
  SignalIcon,
  CalendarIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import type { BankrollSummary } from "@/types/abe";

interface DashboardStatsStripProps {
  liveCount?: number;
  upcomingCount?: number;
}

export function DashboardStatsStrip({ liveCount = 0, upcomingCount = 0 }: DashboardStatsStripProps = {}) {
  const [kalshiStatus, setKalshiStatus] = useState<{
    connected: boolean;
    positionsCount?: number;
  } | null>(null);
  const [bankroll, setBankroll] = useState<BankrollSummary | null>(null);

  useEffect(() => {
    fetch("/api/positions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const count = data?.positions?.length ?? 0;
        const connected = !!(data?.kalshiConnected || data?.polymarketConnected);
        setKalshiStatus(connected ? { connected: true, positionsCount: count } : { connected: false });
      })
      .catch(() => setKalshiStatus(null));
  }, []);

  useEffect(() => {
    fetch("/api/bankroll")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BankrollSummary | null) => setBankroll(data))
      .catch(() => setBankroll(null));
  }, []);

  const bankrollValue =
    bankroll && bankroll.bankrollUsd > 0
      ? `$${bankroll.recommendedMaxPositionUsd.toFixed(0)} max`
      : "—";
  const bankrollSub =
    bankroll?.riskMessage ?? "Set risk capital in Settings";
  const p30Hint =
    bankroll?.pDrawdown30In45Days != null
      ? ` · P(30% in 45d): ${(bankroll.pDrawdown30In45Days * 100).toFixed(0)}%`
      : "";
  const bankrollSubDisplay = (bankrollSub + p30Hint).length > 36
    ? (bankrollSub + p30Hint).slice(0, 35) + "…"
    : bankrollSub + p30Hint;

  const stats = [
    {
      label: "Open positions",
      value: kalshiStatus?.positionsCount ?? "—",
      sub: kalshiStatus?.connected ? "Kalshi & Polymarket" : "Connect to sync",
      href: "/prediction-markets/portfolio",
      Icon: ChartPieIcon,
    },
    {
      label: "Bankroll",
      value: bankrollValue,
      sub: bankrollSubDisplay,
      href: "/settings",
      Icon: BanknotesIcon,
    },
    {
      label: "Live games",
      value: liveCount,
      sub: "in progress",
      href: "/sports/cbb",
      Icon: SignalIcon,
    },
    {
      label: "Upcoming",
      value: upcomingCount,
      sub: "matchups",
      href: "/sports/cbb",
      Icon: CalendarIcon,
    },
    {
      label: "Prediction markets",
      sub: "Kalshi & Polymarket",
      href: "/prediction-markets",
      Icon: ArrowTrendingUpIcon,
      noValue: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {stats.map((stat, idx) => (
        <Link
          key={idx}
          href={stat.href}
          className="
            flex items-center gap-4 p-4 rounded-xl border border-gray-200 bg-white
            hover:border-gray-300 hover:shadow-sm transition-all
          "
        >
          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <stat.Icon className="h-5 w-5 text-gray-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            {!stat.noValue && (
              <p className="text-xl font-bold text-text-dark tabular-nums">{stat.value}</p>
            )}
            <p className="text-xs text-gray-500">{stat.sub}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
