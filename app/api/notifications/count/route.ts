import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/count
 * Returns unread notification count for the header badge.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ unreadCount: 0 }, { status: 200 });
  }
  const unreadCount = await prisma.aBENotification.count({
    where: { userId: session.user.id, read: false },
  });
  return Response.json({ unreadCount });
}
