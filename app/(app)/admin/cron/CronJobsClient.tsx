"use client";

import { useState } from "react";
import { Button } from "@nextui-org/react";

interface Job {
  id: string;
  jobName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
}

export function CronJobsClient({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("");

  async function refresh() {
    setLoading(true);
    try {
      const url = filter
        ? `/api/admin/jobs?jobName=${encodeURIComponent(filter)}`
        : "/api/admin/jobs";
      const res = await fetch(url);
      const data = await res.json();
      setJobs(data.jobs || []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter
    ? jobs.filter((j) => j.jobName === filter)
    : jobs;

  async function runJob(job: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cron/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || `Failed to run ${job}`);
        return;
      }
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to run job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm" variant="flat" onPress={refresh} isLoading={loading}>
          Refresh
        </Button>
        <span className="text-sm text-gray-500 mx-1">|</span>
        <span className="text-sm text-gray-600 dark:text-gray-400">Run manually:</span>
        {(["refresh-team-stats", "generate-predictions", "record-outcomes"] as const).map((j) => (
          <Button
            key={j}
            size="sm"
            color="primary"
            variant="flat"
            onPress={() => runJob(j)}
            isDisabled={loading}
          >
            {j.replace(/-/g, " ")}
          </Button>
        ))}
        <select
          className="rounded border px-2 py-1 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All jobs</option>
          <option value="generate-predictions">generate-predictions</option>
          <option value="record-outcomes">record-outcomes</option>
          <option value="refresh-team-stats">refresh-team-stats</option>
        </select>
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 dark:bg-gray-800">
              <th className="px-4 py-2 text-left">Job</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Started</th>
              <th className="px-4 py-2 text-left">Duration</th>
              <th className="px-4 py-2 text-left">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No job runs found. Cron jobs will appear here after they run.
                </td>
              </tr>
            ) : (
              filtered.map((job) => {
                const started = new Date(job.startedAt);
                const completed = job.completedAt
                  ? new Date(job.completedAt)
                  : null;
                const durationMs = completed
                  ? completed.getTime() - started.getTime()
                  : null;
                return (
                  <tr key={job.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2 font-medium">{job.jobName}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          job.status === "success"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                      {started.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {durationMs != null ? `${durationMs}ms` : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {job.error && (
                        <span className="text-red-600 dark:text-red-400 text-xs">
                          {job.error.slice(0, 80)}…
                        </span>
                      )}
                      {job.metadata && typeof job.metadata === "object" && (
                        <span className="text-gray-600 dark:text-gray-400 text-xs">
                          {JSON.stringify(job.metadata)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
