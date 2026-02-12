import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptKalshiPrivateKey } from "@/lib/kalshi-credentials";
import { getKalshiClient } from "@/lib/api-clients/kalshi-client";
import { kalshiMarketPositionsToABEPositions } from "@/lib/abe";

/**
 * GET /api/kalshi/positions — fetch current user's active positions from Kalshi (requires connected account).
 * Returns { positions: ABEPosition[], settlements?: KalshiSettlement[] } or error.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conn = await prisma.kalshiConnection.findUnique({
    where: { userId: session.user.id },
  });

  if (!conn) {
    return Response.json(
      { error: "Kalshi not connected. Connect your Kalshi API keys in Settings." },
      { status: 400 }
    );
  }

  let privateKeyPem: string;
  try {
    privateKeyPem = decryptKalshiPrivateKey(conn.privateKeyEncrypted);
  } catch (e) {
    console.error("[kalshi/positions] Decrypt failed", e);
    return Response.json(
      { error: "Failed to decrypt credentials. Reconnect your Kalshi account." },
      { status: 500 }
    );
  }

  const credentials = {
    apiKeyId: conn.apiKeyId,
    privateKeyPem,
  };

  const client = getKalshiClient();

  try {
    const [positionsRes, settlementsRes] = await Promise.all([
      client.getPositions(credentials),
      client.getSettlements(credentials, { limit: 100 }).catch(() => null),
    ]);

    const positions = kalshiMarketPositionsToABEPositions(
      positionsRes.market_positions ?? []
    );

    return Response.json({
      positions,
      settlements: settlementsRes?.settlements ?? [],
      market_positions_raw: positionsRes.market_positions,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Kalshi API error";
    console.error("[kalshi/positions]", message);
    if (message.includes("401")) {
      return Response.json(
        { error: "Invalid Kalshi API keys. Reconnect your account." },
        { status: 400 }
      );
    }
    return Response.json({ error: message }, { status: 500 });
  }
}
