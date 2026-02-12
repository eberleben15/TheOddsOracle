import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/me — current session and admin flag (for client-side UI).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ user: null, admin: false });
  }
  const admin = await isAdmin();
  return Response.json({
    user: { id: session.user.id, email: session.user.email },
    admin,
  });
}
