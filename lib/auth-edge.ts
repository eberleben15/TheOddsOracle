// Minimal auth configuration for Edge runtime (middleware)
// This file doesn't import Prisma to avoid Edge runtime issues
// For NextAuth v5, we need to use the same config structure but without Node.js dependencies
import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

// Minimal config for Edge runtime - uses JWT only, no database adapter
// This config matches the main auth config but without Prisma/Node.js dependencies
const edgeAuthConfig: NextAuthConfig = {
  providers: [], // Providers are not needed for middleware auth checks
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "fallback-secret-change-in-production",
  callbacks: {
    async jwt({ token, user }) {
      // For credentials provider, store user info in token
      if (user) {
        token.id = (user as any).id
        token.subscriptionStatus = (user as any).subscriptionStatus || "FREE"
        token.stripeCustomerId = (user as any).stripeCustomerId || null
      }
      return token
    },
    async session({ session, token }) {
      // For Edge runtime, we can only access token data (not database)
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.subscriptionStatus = ((token.subscriptionStatus as string) || "FREE") as "FREE" | "PREMIUM" | "PRO" | "CANCELLED" | "PAST_DUE"
        session.user.stripeCustomerId = (token.stripeCustomerId as string) || null
      }
      return session
    },
  },
}

// Export auth function for middleware (Edge runtime compatible)
// NextAuth v5 returns { handlers, auth, signIn, signOut }
const { auth } = NextAuth(edgeAuthConfig)
export { auth }

