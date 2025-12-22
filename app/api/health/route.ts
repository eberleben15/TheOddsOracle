import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Health check endpoint
 * Returns system status including database, APIs, and services
 */
export async function GET() {
  const health: {
    status: "ok" | "degraded" | "error";
    timestamp: string;
    services: {
      database: { status: string; error?: string };
      stripe: { status: string; configured: boolean };
      apis: {
        odds: { configured: boolean };
        sportsdata: { configured: boolean };
      };
    };
    uptime: number;
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "unknown" },
      stripe: {
        status: process.env.STRIPE_SECRET_KEY ? "configured" : "not_configured",
        configured: !!process.env.STRIPE_SECRET_KEY,
      },
      apis: {
        odds: {
          configured: !!process.env.THE_ODDS_API_KEY,
        },
        sportsdata: {
          configured: !!process.env.SPORTSDATA_API_KEY,
        },
      },
    },
    uptime: process.uptime(),
  };

  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.database.status = "ok";
  } catch (error) {
    health.services.database.status = "error";
    health.services.database.error =
      error instanceof Error ? error.message : String(error);
    health.status = "error";
  }

  // Determine overall status
  if (health.services.database.status === "error") {
    health.status = "error";
  } else if (
    !health.services.stripe.configured ||
    !health.services.apis.odds.configured ||
    !health.services.apis.sportsdata.configured
  ) {
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}

