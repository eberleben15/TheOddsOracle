"use client";

import { useEffect, useState } from "react";

interface LastUpdatedProps {
  timestamp?: string | Date | null;
  prefix?: string;
  className?: string;
}

/**
 * Displays a "last updated" timestamp that updates in real-time
 */
export function LastUpdated({ 
  timestamp, 
  prefix = "Last updated",
  className = "text-xs text-gray-500"
}: LastUpdatedProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!timestamp) {
      setTimeAgo("");
      return;
    }

    const calculateTimeAgo = () => {
      const lastUpdate = new Date(timestamp).getTime();
      const now = Date.now();
      const diffSeconds = Math.floor((now - lastUpdate) / 1000);

      if (diffSeconds < 60) return "just now";
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
      if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
      return new Date(timestamp).toLocaleDateString();
    };

    setTimeAgo(calculateTimeAgo());

    // Update every 30 seconds
    const interval = setInterval(() => {
      setTimeAgo(calculateTimeAgo());
    }, 30000);

    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp || !timeAgo) return null;

  return (
    <span className={className}>
      {prefix} {timeAgo}
    </span>
  );
}

