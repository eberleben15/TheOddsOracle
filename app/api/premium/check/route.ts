import { NextResponse } from "next/server";
import { isPremium, getSubscriptionStatus } from "@/lib/premium-utils";

export async function GET() {
  try {
    const premium = await isPremium();
    const status = await getSubscriptionStatus();
    
    return NextResponse.json({
      isPremium: premium,
      status: status,
    });
  } catch (error) {
    console.error("Error checking premium status:", error);
    return NextResponse.json(
      { isPremium: false, status: "FREE", error: "Failed to check premium status" },
      { status: 500 }
    );
  }
}

