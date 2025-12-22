export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

type SubscriptionStatus = "FREE" | "PREMIUM" | "PRO" | "CANCELLED" | "PAST_DUE";

/**
 * Map Stripe price ID to subscription status
 */
function getSubscriptionStatusFromPriceId(priceId: string | null): SubscriptionStatus {
  if (!priceId) return "FREE";
  
  const premiumPriceId = process.env.STRIPE_PRICE_PREMIUM;
  const proPriceId = process.env.STRIPE_PRICE_PRO;
  
  if (priceId === proPriceId) return "PRO";
  if (priceId === premiumPriceId) return "PREMIUM";
  
  return "FREE";
}

/**
 * Handle checkout.session.completed event
 * User has completed checkout - activate their subscription
 */
async function handleCheckoutSessionCompleted(session: any) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error("[Stripe] checkout.session.completed: No userId in metadata", session.id);
    return;
  }

  try {
    // Get subscription details from Stripe
    let subscription;
    let priceId: string | null = null;
    let currentPeriodEnd: Date | null = null;

    if (subscriptionId) {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
      priceId = subscription.items.data[0]?.price.id || null;
      currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    } else {
      // One-time payment - get price from line items
      const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });
      priceId = sessionWithLineItems.line_items?.data[0]?.price.id || null;
    }

    const status = getSubscriptionStatusFromPriceId(priceId);

    // Update or create subscription in database
    await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || null,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        status,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId || null,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        status,
      },
    });

    console.log(`[Stripe] Subscription activated for user ${userId}: ${status}`);
  } catch (error) {
    console.error("[Stripe] Error handling checkout.session.completed:", error);
    throw error;
  }
}

/**
 * Handle invoice.payment_succeeded event
 * Subscription payment succeeded - renew subscription
 */
async function handleInvoicePaymentSucceeded(invoice: any) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    // One-time payment, not a subscription
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id || null;
    const status = getSubscriptionStatusFromPriceId(priceId);
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

    // Find user by Stripe customer ID
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!dbSubscription) {
      console.error(`[Stripe] invoice.payment_succeeded: No subscription found for customer ${customerId}`);
      return;
    }

    // Update subscription
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        status,
      },
    });

    console.log(`[Stripe] Subscription renewed for user ${dbSubscription.userId}: ${status}`);
  } catch (error) {
    console.error("[Stripe] Error handling invoice.payment_succeeded:", error);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 * Subscription was updated (tier change, plan change, etc.)
 */
async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0]?.price.id || null;
  const status = getSubscriptionStatusFromPriceId(priceId);
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!dbSubscription) {
      console.error(`[Stripe] customer.subscription.updated: No subscription found for customer ${customerId}`);
      return;
    }

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        status,
      },
    });

    console.log(`[Stripe] Subscription updated for user ${dbSubscription.userId}: ${status}`);
  } catch (error) {
    console.error("[Stripe] Error handling customer.subscription.updated:", error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 * Subscription was cancelled - set to FREE
 */
async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer as string;

  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!dbSubscription) {
      console.error(`[Stripe] customer.subscription.deleted: No subscription found for customer ${customerId}`);
      return;
    }

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: "FREE",
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodEnd: null,
      },
    });

    console.log(`[Stripe] Subscription cancelled for user ${dbSubscription.userId}`);
  } catch (error) {
    console.error("[Stripe] Error handling customer.subscription.deleted:", error);
    throw error;
  }
}

/**
 * Handle invoice.payment_failed event
 * Payment failed - set to PAST_DUE
 */
async function handleInvoicePaymentFailed(invoice: any) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    // One-time payment failure, not a subscription
    return;
  }

  try {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!dbSubscription) {
      console.error(`[Stripe] invoice.payment_failed: No subscription found for customer ${customerId}`);
      return;
    }

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: "PAST_DUE",
      },
    });

    console.log(`[Stripe] Payment failed for user ${dbSubscription.userId} - set to PAST_DUE`);
  } catch (error) {
    console.error("[Stripe] Error handling invoice.payment_failed:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing Stripe signature or webhook secret" },
      { status: 400 }
    );
  }

  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe] Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle subscription lifecycle events
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe] Error processing webhook:", error);
    // Return 200 to prevent Stripe from retrying (we'll handle retries manually if needed)
    return NextResponse.json(
      { error: "Webhook processing failed", message: error instanceof Error ? error.message : String(error) },
      { status: 200 }
    );
  }
}

