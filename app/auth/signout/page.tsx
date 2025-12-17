"use client"

import { signOut } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    signOut({ callbackUrl: "/" })
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-text-body">Signing out...</p>
    </div>
  )
}

