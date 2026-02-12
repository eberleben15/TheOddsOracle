import { AdminUsersClient } from "./AdminUsersClient";

export default function AdminUsersPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-dark)] mb-2">
        Users
      </h2>
      <p className="text-sm text-[var(--text-body)] mb-6">
        All registered users. Search by email or name.
      </p>
      <AdminUsersClient />
    </div>
  );
}
