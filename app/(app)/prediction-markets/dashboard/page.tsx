import { redirect } from "next/navigation";

/**
 * Unified dashboard lives at /dashboard. Redirect old path.
 */
export default function PredictionMarketsDashboardRedirect() {
  redirect("/dashboard");
}
