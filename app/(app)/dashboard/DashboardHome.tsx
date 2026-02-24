"use client";

import Link from "next/link";
import { DashboardWelcome } from "./_components/DashboardWelcome";
import { DashboardStatsStrip } from "./_components/DashboardStatsStrip";
import { GamesSection } from "./_components/GamesSection";
import { DashboardPortfolioSection } from "./_components/DashboardPortfolioSection";
import { ActionFlowsSection } from "./_components/ActionFlowsSection";
import { RecommendedBetsSection } from "./_components/RecommendedBetsSection";
import { GettingStartedSection } from "./_components/GettingStartedSection";
import { OpenBetsSection } from "./_components/OpenBetsSection";
import type { OddsGame, LiveGame } from "@/types";
import type { Sport } from "@/lib/sports/sport-config";

export interface DashboardHomeProps {
  isAdmin: boolean;
  liveCount?: number;
  upcomingCount?: number;
  liveGames?: LiveGame[];
  upcomingGames?: OddsGame[];
  sport?: Sport;
  teamLogos?: Record<string, string>;
  gamesError?: string | null;
}

export function DashboardHome({
  isAdmin,
  liveCount = 0,
  upcomingCount = 0,
  liveGames = [],
  upcomingGames = [],
  sport = "cbb",
  teamLogos,
  gamesError,
}: DashboardHomeProps) {
  return (
    <div className="max-w-5xl mx-auto">
      {/* Header: welcome + admin */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
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

      {/* At-a-glance stats */}
      <DashboardStatsStrip liveCount={liveCount} upcomingCount={upcomingCount} />

      {/* Today's games (CBB) */}
      <section className="mb-8">
        {gamesError ? (
          <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-3">
            {gamesError}. <Link href={`/sports/${sport}`} className="underline">Open Sports</Link> to try again.
          </p>
        ) : (
          <GamesSection
            liveGames={liveGames}
            upcomingGames={upcomingGames}
            sport={sport}
            teamLogos={teamLogos}
            compact
            rightHeaderAction={
              <Link
                href={`/sports/${sport}`}
                className="text-sm font-medium text-primary hover:underline shrink-0"
              >
                View all in Sports →
              </Link>
            }
          />
        )}
      </section>

      {/* Portfolio summary */}
      <DashboardPortfolioSection />

      {/* Quick actions */}
      <ActionFlowsSection />

      {/* Value / recommended bets (anchor for /dashboard#value-bets) */}
      <section className="mb-8" id="value-bets">
        <h2 className="text-lg font-semibold text-text-dark mb-4">Value bets</h2>
        <RecommendedBetsSection />
      </section>

      {/* Getting started / How-tos */}
      <GettingStartedSection />

      <OpenBetsSection />
    </div>
  );
}
