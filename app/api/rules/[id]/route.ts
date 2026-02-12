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
 * PATCH /api/rules/[id]
 * Body: { name?, triggerType?, triggerConfig?, actions?, enabled? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.aBERule.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return Response.json({ error: "Rule not found" }, { status: 404 });
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
  const updates: { name?: string; triggerType?: string; triggerConfig?: object; actions?: object[]; enabled?: boolean } = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (body.triggerType !== undefined) {
    if (!VALID_TRIGGER_TYPES.includes(body.triggerType as RuleTriggerType)) {
      return Response.json({ error: "Invalid triggerType" }, { status: 400 });
    }
    updates.triggerType = body.triggerType;
  }
  if (body.triggerConfig !== undefined) updates.triggerConfig = body.triggerConfig as object;
  if (Array.isArray(body.actions)) updates.actions = body.actions as object[];
  if (typeof body.enabled === "boolean") updates.enabled = body.enabled;

  const updated = await prisma.aBERule.update({
    where: { id },
    data: updates,
  });
  return Response.json(dbRuleToABE(updated));
}

/**
 * DELETE /api/rules/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await prisma.aBERule.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return Response.json({ error: "Rule not found" }, { status: 404 });
  }
  await prisma.aBERule.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
