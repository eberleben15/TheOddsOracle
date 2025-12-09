"use client";

import { Card, CardBody } from "@nextui-org/react";

interface ErrorDisplayProps {
  error: string;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <Card className="border-yellow-500 border-2">
      <CardBody>
        <div className="text-yellow-700">
          <p className="font-semibold mb-2">⚠️ API Error</p>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2 text-gray-600">
            Please check your API key and rate limits, or try again later.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

