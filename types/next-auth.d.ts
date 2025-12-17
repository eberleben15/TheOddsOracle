import "next-auth"
import { SubscriptionStatus } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      subscriptionStatus: SubscriptionStatus
      stripeCustomerId: string | null
    }
  }

  interface User {
    id: string
    subscriptionStatus?: SubscriptionStatus
    stripeCustomerId?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    subscriptionStatus?: SubscriptionStatus
    stripeCustomerId?: string | null
  }
}

