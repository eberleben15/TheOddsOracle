import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, stripePrices } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

type CheckoutRequest = {
  priceId?: string;
  mode?: "subscription" | "payment";
};

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const priceId = body.priceId;

  if (!priceId) {
    return NextResponse.json(
      { error: "Price ID is required" },
      { status: 400 }
    );
  }

  const mode = body.mode || "subscription";

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured. Please install stripe package and set STRIPE_SECRET_KEY." },
      { status: 503 }
    );
  }

  try {
    // Get or create Stripe customer
    let stripeCustomerId = session.user.stripeCustomerId;

    if (!stripeCustomerId) {
      // Check if user has a customer ID in database
      const userSubscription = await prisma.subscription.findUnique({
        where: { userId: session.user.id },
      });

      if (userSubscription?.stripeCustomerId) {
        stripeCustomerId = userSubscription.stripeCustomerId;
      } else {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: session.user.email || undefined,
          metadata: {
            userId: session.user.id,
          },
        });

        stripeCustomerId = customer.id;

        // Update database with customer ID
        await prisma.subscription.upsert({
          where: { userId: session.user.id },
          create: {
            userId: session.user.id,
            stripeCustomerId: customer.id,
            status: "FREE",
          },
          update: {
            stripeCustomerId: customer.id,
          },
        });
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode,
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL || "http://localhost:3005"}/account?success=1`,
      cancel_url: `${process.env.NEXTAUTH_URL || "http://localhost:3005"}/pricing?canceled=1`,
      metadata: {
        userId: session.user.id,
        email: session.user.email || "",
        priceId: priceId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("[Stripe] Checkout error:", error);
    return NextResponse.json(
      {
        error: "Unable to create checkout session",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

