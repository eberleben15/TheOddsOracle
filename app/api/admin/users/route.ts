import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * GET /api/admin/users
 * List users with optional pagination. Admin only.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10))
  );
  const search = searchParams.get("search")?.trim() ?? "";

  const skip = (page - 1) * pageSize;

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        subscription: {
          select: { status: true, stripeCurrentPeriodEnd: true },
        },
        _count: {
          select: {
            sessions: true,
            accounts: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return Response.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      emailVerified: u.emailVerified?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      subscriptionStatus: u.subscription?.status ?? null,
      stripeCurrentPeriodEnd: u.subscription?.stripeCurrentPeriodEnd?.toISOString() ?? null,
      sessionsCount: u._count.sessions,
      accountsCount: u._count.accounts,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
