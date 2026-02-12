"use client";

import Link from "next/link";
import {
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ArrowPathIcon,
  SparklesIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const actions = [
  {
    title: "Portfolio Risk",
    description: "View factor exposure, concentration, and overexposure warnings",
    href: "/prediction-markets/portfolio",
    Icon: ChartPieIcon,
    color: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    title: "Prediction Markets",
    description: "Browse Kalshi & Polymarket events and prices",
    href: "/prediction-markets",
    Icon: ArrowTrendingUpIcon,
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    title: "Sync Kalshi",
    description: "Pull your latest positions from Kalshi",
    href: "/prediction-markets/portfolio",
    Icon: ArrowPathIcon,
    color: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    title: "Value bets",
    description: "AI-identified edges (premium)",
    href: "/dashboard#value-bets",
    Icon: SparklesIcon,
    color: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    title: "Sports",
    description: "Live and upcoming matchups by league",
    href: "/sports/cbb",
    Icon: ChartBarIcon,
    color: "bg-gray-100 text-gray-700 border-gray-200",
  },
  {
    title: "AI Chat",
    description: "Ask questions and get betting insights",
    href: "/chat",
    Icon: ChatBubbleLeftRightIcon,
    color: "bg-sky-50 text-sky-700 border-sky-100",
  },
];

export function ActionFlowsSection() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-text-dark mb-4">Quick actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actions.map((action, idx) => (
          <Link
            key={idx}
            href={action.href}
            className={`
              flex items-start gap-4 p-4 rounded-xl border transition-all
              hover:shadow-md hover:border-gray-300
              ${action.color}
            `}
          >
            <div className="h-10 w-10 rounded-lg bg-white/80 flex items-center justify-center shrink-0 border border-white/50">
              <action.Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-text-dark">{action.title}</h3>
              <p className="text-xs text-text-body mt-0.5">{action.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
