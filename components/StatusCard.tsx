"use client";

import { Card, CardBody } from "@nextui-org/react";

interface StatusCardProps {
  type?: "error" | "empty";
  message: string;
}

export function StatusCard({ type = "empty", message }: StatusCardProps) {
  if (type === "error") {
    return (
      <Card className="mb-6 border-yellow-500 border-2">
        <CardBody>
          <p className="text-yellow-700">{message}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <p className="text-center text-gray-500">{message}</p>
      </CardBody>
    </Card>
  );
}

