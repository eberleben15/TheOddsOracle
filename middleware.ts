import { NextResponse } from "next/server";
// Use Edge-compatible auth for middleware (doesn't import Prisma)
import { auth } from "@/lib/auth-edge";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Protect app/dashboard/account areas
  const protectedPaths = ["/dashboard", "/account", "/settings", "/matchup", "/live"];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !req.auth?.user) {
    const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/settings/:path*"],
};

