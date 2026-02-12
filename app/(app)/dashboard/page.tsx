import { isAdmin } from "@/lib/admin-utils";
import { DashboardHome } from "./DashboardHome";

export default async function DashboardPage() {
  const admin = await isAdmin();

  return (
    <div className="min-h-full bg-[var(--body-bg)] p-4 md:p-6 lg:p-8">
      <DashboardHome isAdmin={admin} />
    </div>
  );
}
