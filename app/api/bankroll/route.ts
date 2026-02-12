import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { decryptKalshiPrivateKey } from "@/lib/kalshi-credentials";
import { getPolymarketPositions } from "@/lib/api-clients/polymarket-data-api";
import {
  kalshiMarketPositionsToABEPositions,
  polymarketDataPositionsToABEPositions,
} from "@/lib/abe";
import { buildBankrollSummary } from "@/lib/abe/bankroll-engine";
import { isAdmin } from "@/lib/admin-utils";
import { getDemoPortfolio } from "@/data/demo-portfolio";
import type { ABEPosition, RiskProfile } from "@/types/abe";

const VALID_RISK_PROFILES: RiskProfile[] = ["conservative", "moderate", "aggressive"];

export const dynamic = "force-dynamic";

/**
 * GET /api/bankroll
 * Query: ?demo=1 — when admin, use demo portfolio for summary (multi-tenant safe).
 * Returns BankrollSummary from stored settings + current (or demo) positions.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const useDemo =
    request.nextUrl.searchParams.get("demo") === "1" && (await isAdmin());
  let positions: ABEPosition[] = [];

  if (useDemo) {
    const demo = getDemoPortfolio();
    positions = demo.positions;
  } else {
    const [kalshiConn, polymarketConn] = await Promise.all([
      prisma.kalshiConnection.findUnique({ where: { userId: session.user.id } }),
      prisma.polymarketConnection.findUnique({ where: { userId: session.user.id } }),
    ]);
    if (kalshiConn) {
      try {
        const privateKeyPem = decryptKalshiPrivateKey(kalshiConn.privateKeyEncrypted);
        const client = getKalshiClient();
        const res = await client.getPositions({
          apiKeyId: kalshiConn.apiKeyId,
          privateKeyPem,
        });
        positions.push(
          ...kalshiMarketPositionsToABEPositions(res.market_positions ?? [])
        );
      } catch (e) {
        console.error("[bankroll] Kalshi fetch failed", e);
      }
    }
    if (polymarketConn) {
      try {
        const dataPositions = await getPolymarketPositions(
          polymarketConn.walletAddress,
          { limit: 500 }
        );
        positions.push(...polymarketDataPositionsToABEPositions(dataPositions));
      } catch (e) {
        console.error("[bankroll] Polymarket fetch failed", e);
      }
    }
  }

  const settings = await prisma.userBankrollSettings.findUnique({
    where: { userId: session.user.id },
  });

  const summary = buildBankrollSummary(
    settings
      ? {
          bankrollUsd: settings.bankrollUsd,
          kellyFraction: settings.kellyFraction,
          riskProfile: settings.riskProfile as RiskProfile | null,
        }
      : null,
    positions,
    { isDemo: useDemo }
  );

  return Response.json(summary);
}

/**
 * PATCH /api/bankroll
 * Body: { bankrollUsd?: number, kellyFraction?: number }
 * Upserts user bankroll settings (multi-tenant: per userId).
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { bankrollUsd?: number; kellyFraction?: number; riskProfile?: RiskProfile | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json(
      { error: "Invalid JSON. Expected { bankrollUsd?, kellyFraction?, riskProfile? }" },
      { status: 400 }
    );
  }

  const bankrollUsd = body.bankrollUsd;
  const kellyFraction = body.kellyFraction;
  const riskProfile = body.riskProfile;

  if (bankrollUsd !== undefined && (typeof bankrollUsd !== "number" || bankrollUsd < 0)) {
    return Response.json(
      { error: "bankrollUsd must be a non-negative number" },
      { status: 400 }
    );
  }
  if (
    kellyFraction !== undefined &&
    (typeof kellyFraction !== "number" || kellyFraction <= 0 || kellyFraction > 1)
  ) {
    return Response.json(
      { error: "kellyFraction must be in (0, 1]" },
      { status: 400 }
    );
  }
  if (
    riskProfile !== undefined &&
    riskProfile !== null &&
    !VALID_RISK_PROFILES.includes(riskProfile)
  ) {
    return Response.json(
      { error: "riskProfile must be conservative, moderate, or aggressive" },
      { status: 400 }
    );
  }

  const updated = await prisma.userBankrollSettings.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      bankrollUsd: bankrollUsd ?? 0,
      kellyFraction: kellyFraction ?? 0.25,
      riskProfile: riskProfile ?? null,
    },
    update: {
      ...(bankrollUsd !== undefined && { bankrollUsd }),
      ...(kellyFraction !== undefined && { kellyFraction }),
      ...(riskProfile !== undefined && { riskProfile: riskProfile ?? null }),
    },
  });

  return Response.json({
    bankrollUsd: updated.bankrollUsd,
    kellyFraction: updated.kellyFraction,
    riskProfile: updated.riskProfile,
  });
}
