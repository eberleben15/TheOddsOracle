"use client";

import Link from "next/link";
import { SparklesIcon, BoltIcon } from "@heroicons/react/24/outline";
import { DashboardWelcome } from "./_components/DashboardWelcome";
import { SportsSummarySection } from "./_components/SportsSummarySection";
import { PredictionMarketsSummarySection } from "./_components/PredictionMarketsSummarySection";
import { UnifiedPortfolioSection } from "./_components/UnifiedPortfolioSection";
import { RecommendedBetsSection } from "./_components/RecommendedBetsSection";
import { GettingStartedSection } from "./_components/GettingStartedSection";
import type { OddsGame, LiveGame } from "@/types";
import type { Sport } from "@/lib/sports/sport-config";

export interface DashboardHomeProps {
  isAdmin: boolean;
  liveGames?: LiveGame[];
  upcomingGames?: OddsGame[];
  sport?: Sport;
  teamLogos?: Record<string, string>;
  gamesError?: string | null;
}

export function DashboardHome({
  isAdmin,
  liveGames = [],
  upcomingGames = [],
  sport = "cbb",
  teamLogos,
  gamesError,
}: DashboardHomeProps) {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header: welcome + admin */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <DashboardWelcome />
        {isAdmin && (
          <Link
            href="/admin"
            className="shrink-0 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Admin
          </Link>
        )}
      </div>

      {/* Unified Portfolio Overview - Top priority */}
      <UnifiedPortfolioSection />

      {/* Sports Betting Section */}
      <SportsSummarySection
        initialSport={sport}
        initialLiveGames={liveGames}
        initialUpcomingGames={upcomingGames}
        initialTeamLogos={teamLogos ?? {}}
        gamesError={gamesError}
      />

      {/* Prediction Markets Section */}
      <PredictionMarketsSummarySection />

      {/* Value bets / AI recommendations */}
      <section className="mb-8" id="value-bets">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-dark)]">Value Bets</h2>
            <p className="text-sm text-gray-500">AI-identified edges across sports</p>
          </div>
          <Link
            href="/dashboard#value-bets"
            className="text-sm font-medium text-primary hover:underline"
          >
            View All →
          </Link>
        </div>
        <RecommendedBetsSection />
      </section>

      {/* Slate Builder CTA */}
      <section className="mb-8">
        <Link
          href="/slate-builder"
          className="block p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[var(--text-dark)] group-hover:text-blue-600 transition-colors flex items-center gap-2">
                Slate Builder
                <BoltIcon className="h-4 w-4 text-amber-500" />
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Build an optimized betting portfolio in one click. We analyze value bets and size positions based on your bankroll and risk tolerance.
              </p>
              <span className="inline-block mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                Open Slate Builder →
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* Getting started / How-tos */}
      <GettingStartedSection />
    </div>
  );
}
