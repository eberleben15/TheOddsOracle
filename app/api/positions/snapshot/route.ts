import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ABEPosition, ABEContract } from "@/types/abe";

export const dynamic = "force-dynamic";

const MAX_POSITIONS = 2000;
const MAX_CONTRACTS = 5000;

function isValidPosition(x: unknown): x is ABEPosition {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.contractId === "string" &&
    (p.side === "yes" || p.side === "no") &&
    typeof p.size === "number" &&
    Number.isFinite(p.size) &&
    p.size >= 0 &&
    typeof p.costPerShare === "number" &&
    Number.isFinite(p.costPerShare) &&
    p.costPerShare >= 0 &&
    p.costPerShare <= 1
  );
}

/**
 * GET /api/positions/snapshot — return the current user's last saved portfolio snapshot (positions + optional contracts).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await prisma.portfolioSnapshot.findUnique({
    where: { userId: session.user.id },
  });

  if (!snapshot) {
    return Response.json({
      positions: [],
      contracts: undefined,
      fetchedAt: null,
    });
  }

  return Response.json({
    positions: (snapshot.positions as unknown as ABEPosition[]) ?? [],
    contracts: snapshot.contracts as unknown as ABEContract[] | undefined,
    fetchedAt: snapshot.fetchedAt.toISOString(),
  });
}

/**
 * POST /api/positions/snapshot — save the current user's portfolio snapshot (positions + optional contracts).
 * Body: { positions: ABEPosition[], contracts?: ABEContract[] }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { positions: ABEPosition[]; contracts?: ABEContract[] };
  try {
    body = (await request.json()) as { positions: ABEPosition[]; contracts?: ABEContract[] };
  } catch {
    return Response.json(
      { error: "Invalid JSON. Expected { positions: ABEPosition[] }" },
      { status: 400 }
    );
  }

  const positions = body.positions;
  if (!Array.isArray(positions)) {
    return Response.json({ error: "positions must be an array" }, { status: 400 });
  }
  if (positions.length > MAX_POSITIONS) {
    return Response.json(
      { error: `positions array exceeds maximum of ${MAX_POSITIONS}` },
      { status: 400 }
    );
  }
  if (body.contracts && (!Array.isArray(body.contracts) || body.contracts.length > MAX_CONTRACTS)) {
    return Response.json(
      { error: `contracts must be an array with at most ${MAX_CONTRACTS} items` },
      { status: 400 }
    );
  }
  const filtered = positions.filter(isValidPosition);
  if (filtered.length !== positions.length) {
    return Response.json(
      { error: "Each position must have contractId (string), side (yes|no), size (number), costPerShare (number 0-1)" },
      { status: 400 }
    );
  }

  const positionsJson = JSON.parse(JSON.stringify(filtered));
  const contractsJson = body.contracts ? JSON.parse(JSON.stringify(body.contracts)) : undefined;

  await prisma.portfolioSnapshot.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      positions: positionsJson,
      contracts: contractsJson,
    },
    update: {
      positions: positionsJson,
      contracts: contractsJson,
    },
  });

  return Response.json({ ok: true });
}
