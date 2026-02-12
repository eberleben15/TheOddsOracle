import { getAdminEmail } from "@/lib/admin-utils";

export default async function AdminPermissionsPage() {
  const adminEmail = getAdminEmail();

  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-dark)] mb-2">
        Permissions
      </h2>
      <p className="text-sm text-[var(--text-body)] mb-6">
        Admin access is determined by the <code className="bg-gray-100 px-1 rounded">ADMIN_EMAIL</code> environment
        variable. Only the user with that email can access admin routes.
      </p>
      <div className="rounded-xl border border-[var(--border-color)] bg-white p-6 space-y-6">
        <div>
          <h3 className="font-medium text-[var(--text-dark)] mb-1">
            Current admin
          </h3>
          <p className="text-sm text-[var(--text-body)]">
            {adminEmail ? (
              <>
                <span className="font-mono">
                  {adminEmail.slice(0, 3)}…{adminEmail.slice(-10)}
                </span>
                <span className="text-gray-500 ml-2">(set in ADMIN_EMAIL)</span>
              </>
            ) : (
              <span className="text-amber-600">
                ADMIN_EMAIL is not set. No one has admin access until you set it
                in .env and restart.
              </span>
            )}
          </p>
        </div>
        <div>
          <h3 className="font-medium text-[var(--text-dark)] mb-1">
            How to change admin
          </h3>
          <ul className="text-sm text-[var(--text-body)] list-disc list-inside space-y-1">
            <li>Set <code>ADMIN_EMAIL</code> in <code>.env.local</code> or your deployment environment to the email of the admin user.</li>
            <li>Restart the server after changing env.</li>
            <li>That user must have an account (signed up / invited) with that email.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-[var(--text-dark)] mb-1">
            Future: roles and multiple admins
          </h3>
          <p className="text-sm text-[var(--text-body)]">
            To support multiple admins or custom roles (e.g. support, viewer),
            add a <code>UserRole</code> table or <code>role</code> column on{" "}
            <code>User</code>, and update <code>lib/admin-utils.ts</code> to
            check role instead of ADMIN_EMAIL. Permissions can then be
            configurable per user from this page.
          </p>
        </div>
      </div>
    </div>
  );
}
