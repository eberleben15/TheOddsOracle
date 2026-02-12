"use client";

import { useState, useEffect } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  subscriptionStatus: string | null;
  sessionsCount: number;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function AdminUsersClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch("/api/admin/users?" + params.toString())
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setUsers(data.users);
        setPagination(data.pagination);
      })
      .catch(() => {
        setUsers([]);
        setPagination(null);
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by email or name..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        className="max-w-sm px-3 py-2 border border-gray-200 rounded-lg text-sm"
      />
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-sm">{u.name ?? "—"}</td>
                    <td className="px-4 py-3 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{u.subscriptionStatus ?? "FREE"}</td>
                    <td className="px-4 py-3 text-sm tabular-nums">{u.sessionsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-between text-sm">
              <p>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</p>
              <div className="flex gap-2">
                <button type="button" disabled={pagination.page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded border disabled:opacity-50">Previous</button>
                <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
