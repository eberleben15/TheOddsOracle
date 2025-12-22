"use client";

import { useEffect, useState } from "react";
import { AdvancedAnalytics } from "./AdvancedAnalytics";
import { PremiumGate } from "./PremiumGate";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { TeamStats, GameResult, OddsGame } from "@/types";
import { ParsedOdds } from "@/lib/odds-utils";

interface AdvancedAnalyticsWrapperProps {
  awayTeamStats: TeamStats;
  homeTeamStats: TeamStats;
  awayRecentGames: GameResult[];
  homeRecentGames: GameResult[];
  odds?: {
    moneyline?: { away: number; home: number };
    spread?: number;
  };
  game?: OddsGame;
  parsedOdds?: ParsedOdds[];
}

export function AdvancedAnalyticsWrapper(props: AdvancedAnalyticsWrapperProps) {
  const [isUserPremium, setIsUserPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPremium() {
      try {
        const response = await fetch("/api/premium/check");
        const data = await response.json();
        setIsUserPremium(data.isPremium || false);
      } catch (error) {
        console.error("Error checking premium status:", error);
        setIsUserPremium(false);
      } finally {
        setLoading(false);
      }
    }
    checkPremium();
  }, []);

  if (loading) {
    return <LoadingSkeleton type="matchup" count={1} />;
  }

  if (!isUserPremium) {
    return <PremiumGate feature="predictions" />;
  }

  return <AdvancedAnalytics {...props} />;
}

