import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ABERule, RuleTriggerType, RuleAction } from "@/types/abe";

export const dynamic = "force-dynamic";

const VALID_TRIGGER_TYPES: RuleTriggerType[] = [
  "price_above",
  "price_below",
  "portfolio_exposure_above",
  "concentration_above",
  "manual",
];

function dbRuleToABE(r: { id: string; name: string; triggerType: string; triggerConfig: unknown; actions: unknown; enabled: boolean; createdAt: Date; updatedAt: Date }): ABERule {
  return {
    id: r.id,
    name: r.name,
    triggerType: r.triggerType as RuleTriggerType,
    triggerConfig: (r.triggerConfig ?? {}) as ABERule["triggerConfig"],
    actions: (Array.isArray(r.actions) ? r.actions : []) as RuleAction[],
    enabled: r.enabled,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * GET /api/rules
 * List current user's rules.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await prisma.aBERule.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  const rules = rows.map(dbRuleToABE);
  return Response.json({ rules });
}

/**
 * POST /api/rules
 * Body: { name, triggerType, triggerConfig, actions?, enabled? }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: {
    name?: string;
    triggerType?: string;
    triggerConfig?: unknown;
    actions?: unknown;
    enabled?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  const triggerType = body.triggerType as string | undefined;
  if (!triggerType || !VALID_TRIGGER_TYPES.includes(triggerType as RuleTriggerType)) {
    return Response.json(
      { error: `triggerType must be one of: ${VALID_TRIGGER_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  const triggerConfig = body.triggerConfig ?? {};
  const actions = Array.isArray(body.actions) ? body.actions : [{ type: "notify", message: `${name} triggered.` }];
  const enabled = body.enabled !== false;

  const created = await prisma.aBERule.create({
    data: {
      userId: session.user.id,
      name,
      triggerType: triggerType as string,
      triggerConfig: triggerConfig as object,
      actions: actions as object[],
      enabled,
    },
  });
  return Response.json(dbRuleToABE(created));
}
