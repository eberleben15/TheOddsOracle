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
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

const startHereSteps = [
  { step: 1, title: "Set your bankroll", href: "/settings", description: "Enter risk capital and Kelly fraction" },
  { step: 2, title: "Connect Kalshi or Polymarket (optional)", href: "/settings", description: "Sync prediction market positions" },
  { step: 3, title: "Open Sports", href: "/sports/cbb", description: "Live games and matchup analytics" },
];

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

      {/* Start here checklist */}
      <div className="mb-6 p-4 rounded-xl border-2 border-primary/20 bg-primary/5">
        <p className="text-sm font-medium text-[var(--text-dark)] mb-3">Start here</p>
        <ol className="space-y-2">
          {startHereSteps.map(({ step, title, href, description }) => (
            <li key={step}>
              <Link
                href={href}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold text-sm">
                  {step}
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <span className="font-medium text-[var(--text-dark)] group-hover:text-primary">
                    {title}
                  </span>
                  <p className="text-xs text-[var(--text-body)] mt-0.5">{description}</p>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400 shrink-0" />
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-sm text-[var(--text-body)] mb-4 max-w-xl">
        More guidance: connect accounts, portfolio risk, and settings below.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {steps.map((step, idx) => (
          <Link
            key={idx}
            href={step.href}
            className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-[var(--gray-300)] hover:shadow-sm transition-all group"
          >
            <div className="h-9 w-9 rounded-lg bg-[var(--gray-100)] flex items-center justify-center shrink-0 group-hover:bg-[var(--gray-200)] transition-colors">
              <step.Icon className="h-4 w-4 text-[var(--text-body)]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium text-[var(--text-dark)] group-hover:text-[var(--text-dark)]">
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
