import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * POST /api/polymarket/connect — save Polymarket wallet address for the current user.
 * Body: { walletAddress: string }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { walletAddress?: string };
  try {
    body = (await request.json()) as { walletAddress?: string };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = typeof body.walletAddress === "string" ? body.walletAddress.trim() : "";
  if (!raw) {
    return Response.json(
      { error: "walletAddress is required" },
      { status: 400 }
    );
  }

  if (!ETH_ADDRESS_REGEX.test(raw)) {
    return Response.json(
      { error: "walletAddress must be a valid Ethereum address (0x + 40 hex characters)" },
      { status: 400 }
    );
  }

  try {
    await prisma.polymarketConnection.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        walletAddress: raw,
      },
      update: { walletAddress: raw },
    });

    return Response.json({ ok: true, message: "Polymarket wallet connected" });
  } catch (e) {
    console.error("[polymarket/connect]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to save wallet" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/polymarket/connect — remove stored Polymarket wallet.
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.polymarketConnection.deleteMany({
    where: { userId: session.user.id },
  });

  return Response.json({ ok: true, message: "Polymarket disconnected" });
}
