import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Admin routes protection is handled in page components
  // This middleware can be extended for additional protection if needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};
