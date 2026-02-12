"use client";

import { useState, useEffect } from "react";

export function AdminApiKeysClient() {
  const [status, setStatus] = useState<{ key: string; label: string; set: boolean; masked: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/env-status").then((r) => r.json()).then((data) => {
      if (data.error) throw new Error(data.error);
      setStatus(data.status ?? []);
    }).catch(() => setStatus([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-white overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variable</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {status.map((row) => (
            <tr key={row.key}>
              <td className="px-4 py-3 text-sm font-mono">{row.key}</td>
              <td className="px-4 py-3 text-sm">{row.label}</td>
              <td className="px-4 py-3">{row.set ? <span className="text-emerald-600 text-sm">Set</span> : <span className="text-amber-600 text-sm">Not set</span>}</td>
              <td className="px-4 py-3 text-sm font-mono text-gray-500">{row.masked ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
