/**
 * Admin API: ATS Feedback Analysis
 *
 * GET: Returns comprehensive ATS feedback report with segmentation and recommendations
 * POST: Generate and apply a new pipeline config based on feedback
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { buildTrainingDataset } from "@/lib/training-dataset";
import { 
  runATSFeedbackReport, 
  runATSFeedbackReportAdvanced,
  type ATSFeedbackReport 
} from "@/lib/ats-feedback";
import {
  generateConfigFromFeedback,
  DEFAULT_PIPELINE_CONFIG,
  type FeedbackPipelineConfig,
} from "@/lib/feedback-pipeline-config";
import { prisma } from "@/lib/prisma";

const PIPELINE_CONFIG_KEY = "ats_pipeline_config";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const sport = searchParams.get("sport") || undefined;
    const trends = searchParams.get("trends") === "true";
    const advanced = searchParams.get("advanced") === "true";
    const days = parseInt(searchParams.get("days") || "90");

    // If trends are requested, return historical data
    if (trends) {
      const { getFeedbackTrend } = await import("@/lib/feedback-history");
      const trendData = await getFeedbackTrend(days, sport);
      const currentConfig = await loadCurrentConfig();
      
      return NextResponse.json({
        trends: trendData,
        currentConfig,
      });
    }

    const examples = await buildTrainingDataset({ sport, limit: 5000 });
    
    if (examples.length === 0) {
      return NextResponse.json({
        report: null,
        message: "No validated predictions found. Run batch sync to validate games first.",
        currentConfig: await loadCurrentConfig(),
      });
    }

    // Use advanced analytics if requested
    const report = advanced
      ? await runATSFeedbackReportAdvanced(examples)
      : runATSFeedbackReport(examples);
    
    const currentConfig = await loadCurrentConfig();
    
    const withAnalytics = examples.filter((ex) => ex.awayNetRating != null).length;

    return NextResponse.json({
      report,
      datasetStats: {
        total: examples.length,
        withMarketSpread: report.overall.sampleCount,
        withAnalytics,
      },
      currentConfig,
      suggestedConfig: generateConfigFromFeedback(report, currentConfig || DEFAULT_PIPELINE_CONFIG),
    });
  } catch (error) {
    console.error("ATS feedback API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === "generate") {
      const sport = body.sport as string | undefined;
      const examples = await buildTrainingDataset({ sport, limit: 5000 });

      if (examples.length === 0) {
        return NextResponse.json({ error: "No validated predictions found" }, { status: 400 });
      }

      const report = runATSFeedbackReport(examples);
      const currentConfig = await loadCurrentConfig();
      const newConfig = generateConfigFromFeedback(report, currentConfig || DEFAULT_PIPELINE_CONFIG);

      return NextResponse.json({
        config: newConfig,
        changes: describeConfigChanges(currentConfig || DEFAULT_PIPELINE_CONFIG, newConfig),
      });
    }

    if (action === "apply") {
      const config = body.config as FeedbackPipelineConfig;

      if (!config || typeof config.version !== "number") {
        return NextResponse.json({ error: "Invalid config" }, { status: 400 });
      }

      config.updatedAt = new Date().toISOString();

      await prisma.modelConfig.upsert({
        where: { key: PIPELINE_CONFIG_KEY },
        update: { value: config as any, updatedAt: new Date() },
        create: { key: PIPELINE_CONFIG_KEY, value: config as any },
      });

      return NextResponse.json({ success: true, config });
    }

    if (action === "reset") {
      const defaultConfig = { ...DEFAULT_PIPELINE_CONFIG, updatedAt: new Date().toISOString() };

      await prisma.modelConfig.upsert({
        where: { key: PIPELINE_CONFIG_KEY },
        update: { value: defaultConfig as any, updatedAt: new Date() },
        create: { key: PIPELINE_CONFIG_KEY, value: defaultConfig as any },
      });

      return NextResponse.json({ success: true, config: defaultConfig });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("ATS feedback POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function loadCurrentConfig(): Promise<FeedbackPipelineConfig | null> {
  try {
    const row = await prisma.modelConfig.findUnique({
      where: { key: PIPELINE_CONFIG_KEY },
    });
    if (row?.value && typeof row.value === "object") {
      return { ...DEFAULT_PIPELINE_CONFIG, ...(row.value as any) };
    }
  } catch {
    // Table might not exist yet
  }
  return null;
}

function describeConfigChanges(
  oldConfig: FeedbackPipelineConfig,
  newConfig: FeedbackPipelineConfig
): string[] {
  const changes: string[] = [];

  for (const [key, sportConfig] of Object.entries(newConfig.sports)) {
    const oldSport = oldConfig.sports[key as keyof typeof oldConfig.sports];
    if (!sportConfig.enabled && oldSport.enabled) {
      changes.push(`${key}: DISABLED`);
    } else if (sportConfig.confidenceMultiplier !== oldSport.confidenceMultiplier) {
      changes.push(`${key}: multiplier ${oldSport.confidenceMultiplier.toFixed(2)} → ${sportConfig.confidenceMultiplier.toFixed(2)}`);
    }
  }

  for (const [key, bucket] of Object.entries(newConfig.spreadMagnitude)) {
    const oldBucket = oldConfig.spreadMagnitude[key as keyof typeof oldConfig.spreadMagnitude];
    if (!bucket.enabled && oldBucket.enabled) {
      changes.push(`spreadMagnitude.${key}: DISABLED`);
    } else if (bucket.confidenceMultiplier !== oldBucket.confidenceMultiplier) {
      changes.push(`spreadMagnitude.${key}: multiplier ${oldBucket.confidenceMultiplier.toFixed(2)} → ${bucket.confidenceMultiplier.toFixed(2)}`);
    }
  }

  for (const [key, bucket] of Object.entries(newConfig.totalBucket)) {
    const oldBucket = oldConfig.totalBucket[key as keyof typeof oldConfig.totalBucket];
    if (!bucket.enabled && oldBucket.enabled) {
      changes.push(`totalBucket.${key}: DISABLED`);
    } else if (bucket.confidenceMultiplier !== oldBucket.confidenceMultiplier) {
      changes.push(`totalBucket.${key}: multiplier ${oldBucket.confidenceMultiplier.toFixed(2)} → ${bucket.confidenceMultiplier.toFixed(2)}`);
    }
  }

  for (const [key, band] of Object.entries(newConfig.confidenceBands)) {
    const oldBand = oldConfig.confidenceBands[key as keyof typeof oldConfig.confidenceBands];
    if (!band.enabled && oldBand.enabled) {
      changes.push(`confidenceBand.${key}: DISABLED`);
    } else if (band.confidenceMultiplier !== oldBand.confidenceMultiplier) {
      changes.push(`confidenceBand.${key}: multiplier ${oldBand.confidenceMultiplier.toFixed(2)} → ${band.confidenceMultiplier.toFixed(2)}`);
    }
  }

  return changes;
}
