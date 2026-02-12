import { AdminBillingClient } from "./AdminBillingClient";

export default function AdminBillingPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[var(--text-dark)] mb-2">Billing</h2>
      <p className="text-sm text-[var(--text-body)] mb-6">Subscription counts and Stripe status.</p>
      <AdminBillingClient />
    </div>
  );
}
