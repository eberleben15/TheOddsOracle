import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
// EmailProvider is conditionally imported to avoid Edge runtime issues with nodemailer
// import EmailProvider from "next-auth/providers/email"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import * as bcrypt from "bcryptjs"

const providers = []

// Add Google provider only if credentials are configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
} else {
  console.log("[Auth] Google provider not configured (missing GOOGLE_CLIENT_ID/SECRET)")
}

// Credentials provider for admin/login
providers.push(
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        console.log('[Auth] Missing credentials')
        return null
      }

      // Type guard: ensure credentials have required fields
      const email = credentials.email as string;
      const password = credentials.password as string;

      try {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email },
          include: { subscription: true },
        })

        if (!user) {
          console.log(`[Auth] User not found: ${email}`)
          return null
        }

        console.log(`[Auth] User found: ${user.email} (${user.id})`)

        // Check if user has a credentials account
        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: "credentials",
          },
        })

        if (!account) {
          console.log(`[Auth] No credentials account found for user: ${user.id}`)
          return null
        }

        console.log(`[Auth] Credentials account found, verifying password...`)

        // For admin users, we'll use a simple password check
        // In production, store hashed passwords in a UserPassword table
        // For now, this is a basic implementation
        if (!password || !account.providerAccountId) {
          console.log(`[Auth] Missing password or hash`)
          return null
        }

        const isValid = await bcrypt.compare(
          password,
          account.providerAccountId // Temporarily storing hash here - not ideal
        )

        if (!isValid) {
          console.log(`[Auth] Password verification failed for user: ${user.email}`)
          return null
        }

        console.log(`[Auth] Password verified successfully for user: ${user.email}`)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          subscriptionStatus: user.subscription?.status || "FREE",
          stripeCustomerId: user.subscription?.stripeCustomerId || null,
        }
      } catch (error) {
        console.error(`[Auth] Error during authorization:`, error)
        return null
      }
    },
  })
)

// Add Email provider only if email server is configured
// Note: Email provider is disabled by default to avoid Edge runtime issues with nodemailer
// To enable, ensure the auth route uses Node.js runtime (see app/api/auth/[...nextauth]/route.ts)
// and uncomment the EmailProvider import and this block
/*
if (
  process.env.EMAIL_SERVER_HOST &&
  process.env.EMAIL_SERVER_PORT &&
  process.env.EMAIL_FROM
) {
  const EmailProvider = (await import("next-auth/providers/email")).default
  providers.push(
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    })
  )
}
*/

// Export NextAuth handlers and utilities for NextAuth v5
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers,
  trustHost: true, // Avoid ClientFetchError when host is inferred (e.g. dev, reverse proxy)
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    async session({ session, token, user }) {
      // Handle both database sessions (OAuth) and JWT sessions (credentials)
      const userId = (user?.id ?? token?.id) as string | undefined

      if (userId && session.user) {
        session.user.id = userId
        // Prefer token (from jwt callback) so session endpoint rarely hits DB
        session.user.subscriptionStatus = (token.subscriptionStatus as "FREE" | "PREMIUM" | "PRO" | "CANCELLED" | "PAST_DUE") || "FREE"
        session.user.stripeCustomerId = (token.stripeCustomerId as string) || null
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { subscription: true },
          })
          if (dbUser?.subscription) {
            session.user.subscriptionStatus = dbUser.subscription.status || "FREE"
            session.user.stripeCustomerId = dbUser.subscription.stripeCustomerId ?? null
          }
        } catch {
          // Keep token-based values so session still returns 200; avoids ClientFetchError
        }
      }
      return session
    },
    async jwt({ token, user }) {
      // For credentials provider, store user info in token
      if (user) {
        token.id = user.id
        token.subscriptionStatus = (user as any).subscriptionStatus
        token.stripeCustomerId = (user as any).stripeCustomerId
      }
      return token
    },
  },
  session: {
    strategy: "jwt", // Use JWT for credentials, database adapter handles OAuth
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "fallback-secret-change-in-production",
})

