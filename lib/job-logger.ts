/**
 * Job execution logger - persists cron run history for admin monitoring.
 */

import { prisma } from "./prisma";

export interface JobLogInput {
  jobName: string;
  status: "success" | "failed";
  startedAt: Date;
  completedAt: Date;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logJobExecution(input: JobLogInput): Promise<void> {
  try {
    await prisma.jobExecution.create({
      data: {
        jobName: input.jobName,
        status: input.status,
        startedAt: input.startedAt,
        completedAt: input.completedAt,
        error: input.error ?? null,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
  } catch (err) {
    console.warn("Could not log job execution:", err);
  }
}

export async function getRecentJobExecutions(
  limit: number = 50,
  jobName?: string
): Promise<
  Array<{
    id: string;
    jobName: string;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
    error: string | null;
    metadata: unknown;
  }>
> {
  try {
    const jobs = await prisma.jobExecution.findMany({
      where: jobName ? { jobName } : undefined,
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return jobs;
  } catch {
    return [];
  }
}
