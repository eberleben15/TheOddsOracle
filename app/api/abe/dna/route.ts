import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildBettingDNA,
  computeEdgeAccuracyFromPredictions,
} from "@/lib/abe/dna-engine";
import type { BettingDNA } from "@/types/abe";

export const dynamic = "force-dynamic";

/**
 * GET /api/abe/dna
 * Returns the current user's Betting DNA (risk profile, preferences, edge summary, comparison).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [bankrollSettings, bettingProfile, predictions] = await Promise.all([
    prisma.userBankrollSettings.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.userBettingProfile.findUnique({
      where: { userId: session.user.id },
    }),
    prisma.prediction.findMany({
      where: { validated: true },
      select: { winProbability: true, actualWinner: true },
      take: 500,
      orderBy: { date: "desc" },
    }),
  ]);
  const edgeSummary = computeEdgeAccuracyFromPredictions(predictions);
  const profile = {
    preferredMarkets: Array.isArray(bettingProfile?.preferredMarkets)
      ? (bettingProfile.preferredMarkets as string[])
      : [],
    preferredSports: Array.isArray(bettingProfile?.preferredSports)
      ? (bettingProfile.preferredSports as string[])
      : [],
  };
  const dna: BettingDNA = buildBettingDNA(
    bankrollSettings
      ? {
          kellyFraction: bankrollSettings.kellyFraction,
          riskProfile: bankrollSettings.riskProfile,
        }
      : null,
    profile,
    edgeSummary
  );
  return Response.json(dna);
}
