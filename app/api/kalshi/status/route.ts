import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/kalshi/status — whether the current user has Kalshi connected (no credentials returned).
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

  return Response.json({
    signedIn: true,
    connected: !!conn,
    apiKeyIdMasked: conn?.apiKeyId
      ? `${conn.apiKeyId.slice(0, 8)}…${conn.apiKeyId.slice(-4)}`
      : undefined,
  });
}
