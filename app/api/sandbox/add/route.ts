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
 * POST /api/sandbox/add — append positions (and optional contracts) to sandbox.
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

  const toAdd = body.positions ?? [];
  if (!Array.isArray(toAdd) || toAdd.length === 0) {
    return Response.json({ error: "positions must be a non-empty array" }, { status: 400 });
  }
  const toAddContracts = body.contracts ?? [];
  const filtered = toAdd.filter(isValidPosition);
  if (filtered.length !== toAdd.length) {
    return Response.json(
      {
        error:
          "Each position must have contractId (string), side (yes|no), size (number), costPerShare (number 0-1)",
      },
      { status: 400 }
    );
  }

  const existing = await prisma.sandboxPortfolio.findUnique({
    where: { userId: session.user.id },
  });

  const existingPositions = (existing?.positions as unknown as ABEPosition[]) ?? [];
  const existingContracts = (existing?.contracts as unknown as ABEContract[] | undefined) ?? [];
  const contractIds = new Set(existingContracts.map((c) => c.id));
  const newContracts = toAddContracts.filter((c) => c?.id && !contractIds.has(c.id));
  contractIds.clear();
  existingContracts.forEach((c) => contractIds.add(c.id));
  newContracts.forEach((c) => contractIds.add(c.id));

  const mergedPositions = [...existingPositions, ...filtered];
  const mergedContracts = [...existingContracts, ...newContracts];

  if (mergedPositions.length > MAX_POSITIONS) {
    return Response.json(
      { error: `Sandbox would exceed maximum of ${MAX_POSITIONS} positions` },
      { status: 400 }
    );
  }
  if (mergedContracts.length > MAX_CONTRACTS) {
    return Response.json(
      { error: `Sandbox would exceed maximum of ${MAX_CONTRACTS} contracts` },
      { status: 400 }
    );
  }

  const positionsJson = JSON.parse(JSON.stringify(mergedPositions));
  const contractsJson =
    mergedContracts.length > 0 ? JSON.parse(JSON.stringify(mergedContracts)) : undefined;

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
}
