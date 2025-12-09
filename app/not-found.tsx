"use client";

import Link from "next/link";
import { Button, Card, CardBody } from "@nextui-org/react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="max-w-md">
        <CardBody className="text-center space-y-4">
          <h1 className="text-4xl font-bold">404</h1>
          <p className="text-gray-600">Matchup not found</p>
          <Link href="/">
            <Button color="primary">Back to Dashboard</Button>
          </Link>
        </CardBody>
      </Card>
    </main>
  );
}

