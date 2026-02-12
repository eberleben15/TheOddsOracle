"use client";

import { StatusCard } from "@/components/StatusCard";
import { DashboardWelcome } from "./_components/DashboardWelcome";
import { DashboardStatsStrip } from "./_components/DashboardStatsStrip";
import { OpenBetsSection } from "./_components/OpenBetsSection";
import { ActionFlowsSection } from "./_components/ActionFlowsSection";
import { RecommendedBetsSection } from "./_components/RecommendedBetsSection";
import { GamesSection } from "./_components/GamesSection";
import { OddsGame, LiveGame } from "@/types";
import { Sport } from "@/lib/sports/sport-config";

interface DashboardClientProps {
  liveGames: LiveGame[];
  upcomingGames: OddsGame[];
  error: string | null;
  sport: Sport;
  teamLogos?: Record<string, string>;
}

export function DashboardClient({ liveGames, upcomingGames, error, sport, teamLogos }: DashboardClientProps) {
  if (error) {
    return (
      <StatusCard
        type="error"
        message={`${error}. Please check your API keys in .env.local`}
      />
    );
  }

  return (
    <>
      <DashboardWelcome />
      <DashboardStatsStrip liveCount={liveGames.length} upcomingCount={upcomingGames.length} />
      <OpenBetsSection />
      <ActionFlowsSection />

      {/* Value / Recommended Bets */}
      <section className="mb-8" id="value-bets">
        <RecommendedBetsSection />
      </section>

      {/* Today's games — one sport preview on home */}
      <GamesSection
        liveGames={liveGames}
        upcomingGames={upcomingGames}
        sport={sport}
        teamLogos={teamLogos}
        compact
      />
    </>
  );
}

