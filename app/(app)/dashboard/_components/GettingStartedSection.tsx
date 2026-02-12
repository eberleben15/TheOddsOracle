"use client";

import Link from "next/link";
import {
  LinkIcon,
  ChartPieIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

const steps = [
  {
    title: "Connect accounts",
    description: "Link Kalshi or Polymarket in Settings to sync your prediction market positions.",
    href: "/settings",
    Icon: LinkIcon,
  },
  {
    title: "Set your bankroll",
    description: "Enter risk capital and Kelly fraction so we can size positions and show risk metrics.",
    href: "/settings",
    Icon: BanknotesIcon,
  },
  {
    title: "Portfolio risk",
    description: "View factor exposure, concentration, and overexposure warnings. Sync and analyze positions.",
    href: "/prediction-markets/portfolio",
    Icon: ChartPieIcon,
  },
  {
    title: "Prediction markets",
    description: "Browse Kalshi and Polymarket. Connect in Settings, then sync on the portfolio page.",
    href: "/prediction-markets",
    Icon: ArrowTrendingUpIcon,
  },
  {
    title: "Sports & matchups",
    description: "Live and upcoming games by league. Use matchup pages for analytics and value.",
    href: "/sports/cbb",
    Icon: ChartPieIcon,
  },
  {
    title: "Settings",
    description: "Bankroll, connections, and preferences in one place.",
    href: "/settings",
    Icon: Cog6ToothIcon,
  },
  {
    title: "Docs & help",
    description: "Setup guides (ENV_SETUP, env), configuration, and support.",
    href: "/settings",
    Icon: DocumentTextIcon,
  },
];

export function GettingStartedSection() {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <BookOpenIcon className="h-5 w-5 text-gray-500" aria-hidden />
        <h2 className="text-lg font-semibold text-[var(--text-dark)]">
          Getting started & how-tos
        </h2>
      </div>
      <p className="text-sm text-[var(--text-body)] mb-4 max-w-xl">
        Your home base: connect accounts, set bankroll, then use Portfolio Risk and Sports to track positions and find edges. Use the cards below for step-by-step guidance.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((step, idx) => (
          <Link
            key={idx}
            href={step.href}
            className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border-color)] bg-white hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200 transition-colors">
              <step.Icon className="h-4 w-4 text-gray-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-[var(--text-dark)] group-hover:text-gray-900">
                {step.title}
              </h3>
              <p className="text-xs text-[var(--text-body)] mt-0.5">
                {step.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
