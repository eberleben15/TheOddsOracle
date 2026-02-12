import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserBettingProfile } from "@/types/abe";

export const dynamic = "force-dynamic";

/**
 * GET /api/profile/betting
 * Returns the current user's betting profile (preferred markets/sports).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const row = await prisma.userBettingProfile.findUnique({
    where: { userId: session.user.id },
  });
  const profile: UserBettingProfile = {
    preferredMarkets: Array.isArray(row?.preferredMarkets) ? (row.preferredMarkets as string[]) : [],
    preferredSports: Array.isArray(row?.preferredSports) ? (row.preferredSports as string[]) : [],
  };
  return Response.json(profile);
}

/**
 * PATCH /api/profile/betting
 * Body: { preferredMarkets?: string[], preferredSports?: string[] }
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { preferredMarkets?: string[]; preferredSports?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const preferredMarkets = Array.isArray(body.preferredMarkets) ? body.preferredMarkets : undefined;
  const preferredSports = Array.isArray(body.preferredSports) ? body.preferredSports : undefined;
  const row = await prisma.userBettingProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      preferredMarkets: preferredMarkets ?? [],
      preferredSports: preferredSports ?? [],
    },
    update: {
      ...(preferredMarkets !== undefined && { preferredMarkets }),
      ...(preferredSports !== undefined && { preferredSports }),
    },
  });
  const profile: UserBettingProfile = {
    preferredMarkets: Array.isArray(row.preferredMarkets) ? (row.preferredMarkets as string[]) : [],
    preferredSports: Array.isArray(row.preferredSports) ? (row.preferredSports as string[]) : [],
  };
  return Response.json(profile);
}
