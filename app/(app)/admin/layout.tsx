import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-utils";
import Link from "next/link";
import { AdminNav } from "./_components/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-full bg-[var(--body-bg)]">
      <div className="border-b border-[var(--border-color)] bg-white relative" style={{ overflow: 'visible' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ overflow: 'visible' }}>
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-semibold text-[var(--text-dark)]">
              Admin
            </h1>
            <Link
              href="/dashboard"
              className="text-sm text-[var(--text-body)] hover:text-[var(--text-dark)]"
            >
              ← Dashboard
            </Link>
          </div>
          <div style={{ overflow: 'visible', position: 'relative' }}>
            <AdminNav />
          </div>
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
