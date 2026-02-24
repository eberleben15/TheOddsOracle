"use client";

import { Card, CardBody, CardHeader } from "@nextui-org/react";

interface LoadingSkeletonProps {
  type?: "card" | "list" | "table" | "matchup";
  count?: number;
}

export function LoadingSkeleton({ type = "card", count = 1 }: LoadingSkeletonProps) {
  if (type === "matchup") {
    return (
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="border-b border-[var(--border-color)]">
              <div className="w-full">
                <div className="h-6 bg-[var(--gray-200)] rounded w-3/4 mb-2" />
                <div className="h-4 bg-[var(--gray-200)] rounded w-1/2" />
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-20 bg-[var(--gray-200)] rounded" />
                  <div className="h-20 bg-[var(--gray-200)] rounded" />
                </div>
                <div className="h-32 bg-[var(--gray-200)] rounded" />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-[var(--gray-200)] rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-[var(--gray-200)] rounded mb-2" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--gray-200)] rounded mb-2" />
        ))}
      </div>
    );
  }

  // Default card skeleton
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-[var(--gray-200)] rounded w-2/3" />
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <div className="h-4 bg-[var(--gray-200)] rounded w-full" />
              <div className="h-4 bg-[var(--gray-200)] rounded w-5/6" />
              <div className="h-4 bg-[var(--gray-200)] rounded w-4/6" />
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

