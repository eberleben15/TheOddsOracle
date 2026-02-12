import { requireAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/billing
 * Subscription counts and Stripe config status. Admin only.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const [byStatus, totalUsers] = await Promise.all([
    prisma.subscription.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.user.count(),
  ]);

  const premium = byStatus.find((s) => s.status === "PREMIUM")?._count ?? 0;
  const pro = byStatus.find((s) => s.status === "PRO")?._count ?? 0;
  const cancelled = byStatus.find((s) => s.status === "CANCELLED")?._count ?? 0;
  const totalWithSubscription = byStatus.reduce((sum, s) => sum + s._count, 0);
  const free = totalUsers - totalWithSubscription;
  const other = byStatus
    .filter((s) => !["FREE", "PREMIUM", "PRO", "CANCELLED"].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0);

  return Response.json({
    stripeConfigured: !!(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_PREMIUM &&
      process.env.STRIPE_PRICE_PRO
    ),
    counts: {
      totalUsers,
      free,
      premium,
      pro,
      cancelled,
      other,
    },
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
  });
}
