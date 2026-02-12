import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPolymarketPositions } from "@/lib/api-clients/polymarket-data-api";
import { polymarketDataPositionsToABEPositions } from "@/lib/abe";

/**
 * GET /api/polymarket/positions — fetch current user's positions from Polymarket Data API (requires connected wallet).
 * Returns { positions: ABEPosition[] } or error.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await prisma.polymarketConnection.findUnique({
    where: { userId: session.user.id },
  });

  if (!conn) {
    return Response.json(
      {
        error:
          "Polymarket not connected. Add your wallet in Settings.",
      },
      { status: 400 }
    );
  }

  try {
    const dataPositions = await getPolymarketPositions(conn.walletAddress, {
      limit: 500,
    });
    const positions = polymarketDataPositionsToABEPositions(dataPositions);

    return Response.json({
      positions,
      raw: dataPositions,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Polymarket API error";
    console.error("[polymarket/positions]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
