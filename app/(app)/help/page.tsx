"use client";

import Link from "next/link";
import {
  Cog6ToothIcon,
  ChartPieIcon,
  SparklesIcon,
  BookOpenIcon,
  ArrowRightIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";

const helpSections = [
  {
    title: "Get started",
    items: [
      { label: "Set your bankroll", href: "/settings", description: "Enter risk capital and Kelly fraction for position sizing" },
      { label: "Connect accounts", href: "/settings", description: "Link Kalshi or Polymarket to sync positions" },
      { label: "Build your first slate", href: "/slate-builder", description: "One-click portfolio construction from value bets" },
    ],
  },
  {
    title: "Key features",
    items: [
      { label: "How we predict", href: "/methodology", description: "Our prediction methodology in plain language" },
      { label: "Portfolio Risk", href: "/prediction-markets/portfolio", description: "Factor exposure, concentration, and risk warnings" },
      { label: "Slate Builder", href: "/slate-builder", description: "Optimized bet selection and sizing" },
      { label: "Prediction Markets", href: "/prediction-markets", description: "Browse Kalshi and Polymarket" },
      { label: "Sports & Matchups", href: "/sports/cbb", description: "Live games and analytics" },
    ],
  },
  {
    title: "Setup & configuration",
    items: [
      { label: "Settings", href: "/settings", description: "Bankroll, connections, and preferences" },
      { label: "Features overview", href: "/features", description: "Product capabilities and pricing" },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpenIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-dark)]">Help & Resources</h1>
            <p className="text-[var(--text-body)]">Guides, setup, and product overview</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {helpSections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-4">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-primary/40 hover:shadow-sm transition-all group"
                >
                  <div className="h-9 w-9 rounded-lg bg-[var(--gray-100)] flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    {item.label.includes("Bankroll") || item.label.includes("Connect") ? (
                      <LinkIcon className="h-4 w-4 text-[var(--text-body)] group-hover:text-primary" />
                    ) : item.label.includes("Slate") ? (
                      <SparklesIcon className="h-4 w-4 text-[var(--text-body)] group-hover:text-primary" />
                    ) : item.label.includes("Portfolio") ? (
                      <ChartPieIcon className="h-4 w-4 text-[var(--text-body)] group-hover:text-primary" />
                    ) : (
                      <Cog6ToothIcon className="h-4 w-4 text-[var(--text-body)] group-hover:text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-[var(--text-dark)] group-hover:text-primary">
                      {item.label}
                    </span>
                    <p className="text-sm text-[var(--text-body)] mt-0.5">{item.description}</p>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
