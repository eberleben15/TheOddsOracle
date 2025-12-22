/**
 * Premium Feature Utilities
 * 
 * Functions to check subscription status and gate premium features
 */

import { auth } from "./auth";
import { prisma } from "./prisma";

export type SubscriptionStatus = "FREE" | "PREMIUM" | "PRO" | "CANCELLED" | "PAST_DUE";

/**
 * Check if user has premium access
 */
export async function isPremium(): Promise<boolean> {
  const session = await auth();
  if (!session?.user) {
    return false;
  }

  const status = session.user.subscriptionStatus as SubscriptionStatus;
  return status === "PREMIUM" || status === "PRO";
}

/**
 * Get user's subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const session = await auth();
  if (!session?.user) {
    return "FREE";
  }

  return (session.user.subscriptionStatus as SubscriptionStatus) || "FREE";
}

/**
 * Check if a feature requires premium
 */
export function requiresPremium(feature: "predictions" | "recommended_bets" | "advanced_analytics"): boolean {
  // All premium features require PREMIUM or PRO subscription
  return true;
}

/**
 * Get premium feature message
 */
export function getPremiumMessage(feature: "predictions" | "recommended_bets" | "advanced_analytics"): string {
  const messages = {
    predictions: "AI-powered predictions are available for Premium members. Upgrade to unlock advanced analytics and win probability calculations.",
    recommended_bets: "Recommended bets are available for Premium members. Upgrade to see our top value betting opportunities.",
    advanced_analytics: "Advanced analytics are available for Premium members. Upgrade to unlock detailed matchup analysis.",
  };
  return messages[feature];
}

