"use client"

import { signIn } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button, Input } from "@nextui-org/react"
import { FcGoogle } from "react-icons/fc"
import { HiMail } from "react-icons/hi"
import { useState } from "react"

export default function SignInPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const error = searchParams.get("error")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [credentialsError, setCredentialsError] = useState("")

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setCredentialsError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setCredentialsError("Invalid email or password")
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      setCredentialsError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-body-bg p-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-card-bg p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-dark">Sign In</h1>
          <p className="mt-2 text-text-body">
            Sign in to access The Odds Oracle
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-800">
            {error === "CredentialsSignin" && "Invalid credentials"}
            {error === "OAuthSignin" && "Error signing in with OAuth"}
            {error === "OAuthCallback" && "Error in OAuth callback"}
            {error === "OAuthCreateAccount" && "Could not create OAuth account"}
            {error === "EmailCreateAccount" && "Could not create email account"}
            {error === "Callback" && "Error in callback"}
            {error === "OAuthAccountNotLinked" && "Account already exists with different provider"}
            {error === "EmailSignin" && "Check your email for the sign in link"}
            {error === "CredentialsSignin" && "Sign in failed"}
            {error === "SessionRequired" && "Please sign in to access this page"}
          </div>
        )}

        <div className="space-y-4">
          {/* Credentials Form */}
          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <Input
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              isDisabled={isLoading}
            />
            <Input
              type="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              isDisabled={isLoading}
            />
            {credentialsError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {credentialsError}
              </div>
            )}
            <Button
              type="submit"
              className="w-full"
              color="primary"
              size="lg"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-card-bg text-text-body">Or continue with</span>
            </div>
          </div>

          <Button
            className="w-full"
            variant="bordered"
            size="lg"
            onClick={() => signIn("google", { callbackUrl })}
            startContent={<FcGoogle className="text-xl" />}
            isDisabled={isLoading}
          >
            Continue with Google
          </Button>

          <Button
            className="w-full"
            variant="bordered"
            size="lg"
            onClick={() => signIn("email", { callbackUrl })}
            startContent={<HiMail className="text-xl" />}
            isDisabled={isLoading}
          >
            Continue with Email
          </Button>
        </div>

        <p className="text-center text-sm text-text-body">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

