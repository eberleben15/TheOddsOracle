"use client";

import Link from "next/link";
import { DashboardWelcome } from "./_components/DashboardWelcome";
import { DashboardStatsStrip } from "./_components/DashboardStatsStrip";
import { DashboardPortfolioSection } from "./_components/DashboardPortfolioSection";
import { ActionFlowsSection } from "./_components/ActionFlowsSection";
import { GettingStartedSection } from "./_components/GettingStartedSection";
import { OpenBetsSection } from "./_components/OpenBetsSection";

export interface DashboardHomeProps {
  isAdmin: boolean;
}

export function DashboardHome({ isAdmin }: DashboardHomeProps) {
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
      <DashboardStatsStrip />

      {/* Portfolio summary */}
      <DashboardPortfolioSection />

      {/* Quick actions */}
      <ActionFlowsSection />

      {/* Getting started / How-tos */}
      <GettingStartedSection />

      <OpenBetsSection />
    </div>
  );
}
