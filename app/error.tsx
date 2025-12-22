"use client";

import { useEffect } from "react";
import { Card, CardBody, CardHeader, Button } from "@nextui-org/react";
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  HomeIcon,
  WifiIcon 
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

interface ErrorInfo {
  category: "network" | "api" | "data" | "unknown";
  userMessage: string;
  actionable: string;
  retryable: boolean;
}

function categorizeError(error: Error): ErrorInfo {
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes("fetch") || message.includes("network") || message.includes("econnrefused")) {
    return {
      category: "network",
      userMessage: "Unable to connect to our servers. Please check your internet connection.",
      actionable: "Check your internet connection and try again.",
      retryable: true,
    };
  }

  // API errors
  if (message.includes("api") || message.includes("401") || message.includes("403") || message.includes("429") || message.includes("500")) {
    return {
      category: "api",
      userMessage: "We're having trouble loading data from our services.",
      actionable: "Please try again in a few moments. If the problem persists, our team has been notified.",
      retryable: true,
    };
  }

  // Data errors
  if (message.includes("not found") || message.includes("404") || message.includes("invalid") || message.includes("missing")) {
    return {
      category: "data",
      userMessage: "The requested information could not be found.",
      actionable: "Please try navigating to a different page or check back later.",
      retryable: false,
    };
  }

  // Unknown errors
  return {
    category: "unknown",
    userMessage: "Something unexpected happened. Our team has been notified and is working on a fix.",
    actionable: "Please try again. If the problem persists, contact support.",
    retryable: true,
  };
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const errorInfo = categorizeError(error);

  useEffect(() => {
    // Log error to error reporting service (e.g., Sentry)
    console.error("Application error:", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      category: errorInfo.category,
    });
  }, [error, errorInfo]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-lg w-full">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              errorInfo.category === "network" ? "bg-orange-100" :
              errorInfo.category === "api" ? "bg-yellow-100" :
              errorInfo.category === "data" ? "bg-blue-100" :
              "bg-red-100"
            }`}>
              {errorInfo.category === "network" ? (
                <WifiIcon className="h-6 w-6 text-orange-600" />
              ) : (
                <ExclamationTriangleIcon className={`h-6 w-6 ${
                  errorInfo.category === "api" ? "text-yellow-600" :
                  errorInfo.category === "data" ? "text-blue-600" :
                  "text-red-600"
                }`} />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
              <p className="text-sm text-gray-600">{errorInfo.userMessage}</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>What you can do:</strong> {errorInfo.actionable}
              </p>
            </div>

            {process.env.NODE_ENV === "development" && error.message && (
              <details className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <summary className="text-xs text-gray-600 cursor-pointer font-semibold mb-2">
                  Technical Details (Development Only)
                </summary>
                <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap break-words">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              {errorInfo.retryable && (
                <Button
                  onClick={reset}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  startContent={<ArrowPathIcon className="h-4 w-4" />}
                >
                  Try Again
                </Button>
              )}
              <Button
                onClick={() => router.push("/dashboard")}
                variant="bordered"
                className="border-gray-300"
                startContent={<HomeIcon className="h-4 w-4" />}
              >
                Go to Dashboard
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Error ID: {error.digest || "N/A"} • {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

