"use client";

import { Card, CardBody } from "@nextui-org/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface ErrorDisplayProps {
  error: string;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <Card className="bg-gray-50 border-2 border-gray-300">
      <CardBody>
        <div className="text-text-dark">
          <div className="flex items-center gap-2 mb-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-gray-600" />
            <p className="font-semibold text-gray-700">API Error</p>
          </div>
          <p className="text-sm text-text-body">{error}</p>
          <p className="text-xs mt-2 text-text-body">
            Please check your API key and rate limits, or try again later.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
