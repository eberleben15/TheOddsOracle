import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-utils";
import { BetsPageClient } from "./BetsPageClient";

export const dynamic = "force-dynamic";

export default async function AdminBetsPage() {
  const admin = await isAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-dark)]">
          Bet Management
        </h2>
        <p className="text-sm text-[var(--text-body)] mt-1">
          View today&apos;s recommendations, place bets, and track your betting history.
        </p>
      </div>
      <BetsPageClient />
    </div>
  );
}
