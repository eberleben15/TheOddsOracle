/**
 * Feedback Pipeline Configuration
 *
 * Configurable settings for the ATS feedback loop. Adjust these based on
 * feedback analysis to improve model performance.
 */

import { prisma } from "./prisma";

const PIPELINE_CONFIG_KEY = "ats_pipeline_config";

/** Sport-specific confidence adjustment */
export interface SportConfig {
  enabled: boolean;
  confidenceMultiplier: number; // 0.0-1.5; <1 = downweight, >1 = boost
  minConfidenceThreshold: number; // Skip recommendations below this
}

/** Spread magnitude adjustment */
export interface SpreadMagnitudeConfig {
  smallSpread: { enabled: boolean; confidenceMultiplier: number }; // |spread| < 3
  mediumSpread: { enabled: boolean; confidenceMultiplier: number }; // 3 <= |spread| < 7
  largeSpread: { enabled: boolean; confidenceMultiplier: number }; // 7 <= |spread| < 12
  veryLargeSpread: { enabled: boolean; confidenceMultiplier: number }; // |spread| >= 12
}

/** Total bucket adjustment */
export interface TotalBucketConfig {
  lowTotal: { enabled: boolean; confidenceMultiplier: number }; // total < 130
  mediumTotal: { enabled: boolean; confidenceMultiplier: number }; // 130-145
  highTotal: { enabled: boolean; confidenceMultiplier: number }; // 145-160
  veryHighTotal: { enabled: boolean; confidenceMultiplier: number }; // >= 160
}

/** Feature weight overrides */
export interface FeatureWeightConfig {
  /** Features with |correlation| > threshold are considered significant */
  significanceThreshold: number;
  /** Per-feature weight overrides (multiplicative) */
  overrides: Record<string, number>;
}

/** Full pipeline configuration */
export interface FeedbackPipelineConfig {
  version: number;
  updatedAt: string;
  
  /** Validation mode for safe rollout */
  validationMode?: "live" | "shadow" | "ab_test";
  abTestName?: string;
  abTestVariant?: "control" | "treatment";
  
  /** Sport-specific settings */
  sports: {
    basketball_ncaab: SportConfig;
    basketball_nba: SportConfig;
    icehockey_nhl: SportConfig;
    baseball_mlb: SportConfig;
  };
  
  /** Spread magnitude adjustments */
  spreadMagnitude: SpreadMagnitudeConfig;
  
  /** Total bucket adjustments */
  totalBucket: TotalBucketConfig;
  
  /** Confidence band adjustments */
  confidenceBands: {
    low: { enabled: boolean; confidenceMultiplier: number }; // < 50
    medium: { enabled: boolean; confidenceMultiplier: number }; // 50-70
    high: { enabled: boolean; confidenceMultiplier: number }; // >= 70
  };
  
  /** Feature weight configuration */
  featureWeights: FeatureWeightConfig;
  
  /** Global settings */
  global: {
    minSampleSizeForAdjustment: number;
    winRateThresholdForDisable: number;
    winRateThresholdForDownweight: number;
    targetWinRate: number; // Break-even at -110 juice
  };
}

/** Default configuration (neutral — no adjustments) */
export const DEFAULT_PIPELINE_CONFIG: FeedbackPipelineConfig = {
  version: 1,
  updatedAt: new Date().toISOString(),
  
  sports: {
    basketball_ncaab: { enabled: true, confidenceMultiplier: 1.0, minConfidenceThreshold: 0 },
    basketball_nba: { enabled: true, confidenceMultiplier: 1.0, minConfidenceThreshold: 0 },
    icehockey_nhl: { enabled: true, confidenceMultiplier: 1.0, minConfidenceThreshold: 0 },
    baseball_mlb: { enabled: true, confidenceMultiplier: 1.0, minConfidenceThreshold: 0 },
  },
  
  spreadMagnitude: {
    smallSpread: { enabled: true, confidenceMultiplier: 1.0 },
    mediumSpread: { enabled: true, confidenceMultiplier: 1.0 },
    largeSpread: { enabled: true, confidenceMultiplier: 1.0 },
    veryLargeSpread: { enabled: true, confidenceMultiplier: 1.0 },
  },
  
  totalBucket: {
    lowTotal: { enabled: true, confidenceMultiplier: 1.0 },
    mediumTotal: { enabled: true, confidenceMultiplier: 1.0 },
    highTotal: { enabled: true, confidenceMultiplier: 1.0 },
    veryHighTotal: { enabled: true, confidenceMultiplier: 1.0 },
  },
  
  confidenceBands: {
    low: { enabled: true, confidenceMultiplier: 1.0 },
    medium: { enabled: true, confidenceMultiplier: 1.0 },
    high: { enabled: true, confidenceMultiplier: 1.0 },
  },
  
  featureWeights: {
    significanceThreshold: 0.1,
    overrides: {},
  },
  
  global: {
    minSampleSizeForAdjustment: 10,
    winRateThresholdForDisable: 35,
    winRateThresholdForDownweight: 45,
    targetWinRate: 52.4, // Break-even at -110 juice
  },
};

