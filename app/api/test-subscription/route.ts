import { NextResponse } from "next/server";
import { testSubscriptionStatus } from "@/lib/stats-api";

export async function GET() {
  try {
    const status = await testSubscriptionStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

