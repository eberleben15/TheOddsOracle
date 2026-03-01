/**
 * Feedback History Tracking
 *
 * Stores ATS feedback reports over time to track model performance trends
 * and validate configuration improvements.
 */

import { prisma } from "./prisma";
import type { ATSFeedbackReport } from "./ats-feedback";

export interface FeedbackHistoryEntry {
  timestamp: Date;
  configVersion: number;
  sport?: string;
  overall: ATSFeedbackReport["overall"];
  bySport: ATSFeedbackReport["segmentations"]["bySport"];
  topFeatures: ATSFeedbackReport["featureImportance"];
  brierScore?: number;
  logLoss?: number;
  spreadMAE?: number;
}

/**
 * Save a feedback report to history for trend analysis.
 */
export async function saveFeedbackHistory(
  report: ATSFeedbackReport,
  configVersion: number,
  sport?: string,
  metrics?: { brierScore?: number; logLoss?: number; spreadMAE?: number }
): Promise<void> {
  await prisma.feedbackHistory.create({
    data: {
      configVersion,
      sport: sport ?? null,
      overall: report.overall as any,
      bySport: report.segmentations.bySport as any,
      topFeatures: report.featureImportance.slice(0, 10) as any,
      brierScore: metrics?.brierScore ?? null,
      logLoss: metrics?.logLoss ?? null,
      spreadMAE: metrics?.spreadMAE ?? null,
    },
  });
}

/**
 * Get feedback trend over time (last N days).
 */
export async function getFeedbackTrend(
  days: number = 90,
  sport?: string
): Promise<FeedbackHistoryEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const rows = await prisma.feedbackHistory.findMany({
    where: {
      timestamp: { gte: since },
      ...(sport && { sport }),
    },
    orderBy: { timestamp: "asc" },
  });
  
  return rows.map(row => ({
    timestamp: row.timestamp,
    configVersion: row.configVersion,
    sport: row.sport ?? undefined,
    overall: row.overall as any,
    bySport: row.bySport as any,
    topFeatures: row.topFeatures as any,
    brierScore: row.brierScore ?? undefined,
    logLoss: row.logLoss ?? undefined,
    spreadMAE: row.spreadMAE ?? undefined,
  }));
}

/**
 * Get feedback history for a specific config version.
 */
export async function getFeedbackByConfigVersion(
  configVersion: number,
  sport?: string
): Promise<FeedbackHistoryEntry[]> {
  const rows = await prisma.feedbackHistory.findMany({
    where: {
      configVersion,
      ...(sport && { sport }),
    },
    orderBy: { timestamp: "asc" },
  });
  
  return rows.map(row => ({
    timestamp: row.timestamp,
    configVersion: row.configVersion,
    sport: row.sport ?? undefined,
    overall: row.overall as any,
    bySport: row.bySport as any,
    topFeatures: row.topFeatures as any,
    brierScore: row.brierScore ?? undefined,
    logLoss: row.logLoss ?? undefined,
    spreadMAE: row.spreadMAE ?? undefined,
  }));
}

/**
 * Compare performance between two config versions.
 */
export async function compareConfigVersions(
  version1: number,
  version2: number,
  sport?: string
): Promise<{
  version1: { avgWinRate: number; avgNetUnits: number; sampleCount: number };
  version2: { avgWinRate: number; avgNetUnits: number; sampleCount: number };
  improvement: { winRate: number; netUnits: number };
}> {
  const v1Data = await getFeedbackByConfigVersion(version1, sport);
  const v2Data = await getFeedbackByConfigVersion(version2, sport);
  
  const v1Stats = {
    avgWinRate: v1Data.length > 0 
      ? v1Data.reduce((sum, d) => sum + d.overall.winRate, 0) / v1Data.length 
      : 0,
    avgNetUnits: v1Data.length > 0 
      ? v1Data.reduce((sum, d) => sum + d.overall.netUnits, 0) / v1Data.length 
      : 0,
    sampleCount: v1Data.length > 0 
      ? v1Data.reduce((sum, d) => sum + d.overall.sampleCount, 0) 
      : 0,
  };
  
  const v2Stats = {
    avgWinRate: v2Data.length > 0 
      ? v2Data.reduce((sum, d) => sum + d.overall.winRate, 0) / v2Data.length 
      : 0,
    avgNetUnits: v2Data.length > 0 
      ? v2Data.reduce((sum, d) => sum + d.overall.netUnits, 0) / v2Data.length 
      : 0,
    sampleCount: v2Data.length > 0 
      ? v2Data.reduce((sum, d) => sum + d.overall.sampleCount, 0) 
      : 0,
  };
  
  return {
    version1: v1Stats,
    version2: v2Stats,
    improvement: {
      winRate: v2Stats.avgWinRate - v1Stats.avgWinRate,
      netUnits: v2Stats.avgNetUnits - v1Stats.avgNetUnits,
    },
  };
}
