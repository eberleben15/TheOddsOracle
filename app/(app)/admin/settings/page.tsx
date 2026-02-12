import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-dark)] mb-2">Settings</h2>
      <p className="text-sm text-[var(--text-body)] mb-6">
        App-wide configuration. API keys: <Link href="/admin/api-keys" className="text-primary hover:underline">API keys and env</Link>.
      </p>
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 space-y-4">
        <div>
          <h3 className="font-medium text-[var(--text-dark)] mb-1">Environment</h3>
          <p className="text-sm text-[var(--text-body)]">NODE_ENV: {process.env.NODE_ENV ?? "undefined"}</p>
          <p className="text-sm text-[var(--text-body)]">NEXTAUTH_URL: {process.env.NEXTAUTH_URL ? "set" : "not set"}</p>
        </div>
        <div>
          <h3 className="font-medium text-[var(--text-dark)] mb-1">Feature flags</h3>
          <p className="text-sm text-[var(--text-body)]">No feature-flag table yet. Add AppSetting or key-value table for toggles.</p>
        </div>
      </div>
    </div>
  );
}
