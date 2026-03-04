"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RecommendedBets } from "@/components/RecommendedBets";
import { getSportConfig } from "@/lib/sports/sport-config";
import type { Sport } from "@/lib/sports/sport-config";

const VALUE_BET_SPORTS: Sport[] = ["cbb", "nba", "nhl", "mlb"];
import type { RecommendedBet } from "@/types";
import { PremiumGate } from "@/components/PremiumGate";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

export function RecommendedBetsSection() {
  const searchParams = useSearchParams();
  const sport = searchParams?.get("sport") || "cbb";
  const [bets, setBets] = useState<RecommendedBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserPremium, setIsUserPremium] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkPremiumAndFetch() {
      try {
        // Check premium status first
        const premiumResponse = await fetch("/api/premium/check");
        const premiumData = await premiumResponse.json();
        const premium = premiumData.isPremium || false;
        setIsUserPremium(premium);

        if (!premium) {
          setLoading(false);
          return;
        }

        // Fetch recommended bets if premium

        setLoading(true);
        const response = await fetch(`/api/recommended-bets?sport=${sport}`);

        if (!response.ok) {
          throw new Error("Failed to fetch recommended bets");
        }

        const data = await response.json();
        setBets(data.bets || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching recommended bets:", err);
        setError(err instanceof Error ? err.message : "Failed to load recommended bets");
        setBets([]);
      } finally {
        setLoading(false);
      }
    }

    checkPremiumAndFetch();

    // Refresh every 5 minutes
    const interval = setInterval(checkPremiumAndFetch, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [sport]); // Re-fetch when sport changes

  if (loading || isUserPremium === null) {
    return (
      <div className="mb-8">
        <LoadingSkeleton type="card" count={1} />
      </div>
    );
  }

  if (!isUserPremium) {
    return (
      <div className="mb-8">
        <PremiumGate feature="recommended_bets" />
      </div>
    );
  }

  if (error) {
    // Silently fail - don't show error to user, just don't render the section
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {VALUE_BET_SPORTS.map((s) => (
          <Link
            key={s}
            href={`/dashboard?sport=${s}#value-bets`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sport === s
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {getSportConfig(s).displayName}
          </Link>
        ))}
      </div>
      <RecommendedBets bets={bets} sport={sport} />
    </div>
  );
}
