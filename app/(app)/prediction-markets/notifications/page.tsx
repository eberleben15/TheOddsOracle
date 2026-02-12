"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ABENotification } from "@/types/abe";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ABENotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    fetch("/api/notifications?limit=50")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { notifications?: ABENotification[] } | null) =>
        setNotifications(data?.notifications ?? [])
      )
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true, notificationIds: unreadIds }),
    })
      .then((r) => (r.ok ? fetchNotifications() : null))
      .catch(() => {});
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/prediction-markets/rules" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Rules
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-dark)]">Notifications</h1>
        <p className="text-[var(--text-body)] mt-1">
          Alerts from your rules (e.g. concentration or price thresholds).
        </p>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={markAllRead}
          className="text-sm text-primary hover:underline"
        >
          Mark all as read
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-white divide-y divide-gray-100">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No notifications yet. Create rules and run them to see alerts here.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 ${n.read ? "bg-gray-50/50" : "bg-white"}`}
            >
              <p className="text-sm font-medium text-[var(--text-dark)]">{n.title}</p>
              <p className="text-sm text-[var(--text-body)] mt-0.5">{n.body}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
