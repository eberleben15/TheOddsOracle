import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/kalshi/status — whether the current user has Kalshi connected (no credentials returned).
 * When user has no connection, we report connected: true so the UI shows demo portfolio as "connected".
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ signedIn: false, connected: false });
  }

  const conn = await prisma.kalshiConnection.findUnique({
    where: { userId: session.user.id },
    select: { apiKeyId: true },
  });

  const polymarketConn = await prisma.polymarketConnection.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  // No connections at all: demo mode — report both connected so UI shows demo portfolio as if connected.
  const connected = !!conn || (!conn && !polymarketConn);

  return Response.json({
    signedIn: true,
    connected,
    apiKeyIdMasked: conn?.apiKeyId
      ? `${conn.apiKeyId.slice(0, 8)}…${conn.apiKeyId.slice(-4)}`
      : undefined,
  });
}
