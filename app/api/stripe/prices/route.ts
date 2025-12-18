import { NextResponse } from "next/server";
import { stripePrices } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  // Return price IDs (safe to expose, they're public in Stripe)
  return NextResponse.json({
    premium: stripePrices.premium || null,
    pro: stripePrices.pro || null,
  });
}

