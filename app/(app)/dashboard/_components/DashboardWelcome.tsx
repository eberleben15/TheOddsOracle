"use client";

import { useSession } from "next-auth/react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardWelcome() {
  const { data: session, status } = useSession();
  const name = session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "there";

  if (status === "loading") {
    return (
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-2" />
        <div className="h-5 w-72 bg-gray-50 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h1 className="text-2xl md:text-3xl font-bold text-text-dark mb-1">
        {getGreeting()}, {name}
      </h1>
      <p className="text-text-body">
        Your betting command center — positions, actions, and today&apos;s games.
      </p>
    </div>
  );
}
