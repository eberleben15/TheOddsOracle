"use client";

import { useEffect } from "react";
import { Card, CardBody, CardHeader, Button } from "@nextui-org/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full">
            <CardHeader className="border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Critical Error</h2>
                  <p className="text-sm text-gray-600">Application failed to load</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="space-y-4">
                <p className="text-gray-700">
                  A critical error occurred. Please refresh the page or contact support if the problem persists.
                </p>
                
                <Button
                  onClick={reset}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  Reload Application
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </body>
    </html>
  );
}

