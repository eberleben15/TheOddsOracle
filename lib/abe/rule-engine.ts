/**
 * Phase 4: Condition-based action engine.
 * Evaluates rules against context (prices, portfolio report) and returns which rules fired.
 */

import type {
  ABERule,
  RuleTriggerType,
  RuleTriggerConfig,
  RuleEngineContext,
  RuleAction,
  PortfolioRiskReport,
} from "@/types/abe";

function getTriggerConfig(
  triggerType: RuleTriggerType,
  config: unknown
): RuleTriggerConfig | null {
  if (!config || typeof config !== "object") return null;
  const c = config as Record<string, unknown>;
  switch (triggerType) {
    case "price_above":
    case "price_below":
      return typeof c.contractId === "string" && typeof c.value === "number"
        ? { contractId: c.contractId, value: c.value }
        : null;
    case "portfolio_exposure_above":
      return typeof c.factorId === "string" && typeof c.value === "number"
        ? { factorId: c.factorId, value: c.value }
        : null;
    case "concentration_above":
      return typeof c.value === "number" ? { value: c.value } : null;
    case "manual":
      return {};
    default:
      return null;
  }
}

/** Returns true if the rule's trigger matches the context. */
export function evaluateRule(rule: ABERule, ctx: RuleEngineContext): boolean {
  if (!rule.enabled) return false;
  const config = getTriggerConfig(
    rule.triggerType as RuleTriggerType,
    rule.triggerConfig
  );
  if (config === null && rule.triggerType !== "manual") return false;

  switch (rule.triggerType as RuleTriggerType) {
    case "price_above": {
      const cfg = config as { contractId: string; value: number };
      const price = ctx.contractPrices?.[cfg.contractId];
      return typeof price === "number" && price >= cfg.value;
    }
    case "price_below": {
      const cfg = config as { contractId: string; value: number };
      const price = ctx.contractPrices?.[cfg.contractId];
      return typeof price === "number" && price <= cfg.value;
    }
    case "portfolio_exposure_above": {
      const cfg = config as { factorId: string; value: number };
      const report = ctx.portfolioReport;
      if (!report?.factorExposures?.length) return false;
      const exp = report.factorExposures.find((e) => e.factorId === cfg.factorId);
      return exp ? exp.fraction >= cfg.value : false;
    }
    case "concentration_above": {
      const cfg = config as { value: number };
      const report = ctx.portfolioReport;
      return typeof report?.concentrationRisk === "number" && report.concentrationRisk >= cfg.value;
    }
    case "manual":
      return true;
    default:
      return false;
  }
}

/** Build notifications from rule actions (caller persists to DB). */
export function buildNotificationsForRule(
  rule: ABERule,
  contextMessage?: string
): { title: string; body: string }[] {
  const title = rule.name;
  const out: { title: string; body: string }[] = [];
  const actions = (rule.actions ?? []) as RuleAction[];
  for (const a of actions) {
    if (a.type === "notify") {
      const body = [a.message, contextMessage].filter(Boolean).join(" ") || "Rule triggered.";
      out.push({ title, body });
    }
    // "log" can be implied by storing the notification; no separate log entry for MVP
  }
  if (out.length === 0 && actions.some((a) => a.type === "log")) {
    out.push({
      title,
      body: contextMessage || "Rule triggered (log).",
    });
  }
  return out;
}

/** Run all rules and return rule ids that fired plus notifications to create. */
export function runRules(
  rules: ABERule[],
  ctx: RuleEngineContext
): {
  firedRuleIds: string[];
  notifications: { ruleId: string; ruleName: string; title: string; body: string }[];
} {
  const firedRuleIds: string[] = [];
  const notifications: { ruleId: string; ruleName: string; title: string; body: string }[] = [];
  for (const rule of rules) {
    if (!evaluateRule(rule, ctx)) continue;
    firedRuleIds.push(rule.id);
    const msgs = buildNotificationsForRule(rule);
    for (const { title, body } of msgs) {
      notifications.push({
        ruleId: rule.id,
        ruleName: rule.name,
        title,
        body,
      });
    }
  }
  return { firedRuleIds, notifications };
}
