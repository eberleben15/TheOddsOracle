import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ABENotification } from "@/types/abe";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Query: ?limit=20&unreadOnly=0
 * List user's notifications (newest first).
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 20));
  const unreadOnly = request.nextUrl.searchParams.get("unreadOnly") === "1";

  const where = { userId: session.user.id, ...(unreadOnly ? { read: false } : {}) };
  const rows = await prisma.aBENotification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const notifications: ABENotification[] = rows.map((n: { id: string; ruleId: string | null; title: string; body: string; read: boolean; createdAt: Date }) => ({
    id: n.id,
    ruleId: n.ruleId ?? undefined,
    ruleName: null,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));
  return Response.json({ notifications });
}

/**
 * PATCH /api/notifications
 * Body: { read?: boolean, notificationIds?: string[] }
 * Mark as read: if notificationIds provided, mark those; else mark all for user.
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { read?: boolean; notificationIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const read = body.read === true;
  const ids = body.notificationIds;
  const where = { userId: session.user.id, ...(Array.isArray(ids) && ids.length > 0 ? { id: { in: ids } } : {}) };
  await prisma.aBENotification.updateMany({
    where,
    data: { read },
  });
  return Response.json({ ok: true });
}
