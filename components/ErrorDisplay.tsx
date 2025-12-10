"use client";

import { Card, CardBody } from "@nextui-org/react";

interface ErrorDisplayProps {
  error: string;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <Card className="bg-warning/10 border-2 border-warning">
      <CardBody>
        <div className="text-text-dark">
          <p className="font-semibold mb-2 text-warning">⚠️ API Error</p>
          <p className="text-sm text-text-body">{error}</p>
          <p className="text-xs mt-2 text-text-body">
            Please check your API key and rate limits, or try again later.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
