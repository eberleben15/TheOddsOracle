/**
 * POST /api/abe/decision-engine
 *
 * Build a slate: given a sport (or explicit candidates), return selected positions + sizes
 * using the decision engine (greedy optimizer by default). Uses user's bankroll settings.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  recommendedBetsToCandidates,
  kalshiMarketsToCandidates,
  polymarketEventsToCandidates,
  runDecisionEngine,
} from "@/lib/abe";
import { getRecommendedBets } from "@/lib/recommended-bets-aggregator";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { getPolymarketClient } from "@/lib/api-clients/polymarket-client";
import type { Sport } from "@/lib/sports/sport-config";
import { getAllSports } from "@/lib/sports/sport-config";
import type { DecisionEngineConstraints, CandidateBet } from "@/lib/abe/decision-engine-types";

export const dynamic = "force-dynamic";

type Body = {
  /** Fetch recommended bets for this sport and build candidates. */
  sport?: string;
  /** Max number of recommended (sports) bets to consider (default 25). */
  limit?: number;
  /** Include Kalshi open markets in the candidate pool (default false). */
  includeKalshi?: boolean;
  /** Include Polymarket active events in the candidate pool (default false). */
  includePolymarket?: boolean;
  /** Max Kalshi markets when includeKalshi (default 100). */
  kalshiLimit?: number;
  /** Max Polymarket events when includePolymarket (default 100). */
  polymarketLimit?: number;
  /** Override constraints (merged with user bankroll settings). */
  constraints?: Partial<DecisionEngineConstraints>;
};

const VALID_SPORTS = new Set(getAllSports());

function toSport(s: string): Sport | null {
  return VALID_SPORTS.has(s as Sport) ? (s as Sport) : null;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json(
      { error: "Invalid JSON. Expected { sport?, limit?, constraints? }" },
      { status: 400 }
    );
  }

  const sport = body.sport != null ? toSport(body.sport) : null;
  if (body.sport != null && !sport) {
    return Response.json(
      { error: `Invalid sport. Must be one of: ${[...VALID_SPORTS].join(", ")}` },
      { status: 400 }
    );
  }

  const includeKalshi = body.includeKalshi === true;
  const includePolymarket = body.includePolymarket === true;
  if (!sport && !includeKalshi && !includePolymarket) {
    return Response.json(
      { error: "Provide at least one of: sport, includeKalshi, or includePolymarket." },
      { status: 400 }
    );
  }

  const settings = await prisma.userBankrollSettings.findUnique({
    where: { userId: session.user.id },
  });

  const bankrollUsd = settings?.bankrollUsd ?? 1000;
  const kellyFraction = settings?.kellyFraction ?? 0.25;
  const maxPositionsDefault = settings?.maxPositions ?? 12;
  const maxFractionPerPositionDefault = settings?.maxFractionPerPosition ?? 0.02;
  const maxFactorFractionDefault = settings?.maxFactorFraction ?? 0.4;

  const limit = Math.min(Math.max(1, body.limit ?? 25), 100);
  const kalshiLimit = Math.min(Math.max(1, body.kalshiLimit ?? 100), 500);
  const polymarketLimit = Math.min(Math.max(1, body.polymarketLimit ?? 100), 200);

  const allCandidates: CandidateBet[] = [];
  let sportsCount = 0;
  let kalshiCount = 0;
  let polymarketCount = 0;

  if (sport) {
    const recommendedBets = await getRecommendedBets(sport, limit);
    const sportsCandidates = recommendedBetsToCandidates(recommendedBets);
    sportsCount = sportsCandidates.length;
    allCandidates.push(...sportsCandidates);
  }

  if (includeKalshi) {
    try {
      const client = getKalshiClient();
      const markets = await client.getAllOpenMarkets(kalshiLimit);
      const kalshiCandidates = kalshiMarketsToCandidates(markets);
      kalshiCount = kalshiCandidates.length;
      allCandidates.push(...kalshiCandidates);
    } catch (err) {
      console.warn("[abe/decision-engine] Kalshi fetch failed:", err);
    }
  }

  if (includePolymarket) {
    try {
      const client = getPolymarketClient();
      const events = await client.getAllActiveEvents(polymarketLimit);
      const polymarketCandidates = polymarketEventsToCandidates(events);
      polymarketCount = polymarketCandidates.length;
      allCandidates.push(...polymarketCandidates);
    } catch (err) {
      console.warn("[abe/decision-engine] Polymarket fetch failed:", err);
    }
  }

  const candidates = allCandidates;

  const constraints: DecisionEngineConstraints = {
    bankrollUsd,
    kellyFraction,
    maxFractionPerPosition: maxFractionPerPositionDefault,
    maxPositions: maxPositionsDefault,
    maxFactorFraction: maxFactorFractionDefault,
    ...body.constraints,
  };

  const result = await runDecisionEngine(candidates, constraints);

  // Attach labels for UI (from candidates we used)
  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const positionsWithLabels = result.positions.map((p) => ({
    ...p,
    label: candidateById.get(p.candidateId)?.label ?? p.candidateId,
  }));

  // Excluded list with labels for explainability ("why we skipped these")
  const excludedWithLabels =
    result.excludedReasons && Object.keys(result.excludedReasons).length > 0
      ? Object.entries(result.excludedReasons).map(([id, reason]) => ({
          id,
          label: candidateById.get(id)?.label ?? id,
          reason,
        }))
      : undefined;

  return Response.json({
    ...result,
    positions: positionsWithLabels,
    constraintsUsed: {
      bankrollUsd: constraints.bankrollUsd,
      kellyFraction: constraints.kellyFraction,
      maxPositions: constraints.maxPositions,
      maxFractionPerPosition: constraints.maxFractionPerPosition,
      maxFactorFraction: constraints.maxFactorFraction,
    },
    excludedWithLabels,
    candidateCounts: { sports: sportsCount, kalshi: kalshiCount, polymarket: polymarketCount },
  });
}
