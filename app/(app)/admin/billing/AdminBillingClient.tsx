"use client";

import { useState, useEffect } from "react";

type BillingData = {
  stripeConfigured: boolean;
  counts: { totalUsers: number; free: number; premium: number; pro: number; cancelled: number; other: number };
  byStatus: { status: string; count: number }[];
};

export function AdminBillingClient() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/billing")
      .then((r) => r.json())
      .then((res) => {
        if (res.error) throw new Error(res.error);
        setData(res);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!data) return <p className="text-sm text-amber-600">Failed to load billing data.</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-6">
        <h3 className="font-medium text-[var(--text-dark)] mb-4">Stripe configuration</h3>
        <p className="text-sm">
          {data.stripeConfigured ? (
            <span className="text-emerald-600 font-medium">Stripe is configured (secret, webhook, and price IDs set).</span>
          ) : (
            <span className="text-amber-600">Stripe is not fully configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PREMIUM, STRIPE_PRICE_PRO in .env.</span>
          )}
        </p>
      </div>
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-6">
        <h3 className="font-medium text-[var(--text-dark)] mb-4">Subscription counts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div><p className="text-xs text-gray-500 uppercase">Total users</p><p className="text-2xl font-semibold tabular-nums">{data.counts.totalUsers}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Premium</p><p className="text-2xl font-semibold text-blue-600 tabular-nums">{data.counts.premium}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Pro</p><p className="text-2xl font-semibold text-emerald-600 tabular-nums">{data.counts.pro}</p></div>
          <div><p className="text-xs text-gray-500 uppercase">Cancelled</p><p className="text-2xl font-semibold text-gray-500 tabular-nums">{data.counts.cancelled}</p></div>
        </div>
      </div>
      {data.byStatus.length > 0 && (
        <div className="rounded-xl border border-[var(--border-color)] bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.byStatus.map((row) => (
                <tr key={row.status}><td className="px-4 py-3 text-sm">{row.status}</td><td className="px-4 py-3 text-sm tabular-nums">{row.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