/**
 * Generate a config based on ATS feedback report.
 * Automatically disables/downweights underperforming segments.
 */
export function generateConfigFromFeedback(
  report: import("./ats-feedback").ATSFeedbackReport,
  baseConfig: FeedbackPipelineConfig = DEFAULT_PIPELINE_CONFIG
): FeedbackPipelineConfig {
  const config = JSON.parse(JSON.stringify(baseConfig)) as FeedbackPipelineConfig;
  config.updatedAt = new Date().toISOString();
  config.version = baseConfig.version + 1;
  
  const minN = config.global.minSampleSizeForAdjustment;
  const disableThresh = config.global.winRateThresholdForDisable;
  const downweightThresh = config.global.winRateThresholdForDownweight;
  
  // Adjust sports
  for (const s of report.segmentations.bySport) {
    const decided = s.wins + s.losses;
    const sportKey = s.value as keyof typeof config.sports;
    if (!(sportKey in config.sports)) continue;
    
    if (decided >= minN) {
      if (s.winRate < disableThresh) {
        config.sports[sportKey].enabled = false;
        config.sports[sportKey].confidenceMultiplier = 0;
      } else if (s.winRate < downweightThresh) {
        config.sports[sportKey].confidenceMultiplier = 0.5 + (s.winRate - disableThresh) / (downweightThresh - disableThresh) * 0.3;
      } else if (s.winRate >= config.global.targetWinRate) {
        config.sports[sportKey].confidenceMultiplier = Math.min(1.2, 1.0 + (s.winRate - config.global.targetWinRate) / 20);
      }
    }
  }
  
  // Adjust spread magnitudes
  const spreadMap: Record<string, keyof SpreadMagnitudeConfig> = {
    "small(<3)": "smallSpread",
    "medium(3-7)": "mediumSpread",
    "large(7-12)": "largeSpread",
    "very_large(>=12)": "veryLargeSpread",
  };
  for (const s of report.segmentations.bySpreadMagnitude) {
    const key = spreadMap[s.value];
    if (!key) continue;
    const decided = s.wins + s.losses;
    if (decided >= minN) {
      if (s.winRate < disableThresh) {
        config.spreadMagnitude[key].enabled = false;
        config.spreadMagnitude[key].confidenceMultiplier = 0;
      } else if (s.winRate < downweightThresh) {
        config.spreadMagnitude[key].confidenceMultiplier = 0.6;
      }
    }
  }
  
  // Adjust total buckets
  const totalMap: Record<string, keyof TotalBucketConfig> = {
    "low(<130)": "lowTotal",
    "medium(130-145)": "mediumTotal",
    "high(145-160)": "highTotal",
    "very_high(>=160)": "veryHighTotal",
  };
  for (const s of report.segmentations.byTotalBucket) {
    const key = totalMap[s.value];
    if (!key) continue;
    const decided = s.wins + s.losses;
    if (decided >= minN) {
      if (s.winRate < disableThresh) {
        config.totalBucket[key].enabled = false;
        config.totalBucket[key].confidenceMultiplier = 0;
      } else if (s.winRate < downweightThresh) {
        config.totalBucket[key].confidenceMultiplier = 0.6;
      }
    }
  }
  
  // Adjust confidence bands
  const confMap: Record<string, keyof typeof config.confidenceBands> = {
    "low(<50)": "low",
    "medium(50-70)": "medium",
    "high(>=70)": "high",
  };
  for (const s of report.segmentations.byConfidenceBand) {
    const key = confMap[s.value];
    if (!key) continue;
    const decided = s.wins + s.losses;
    if (decided >= minN && s.winRate < downweightThresh) {
      config.confidenceBands[key].confidenceMultiplier = 0.7;
    }
  }
  
  return config;
}

/**
 * Apply config to adjust a prediction's confidence.
 * Returns adjusted confidence (0-100) or null if prediction should be skipped.
 */
