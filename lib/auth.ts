import NextAuth, { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
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

      try {
        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { subscription: true },
        })

        if (!user) {
          console.log(`[Auth] User not found: ${credentials.email}`)
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
        const isValid = await bcrypt.compare(
          credentials.password,
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
if (
  process.env.EMAIL_SERVER_HOST &&
  process.env.EMAIL_SERVER_PORT &&
  process.env.EMAIL_FROM
) {
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

const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers,
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    async session({ session, token, user }) {
      // Handle both database sessions (OAuth) and JWT sessions (credentials)
      const userId = user?.id || token?.id as string
      
      if (userId && session.user) {
        // Fetch user subscription status from database
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          include: { subscription: true },
        })

        session.user.id = userId
        session.user.subscriptionStatus = dbUser?.subscription?.status || "FREE"
        session.user.stripeCustomerId = dbUser?.subscription?.stripeCustomerId || null
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
}

// Export NextAuth handlers and utilities for NextAuth v5
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)

// Also export authOptions for backward compatibility if needed
export { authOptions }

