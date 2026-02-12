import { AdminApiKeysClient } from "./AdminApiKeysClient";

export default function AdminApiKeysPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-dark)] mb-2">API keys and environment</h2>
      <p className="text-sm text-[var(--text-body)] mb-6">Status of environment variables. Set values in .env.local.</p>
      <AdminApiKeysClient />
    </div>
  );
}