export function applyConfigToConfidence(
  rawConfidence: number,
  sport: string,
  predictedSpread: number,
  predictedTotal: number,
  config: FeedbackPipelineConfig
): number | null {
  let multiplier = 1.0;
  
  // Sport adjustment
  const sportConfig = config.sports[sport as keyof typeof config.sports];
  if (sportConfig) {
    if (!sportConfig.enabled) return null;
    if (rawConfidence < sportConfig.minConfidenceThreshold) return null;
    multiplier *= sportConfig.confidenceMultiplier;
  }
  
  // Spread magnitude adjustment
  const spreadMag = Math.abs(predictedSpread);
  if (spreadMag < 3) {
    if (!config.spreadMagnitude.smallSpread.enabled) return null;
    multiplier *= config.spreadMagnitude.smallSpread.confidenceMultiplier;
  } else if (spreadMag < 7) {
    if (!config.spreadMagnitude.mediumSpread.enabled) return null;
    multiplier *= config.spreadMagnitude.mediumSpread.confidenceMultiplier;
  } else if (spreadMag < 12) {
    if (!config.spreadMagnitude.largeSpread.enabled) return null;
    multiplier *= config.spreadMagnitude.largeSpread.confidenceMultiplier;
  } else {
    if (!config.spreadMagnitude.veryLargeSpread.enabled) return null;
    multiplier *= config.spreadMagnitude.veryLargeSpread.confidenceMultiplier;
  }
  
  // Total bucket adjustment
  if (predictedTotal < 130) {
    if (!config.totalBucket.lowTotal.enabled) return null;
    multiplier *= config.totalBucket.lowTotal.confidenceMultiplier;
  } else if (predictedTotal < 145) {
    if (!config.totalBucket.mediumTotal.enabled) return null;
    multiplier *= config.totalBucket.mediumTotal.confidenceMultiplier;
  } else if (predictedTotal < 160) {
    if (!config.totalBucket.highTotal.enabled) return null;
    multiplier *= config.totalBucket.highTotal.confidenceMultiplier;
  } else {
    if (!config.totalBucket.veryHighTotal.enabled) return null;
    multiplier *= config.totalBucket.veryHighTotal.confidenceMultiplier;
  }
  
  // Confidence band adjustment
  if (rawConfidence < 50) {
    if (!config.confidenceBands.low.enabled) return null;
    multiplier *= config.confidenceBands.low.confidenceMultiplier;
  } else if (rawConfidence < 70) {
    if (!config.confidenceBands.medium.enabled) return null;
    multiplier *= config.confidenceBands.medium.confidenceMultiplier;
  } else {
    if (!config.confidenceBands.high.enabled) return null;
    multiplier *= config.confidenceBands.high.confidenceMultiplier;
  }
  
  return Math.max(0, Math.min(100, rawConfidence * multiplier));
}

/**
 * Serialize config to JSON for storage.
 */
export function serializeConfig(config: FeedbackPipelineConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Parse config from JSON.
 */
export function parseConfig(json: string): FeedbackPipelineConfig {
  const parsed = JSON.parse(json);
  // Merge with defaults to handle missing fields
  return { ...DEFAULT_PIPELINE_CONFIG, ...parsed };
}

/**
 * Load pipeline config from database.
 * Returns null if not configured (uses defaults).
 */
export async function loadPipelineConfig(): Promise<FeedbackPipelineConfig | null> {
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

/**
 * Save pipeline config to database.
 */
export async function savePipelineConfig(config: FeedbackPipelineConfig): Promise<void> {
  try {
    await prisma.modelConfig.upsert({
      where: { key: PIPELINE_CONFIG_KEY },
      create: { key: PIPELINE_CONFIG_KEY, value: config as any },
      update: { value: config as any },
    });
  } catch (error) {
    console.warn("Could not persist pipeline config:", error);
  }
}

/**
 * Get pipeline config for use in recommendations.
 * Returns persisted config if available, otherwise defaults.
 */
export async function getPipelineConfigForRecommendations(): Promise<FeedbackPipelineConfig> {
  const loaded = await loadPipelineConfig();
  return loaded ?? DEFAULT_PIPELINE_CONFIG;
}

/**
 * Get config for specific user, respecting A/B test assignments.
 */
export async function getConfigForUser(
  userId: string,
  baseConfig?: FeedbackPipelineConfig
): Promise<FeedbackPipelineConfig> {
  const config = baseConfig ?? await getPipelineConfigForRecommendations();
  
  if (config.validationMode === "ab_test" && config.abTestName) {
    const { assignUserToVariant } = await import("./ab-testing");
    const variant = await assignUserToVariant(userId, config.abTestName);
    
    if (variant === "control") {
      // Return previous config version (or default if version 1)
      const controlConfig = await getConfigByVersion(config.version - 1);
      return controlConfig ?? DEFAULT_PIPELINE_CONFIG;
    }
  }
  
  return config;
}

/**
 * Get current config version number.
 */
export async function getCurrentConfigVersion(): Promise<number> {
  const config = await loadPipelineConfig();
  return config?.version ?? 0;
}

/**
 * Increment config version and return updated config.
 */
export function incrementConfigVersion(
  config: FeedbackPipelineConfig
): FeedbackPipelineConfig {
  return {
    ...config,
    version: config.version + 1,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Get config by specific version number.
 */
export async function getConfigByVersion(version: number): Promise<FeedbackPipelineConfig | null> {
  // For now, we only store the latest config
  // In a full implementation, we'd store version history in a separate table
  const current = await loadPipelineConfig();
  if (current && current.version === version) {
    return current;
  }
  return null;
}
