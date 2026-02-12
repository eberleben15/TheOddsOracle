import { requireAdmin } from "@/lib/admin-utils";
import { getDemoPortfolio } from "@/data/demo-portfolio";

export const dynamic = "force-dynamic";

/**
 * GET /api/demo-portfolio
 * Admin only. Returns demo positions + contracts for testing/visualization.
 * Multi-tenant: only admin can call; data is static, not tied to any real user.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const { positions, contracts } = getDemoPortfolio();
  return Response.json({ positions, contracts });
}
