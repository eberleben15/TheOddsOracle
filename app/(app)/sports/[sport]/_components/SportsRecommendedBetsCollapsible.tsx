"use client";

import { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronRightIcon, FireIcon } from "@heroicons/react/24/outline";
import { Card, CardBody } from "@nextui-org/react";
import { RecommendedBets } from "@/components/RecommendedBets";
import { PremiumGate } from "@/components/PremiumGate";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import type { RecommendedBet } from "@/types";
import type { Sport } from "@/lib/sports/sport-config";
import { getSportConfig } from "@/lib/sports/sport-config";

interface SportsRecommendedBetsCollapsibleProps {
  sport: Sport;
}

const SPORTS_WITH_RECOMMENDATIONS: Sport[] = ["cbb", "nba", "nhl"];

export function SportsRecommendedBetsCollapsible({ sport }: SportsRecommendedBetsCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);
  const [bets, setBets] = useState<RecommendedBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserPremium, setIsUserPremium] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const config = getSportConfig(sport);
  const displayName = config?.displayName ?? sport.toUpperCase();

  useEffect(() => {
    if (!SPORTS_WITH_RECOMMENDATIONS.includes(sport)) {
      setLoading(false);
      return;
    }
    async function checkPremiumAndFetch() {
      try {
        const premiumResponse = await fetch("/api/premium/check");
        const premiumData = await premiumResponse.json();
        const premium = premiumData.isPremium || false;
        setIsUserPremium(premium);

        if (!premium) {
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/recommended-bets?sport=${sport}`);
        if (!response.ok) throw new Error("Failed to fetch recommended bets");
        const data = await response.json();
        setBets(data.bets || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching recommended bets:", err);
        setError(err instanceof Error ? err.message : "Failed to load");
        setBets([]);
      } finally {
        setLoading(false);
      }
    }
    checkPremiumAndFetch();
  }, [sport]);

  if (!SPORTS_WITH_RECOMMENDATIONS.includes(sport)) {
    return null;
  }

  if (loading || isUserPremium === null) {
    return (
      <div className="mb-6">
        <LoadingSkeleton type="card" count={1} />
      </div>
    );
  }

  if (!isUserPremium) {
    return (
      <div className="mb-6">
        <Card
          className="overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors"
          classNames={{ base: "bg-gradient-to-br from-amber-50/80 to-orange-50/80" }}
        >
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-white/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              {expanded ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
              )}
              <FireIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="font-semibold text-gray-900">
                Top Recommended {displayName} Bets
              </span>
              <span className="text-sm text-amber-600 font-medium">Premium</span>
            </div>
          </button>
          {expanded && (
            <CardBody className="pt-0 px-4 pb-4 border-t border-amber-200">
              <PremiumGate feature="recommended_bets" />
            </CardBody>
          )}
        </Card>
      </div>
    );
  }

  if (error) return null;

  const betCount = bets.length;
  const bestEdge = bets[0]?.edge;

  return (
    <div className="mb-6">
      <Card
        className="overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors"
        classNames={{ base: "bg-gradient-to-br from-red-50/80 to-orange-50/80" }}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-white/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
            )}
            <FireIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <span className="font-semibold text-gray-900">
                Top Recommended {displayName} Bets
              </span>
              {betCount > 0 && (
                <span className="ml-2 text-sm text-gray-600">
                  — {betCount} {betCount === 1 ? "opportunity" : "opportunities"}
                  {bestEdge != null && (
                    <span className="ml-1 font-medium text-red-600">
                      (best edge {bestEdge.toFixed(1)}%)
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </button>
        {expanded && (
          <CardBody className="pt-4 px-4 pb-4 border-t border-red-100">
            <RecommendedBets bets={bets} />
          </CardBody>
        )}
      </Card>
    </div>
  );
}
