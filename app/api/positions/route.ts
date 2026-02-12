import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { decryptKalshiPrivateKey } from "@/lib/kalshi-credentials";
import { getPolymarketPositions } from "@/lib/api-clients/polymarket-data-api";
import { kalshiMarketPositionsToABEPositions, polymarketDataPositionsToABEPositions } from "@/lib/abe";
import type { ABEPosition } from "@/types/abe";

/**
 * GET /api/positions — merged positions from Kalshi (if connected) and Polymarket (if connected).
 * Returns { positions, kalshiConnected, polymarketConnected }.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json(
      { positions: [], kalshiConnected: false, polymarketConnected: false },
      { status: 200 }
    );
  }

  const positions: ABEPosition[] = [];
  let kalshiConnected = false;
  let polymarketConnected = false;

  const [kalshiConn, polymarketConn] = await Promise.all([
    prisma.kalshiConnection.findUnique({ where: { userId: session.user.id } }),
    prisma.polymarketConnection.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (kalshiConn) {
    kalshiConnected = true;
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
      console.error("[positions] Kalshi fetch failed", e);
    }
  }

  if (polymarketConn) {
    polymarketConnected = true;
    try {
      const dataPositions = await getPolymarketPositions(polymarketConn.walletAddress, {
        limit: 500,
      });
      positions.push(...polymarketDataPositionsToABEPositions(dataPositions));
    } catch (e) {
      console.error("[positions] Polymarket fetch failed", e);
    }
  }

  return Response.json({
    positions,
    kalshiConnected,
    polymarketConnected,
  });
}
