"use client";

import Link from "next/link";
import { StatusCard } from "@/components/StatusCard";
import { GamesSection } from "@/app/(app)/dashboard/_components/GamesSection";
import { SportsRecommendedBetsCollapsible } from "./_components/SportsRecommendedBetsCollapsible";
import { OddsGame, LiveGame } from "@/types";
import { Sport } from "@/lib/sports/sport-config";

interface SportsClientProps {
  liveGames: LiveGame[];
  upcomingGames: OddsGame[];
  error: string | null;
  sport: Sport;
  teamLogos?: Record<string, string>;
}

export function SportsClient({ liveGames, upcomingGames, error, sport, teamLogos }: SportsClientProps) {
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
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Dashboard
        </Link>
      </div>

      <SportsRecommendedBetsCollapsible sport={sport} />

      <GamesSection
        liveGames={liveGames}
        upcomingGames={upcomingGames}
        sport={sport}
        teamLogos={teamLogos}
        compact={false}
      />
    </>
  );
}
