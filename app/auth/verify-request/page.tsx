"use client"

import { useSearchParams } from "next/navigation"
import { HiMail } from "react-icons/hi"

export default function VerifyRequestPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")

  return (
    <div className="flex min-h-screen items-center justify-center bg-body-bg p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-card-bg p-8 shadow-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <HiMail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-text-dark">Check your email</h1>
        <p className="text-text-body">
          A sign in link has been sent to {email ? <strong>{email}</strong> : "your email"}.
        </p>
        <p className="text-sm text-text-body">
          Click the link in the email to sign in. The link will expire in 24 hours.
        </p>
      </div>
    </div>
  )
}

