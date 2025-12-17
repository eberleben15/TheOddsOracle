"use client"

import { useSearchParams } from "next/navigation"
import { Button } from "@nextui-org/react"
import Link from "next/link"

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const errorMessages: Record<string, string> = {
    Configuration: "There is a problem with the server configuration.",
    AccessDenied: "You do not have permission to sign in.",
    Verification: "The verification token has expired or has already been used.",
    Default: "An error occurred during authentication.",
  }

  const errorMessage = errorMessages[error || "Default"] || errorMessages.Default

  return (
    <div className="flex min-h-screen items-center justify-center bg-body-bg p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-card-bg p-8 shadow-lg text-center">
        <h1 className="text-3xl font-bold text-text-dark">Authentication Error</h1>
        <p className="text-text-body">{errorMessage}</p>
        <Link href="/auth/signin">
          <Button color="primary" size="lg">
            Try Again
          </Button>
        </Link>
      </div>
    </div>
  )
}

