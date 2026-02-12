import { requireAdmin } from "@/lib/admin-utils";

export const dynamic = "force-dynamic";

/** Env vars we expose to admin (name only; value is set/not set or masked). */
const ENV_KEYS = [
  { key: "NEXTAUTH_URL", label: "NextAuth URL", secret: false },
  { key: "NEXTAUTH_SECRET", label: "NextAuth secret", secret: true },
  { key: "DATABASE_URL", label: "Database URL", secret: true },
  { key: "ADMIN_EMAIL", label: "Admin email", secret: false },
  { key: "THE_ODDS_API_KEY", label: "The Odds API", secret: true },
  { key: "SPORTSDATA_API_KEY", label: "SportsData API", secret: true },
  { key: "STRIPE_SECRET_KEY", label: "Stripe secret", secret: true },
  { key: "STRIPE_WEBHOOK_SECRET", label: "Stripe webhook", secret: true },
  { key: "STRIPE_PRICE_PREMIUM", label: "Stripe price (Premium)", secret: false },
  { key: "STRIPE_PRICE_PRO", label: "Stripe price (Pro)", secret: false },
  { key: "GOOGLE_CLIENT_ID", label: "Google OAuth client ID", secret: false },
  { key: "GOOGLE_CLIENT_SECRET", label: "Google OAuth secret", secret: true },
  { key: "KALSHI_CREDENTIALS_ENCRYPTION_KEY", label: "Kalshi encryption key", secret: true },
  { key: "CRON_SECRET", label: "Cron secret", secret: true },
  { key: "MCP_SERVER_URL", label: "MCP server URL", secret: false },
] as const;

function mask(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

/**
 * GET /api/admin/env-status
 * Returns which env vars are set (and optionally masked value). Admin only.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  const status = ENV_KEYS.map(({ key, label, secret }) => {
    const value = process.env[key];
    const set = !!value;
    return {
      key,
      label,
      set,
      masked: set && secret ? mask(value!) : set ? value : null,
    };
  });

  return Response.json({ status });
}
