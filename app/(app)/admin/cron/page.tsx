/**
 * Admin Cron Jobs - View recent job execution history
 */

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-utils";
import { getRecentJobExecutions } from "@/lib/job-logger";
import { CronJobsClient } from "./CronJobsClient";

export default async function AdminCronPage() {
  const admin = await isAdmin();
  if (!admin) redirect("/dashboard");

  const jobs = await getRecentJobExecutions(50);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cron Job History</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Recent runs of generate-predictions, record-outcomes, and refresh-team-stats.
      </p>
      <CronJobsClient initialJobs={jobs} />
      <p className="text-xs text-gray-500">
        <a
          href="/api/admin/debug/prediction-markets-payloads"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Debug: View raw Kalshi & Polymarket API payloads
        </a>
      </p>
    </div>
  );
}
