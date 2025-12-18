export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
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

  // Handle events (expand as needed)
  switch (event.type) {
    case "checkout.session.completed":
      console.log("[Stripe] checkout.session.completed", event.data.object.id);
      break;
    case "invoice.payment_succeeded":
      console.log("[Stripe] invoice.payment_succeeded", event.data.object.id);
      break;
    default:
      console.log(`[Stripe] Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

