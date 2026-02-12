import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/polymarket/status — whether the current user has Polymarket connected.
 * When user has no connection, we report connected: true so the UI shows demo portfolio as "connected".
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ signedIn: false, connected: false });
  }

  const conn = await prisma.polymarketConnection.findUnique({
    where: { userId: session.user.id },
    select: { walletAddress: true },
  });

  const kalshiConn = await prisma.kalshiConnection.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  // No connections at all: demo mode — report both connected so UI shows demo portfolio as if connected.
  const connected = !!conn || (!conn && !kalshiConn);

  const address = conn?.walletAddress;
  const masked = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : undefined;

  return Response.json({
    signedIn: true,
    connected,
    walletAddressMasked: masked,
  });
}
