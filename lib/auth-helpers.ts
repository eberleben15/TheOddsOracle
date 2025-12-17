import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { prisma } from "./prisma"
import { SubscriptionStatus } from "@prisma/client"

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true },
  })

  return user
}

export async function getUserSubscriptionStatus(): Promise<SubscriptionStatus> {
  const user = await getCurrentUser()
  return user?.subscription?.status || "FREE"
}

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  return session
}

export async function requireSubscription(minTier: SubscriptionStatus = "PREMIUM") {
  const status = await getUserSubscriptionStatus()
  const tierOrder: Record<SubscriptionStatus, number> = {
    FREE: 0,
    PREMIUM: 1,
    PRO: 2,
    CANCELLED: 0,
    PAST_DUE: 0,
  }

  if (tierOrder[status] < tierOrder[minTier]) {
    throw new Error(`Subscription tier ${minTier} required`)
  }
  return status
}

