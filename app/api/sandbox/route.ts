import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ABEPosition, ABEContract } from "@/types/abe";

export const dynamic = "force-dynamic";

const MAX_POSITIONS = 500;
const MAX_CONTRACTS = 1000;

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
 * GET /api/sandbox — return current user's sandbox (positions + optional contracts).
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sandbox = await prisma.sandboxPortfolio.findUnique({
      where: { userId: session.user.id },
    });

    if (sandbox) {
      return Response.json({
        positions: (sandbox.positions as unknown as ABEPosition[]) ?? [],
        contracts: sandbox.contracts as unknown as ABEContract[] | undefined,
        updatedAt: sandbox.updatedAt.toISOString(),
      });
    }

    return Response.json({
      positions: [],
      contracts: undefined,
      updatedAt: null,
    });
  } catch (err) {
    console.error("[GET /api/sandbox]", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Sandbox fetch failed", details: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sandbox — replace entire sandbox.
 * Body: { positions: ABEPosition[], contracts?: ABEContract[] }
 */
export async function POST(request: NextRequest) {
  try {
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

    const positions = body.positions ?? [];
    if (!Array.isArray(positions)) {
      return Response.json({ error: "positions must be an array" }, { status: 400 });
    }
    if (positions.length > MAX_POSITIONS) {
      return Response.json(
        { error: `positions array exceeds maximum of ${MAX_POSITIONS}` },
        { status: 400 }
      );
    }
    const contracts = body.contracts;
    if (contracts !== undefined && (!Array.isArray(contracts) || contracts.length > MAX_CONTRACTS)) {
      return Response.json(
        { error: `contracts must be an array with at most ${MAX_CONTRACTS} items` },
        { status: 400 }
      );
    }
    const filtered = positions.filter(isValidPosition);
    if (filtered.length !== positions.length) {
      return Response.json(
        {
          error:
            "Each position must have contractId (string), side (yes|no), size (number), costPerShare (number 0-1)",
        },
        { status: 400 }
      );
    }

    const positionsJson = JSON.parse(JSON.stringify(filtered));
    const contractsJson = contracts ? JSON.parse(JSON.stringify(contracts)) : undefined;

    await prisma.sandboxPortfolio.upsert({
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
  } catch (err) {
    console.error("[POST /api/sandbox]", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json(
      { error: "Sandbox update failed", details: process.env.NODE_ENV === "development" ? message : undefined },
      { status: 500 }
    );
  }
}
