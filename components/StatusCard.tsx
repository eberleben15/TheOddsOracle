"use client";

import { Card, CardBody } from "@nextui-org/react";

interface StatusCardProps {
  type?: "error" | "empty";
  message: string;
}

export function StatusCard({ type = "empty", message }: StatusCardProps) {
  if (type === "error") {
    return (
      <Card className="mb-6 bg-warning/10 border-2 border-warning">
        <CardBody>
          <p className="text-warning font-medium">{message}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-border-gray">
      <CardBody>
        <p className="text-center text-text-body">{message}</p>
      </CardBody>
    </Card>
  );
}
