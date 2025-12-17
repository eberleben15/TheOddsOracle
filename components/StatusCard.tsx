"use client";

import { Card, CardBody } from "@nextui-org/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface StatusCardProps {
  type?: "error" | "empty";
  message: string;
}

export function StatusCard({ type = "empty", message }: StatusCardProps) {
  if (type === "error") {
    return (
      <Card className="mb-6 bg-gray-50 border-2 border-gray-300">
        <CardBody>
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-gray-600 flex-shrink-0" />
            <p className="text-gray-700 font-medium">{message}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200">
      <CardBody>
        <p className="text-center text-gray-600">{message}</p>
      </CardBody>
    </Card>
  );
}
