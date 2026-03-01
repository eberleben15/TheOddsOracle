/**
 * ATS Feedback Loop
 *
 * Feature correlation and segmentation analysis to identify which features
 * push or pull ATS performance. Use for model tuning and coefficient optimization.
 */

import type { TrainingExample } from "./prediction-features";
import { atsPerformance } from "./evaluation-harness";

/** Per-example ATS outcome: 1 = cover (win), -1 = no cover (loss), 0 = push */
export type ATSOutcome = 1 | -1 | 0;

/** Cover outcome + metadata for analysis */
export interface ATSSample {
  example: TrainingExample;
  cover: ATSOutcome;
  betOnHome: boolean;
  lineInOurFormat: number;
}

/** Feature correlation: ATS win rate when feature is above vs below median */
export interface FeatureATSReport {
  feature: string;
  /** Samples where feature value is available (non-null) */
  sampleCount: number;
  /** ATS win rate when feature >= median */
  winRateAboveMedian: number;
  /** ATS win rate when feature < median */
  winRateBelowMedian: number;
  /** Difference (above - below); positive = feature helps when high */
  delta: number;
  /** Correlation with cover (-1 to 1); undefined if not computable */
  correlation: number | undefined;
}

/** Segmentation slice result */
export interface SegmentationResult {
  segment: string;
  value: string;
  sampleCount: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
}

/** Feature importance (ranked by impact on ATS) */
export interface FeatureImportance {
  feature: string;
  /** Absolute correlation with cover; higher = more predictive */
  importance: number;
  /** Direction: positive = higher feature value associates with ATS win */
  direction: "positive" | "negative" | "neutral";
  sampleCount: number;
}

/** Weighted bias analysis */
export interface BiasAnalysis {
  segment: string;
  value: string;
  sampleCount: number;
  wins: number;
  losses: number;
  winRate: number;
  /** Weighted contribution to overall ATS (winRate * proportion) */
  weightedContribution: number;
  /** Net units at -110 juice */
  netUnits: number;
}

/** Adjustment recommendations */
export interface AdjustmentRecommendation {
  type: "disable" | "downweight" | "recalibrate" | "investigate";
  target: string;
  reason: string;
  severity: "high" | "medium" | "low";
  suggestedAction?: string;
}

/** Full ATS feedback report */
export interface ATSFeedbackReport {
  overall: {
    sampleCount: number;
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    netUnits: number; // at -110 juice
  };
  featureCorrelations: FeatureATSReport[];
  /** Features ranked by |correlation| with cover (importance) */
  featureImportance: FeatureImportance[];
  segmentations: {
    bySport: SegmentationResult[];
    byModelPath: SegmentationResult[];
    byConfidenceBand: SegmentationResult[];
    byHomeFavorite: SegmentationResult[];
    bySpreadMagnitude: SegmentationResult[];
    byTotalBucket: SegmentationResult[];
  };
  /** Weighted bias analysis */
  biasAnalysis: BiasAnalysis[];
  /** Automatic recommendations based on analysis */
  recommendations: AdjustmentRecommendation[];
  /** Advanced analytics from TensorFlow (Phase 3) */
  regressionFeatureImportance?: import("./ml-analytics").RegressionFeatureImportance[];
  confidenceIntervals?: {
    overall: { winRate: number; lower: number; upper: number };
    bySport?: Record<string, { winRate: number; lower: number; upper: number }>;
  };
}

/**
 * Get ATS samples (only examples with market spread).
 */
export function getATSSamples(examples: TrainingExample[]): ATSSample[] {
  const samples: ATSSample[] = [];

  for (const ex of examples) {
    if (ex.marketSpread == null) continue;

    const marketSpread = ex.marketSpread;
    const lineInOurFormat = -marketSpread;
    const actualMargin = ex.actualSpread;
    const betOnHome = ex.predictedSpread > 0;

    let coverRaw: number;
    if (betOnHome) {
      coverRaw = actualMargin - lineInOurFormat;
    } else {
      coverRaw = lineInOurFormat - actualMargin;
    }

    let cover: ATSOutcome;
    if (Math.abs(coverRaw) < 0.5) cover = 0;
    else if (coverRaw > 0) cover = 1;
    else cover = -1;

    samples.push({ example: ex, cover, betOnHome, lineInOurFormat });
  }

  return samples;
}

/**
 * Compute feature vs ATS correlation: win rate above vs below median.
 */
function computeFeatureCorrelation(
  samples: ATSSample[],
  getValue: (ex: TrainingExample) => number | null,
  featureName: string
): FeatureATSReport | null {
  const withValue = samples.filter((s) => getValue(s.example) != null);
  if (withValue.length < 10) return null;

  const values = withValue.map((s) => getValue(s.example)!);
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted[mid] ?? 0;

  const above = withValue.filter((s) => getValue(s.example)! >= median);
  const below = withValue.filter((s) => getValue(s.example)! < median);

  const winRate = (arr: ATSSample[]) => {
    const decided = arr.filter((s) => s.cover !== 0);
    if (decided.length === 0) return 0;
    return (decided.filter((s) => s.cover === 1).length / decided.length) * 100;
  };

  const corr = simpleCorrelation(
    withValue.map((s) => getValue(s.example)!),
    withValue.map((s) => (s.cover === 0 ? 0 : s.cover))
  );

  return {
    feature: featureName,
    sampleCount: withValue.length,
    winRateAboveMedian: winRate(above),
    winRateBelowMedian: winRate(below),
    delta: winRate(above) - winRate(below),
    correlation: corr,
  };
}

function simpleCorrelation(x: number[], y: number[]): number | undefined {
  if (x.length !== y.length || x.length < 3) return undefined;
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx;
    const dy = y[i]! - my;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  if (den < 1e-10) return undefined;
  return num / den;
}

/**
 * Segment samples and compute ATS win rate per segment.
 */
function segmentBy(
  samples: ATSSample[],
  getSegment: (ex: TrainingExample) => string
): SegmentationResult[] {
  const buckets = new Map<string, ATSSample[]>();
  for (const s of samples) {
    const key = getSegment(s.example);
    const arr = buckets.get(key) ?? [];
    arr.push(s);
    buckets.set(key, arr);
  }

  return Array.from(buckets.entries()).map(([value, arr]) => {
    const wins = arr.filter((s) => s.cover === 1).length;
    const losses = arr.filter((s) => s.cover === -1).length;
    const pushes = arr.filter((s) => s.cover === 0).length;
    const decided = wins + losses;
    return {
      segment: "segment",
      value,
      sampleCount: arr.length,
      wins,
      losses,
      pushes,
      winRate: decided > 0 ? (wins / decided) * 100 : 0,
    };
  });
}

/**
 * Run full ATS feedback analysis on training examples.
 */
export function runATSFeedbackReport(examples: TrainingExample[]): ATSFeedbackReport {
  const samples = getATSSamples(examples);

  if (samples.length === 0) {
    return {
      overall: { sampleCount: 0, wins: 0, losses: 0, pushes: 0, winRate: 0, netUnits: 0 },
      featureCorrelations: [],
      featureImportance: [],
      segmentations: {
        bySport: [],
        byModelPath: [],
        byConfidenceBand: [],
        byHomeFavorite: [],
        bySpreadMagnitude: [],
        byTotalBucket: [],
      },
      biasAnalysis: [],
      recommendations: [],
    };
  }

  const ats = atsPerformance(examples)!;

  const featureDefs: Array<{ name: string; get: (ex: TrainingExample) => number | null }> = [
    // Core prediction features
    { name: "homeWinProb", get: (ex) => ex.homeWinProb },
    { name: "homeWinProbRaw", get: (ex) => ex.homeWinProbRaw },
    { name: "totalScore", get: (ex) => ex.totalScore },
    { name: "fourFactorsScore", get: (ex) => ex.fourFactorsScore },
    { name: "efficiencyScore", get: (ex) => ex.efficiencyScore },
    { name: "tempoAdjustment", get: (ex) => ex.tempoAdjustment },
    { name: "homeAdvantage", get: (ex) => ex.homeAdvantage },
    { name: "momentumScore", get: (ex) => ex.momentumScore ?? null },
    { name: "confidence", get: (ex) => ex.confidence },
    { name: "predictedSpread", get: (ex) => ex.predictedSpread },
    { name: "predictedTotal", get: (ex) => ex.predictedTotal },
    
    // Derived features
    { name: "spreadMagnitude", get: (ex) => ex.spreadMagnitude ?? null },
    { name: "spreadDiff", get: (ex) => ex.spreadDiff ?? null },
    
    // Net ratings
    { name: "awayNetRating", get: (ex) => ex.awayNetRating ?? null },
    { name: "homeNetRating", get: (ex) => ex.homeNetRating ?? null },
    { name: "netRatingDiff", get: (ex) => ex.netRatingDiff ?? null },
    
    // Efficiency
    { name: "awayOffEff", get: (ex) => ex.awayOffEff ?? null },
    { name: "homeOffEff", get: (ex) => ex.homeOffEff ?? null },
    { name: "awayAdjOffEff", get: (ex) => ex.awayAdjOffEff ?? null },
    { name: "homeAdjOffEff", get: (ex) => ex.homeAdjOffEff ?? null },
    { name: "awayDefEff", get: (ex) => ex.awayDefEff ?? null },
    { name: "homeDefEff", get: (ex) => ex.homeDefEff ?? null },
    { name: "awayAdjDefEff", get: (ex) => ex.awayAdjDefEff ?? null },
    { name: "homeAdjDefEff", get: (ex) => ex.homeAdjDefEff ?? null },
    
    // Momentum
    { name: "awayMomentum", get: (ex) => ex.awayMomentum ?? null },
    { name: "homeMomentum", get: (ex) => ex.homeMomentum ?? null },
    { name: "momentumDiff", get: (ex) => ex.momentumDiff ?? null },
    { name: "awayWinStreak", get: (ex) => ex.awayWinStreak ?? null },
    { name: "homeWinStreak", get: (ex) => ex.homeWinStreak ?? null },
    { name: "awayLast5Wins", get: (ex) => ex.awayLast5Wins ?? null },
    { name: "homeLast5Wins", get: (ex) => ex.homeLast5Wins ?? null },
    
    // SOS
    { name: "awayStrengthOfSchedule", get: (ex) => ex.awayStrengthOfSchedule ?? null },
    { name: "homeStrengthOfSchedule", get: (ex) => ex.homeStrengthOfSchedule ?? null },
    { name: "sosDiff", get: (ex) => ex.sosDiff ?? null },
    
    // Shooting
    { name: "awayShootingEff", get: (ex) => ex.awayShootingEff ?? null },
    { name: "homeShootingEff", get: (ex) => ex.homeShootingEff ?? null },
    { name: "awayThreePointThreat", get: (ex) => ex.awayThreePointThreat ?? null },
    { name: "homeThreePointThreat", get: (ex) => ex.homeThreePointThreat ?? null },
    
    // Rebounding and playmaking
    { name: "awayReboundingAdv", get: (ex) => ex.awayReboundingAdv ?? null },
    { name: "homeReboundingAdv", get: (ex) => ex.homeReboundingAdv ?? null },
    { name: "awayAstToTov", get: (ex) => ex.awayAstToTov ?? null },
    { name: "homeAstToTov", get: (ex) => ex.homeAstToTov ?? null },
    
    // Consistency
    { name: "awayConsistency", get: (ex) => ex.awayConsistency ?? null },
    { name: "homeConsistency", get: (ex) => ex.homeConsistency ?? null },
  ];

  const featureCorrelations = featureDefs
    .map(({ name, get }) => computeFeatureCorrelation(samples, get, name))
    .filter((r): r is FeatureATSReport => r != null);

  const featureImportance: FeatureImportance[] = featureCorrelations
    .filter((f) => f.correlation != null)
    .map((f) => ({
      feature: f.feature,
      importance: Math.abs(f.correlation!),
      direction: (f.correlation! > 0.05
        ? "positive"
        : f.correlation! < -0.05
        ? "negative"
        : "neutral") as FeatureImportance["direction"],
      sampleCount: f.sampleCount,
    }))
    .sort((a, b) => b.importance - a.importance);

  const bySport = segmentBy(samples, (ex) => ex.sport).map((r) => ({ ...r, segment: "sport" }));
  const byModelPath = segmentBy(samples, (ex) =>
    ex.modelPathFourFactors === 1 ? "fourFactors" : "fallback"
  ).map((r) => ({ ...r, segment: "modelPath" }));
  const byConfidenceBand = segmentBy(samples, (ex) => {
    const c = ex.confidence;
    if (c < 50) return "low(<50)";
    if (c < 70) return "medium(50-70)";
    return "high(>=70)";
  }).map((r) => ({ ...r, segment: "confidenceBand" }));
  
  // Additional segmentations
  const byHomeFavorite = segmentBy(samples, (ex) => 
    ex.predictedSpread > 0 ? "home_favorite" : "away_favorite"
  ).map((r) => ({ ...r, segment: "homeFavorite" }));
  
  const bySpreadMagnitude = segmentBy(samples, (ex) => {
    const mag = Math.abs(ex.predictedSpread);
    if (mag < 3) return "small(<3)";
    if (mag < 7) return "medium(3-7)";
    if (mag < 12) return "large(7-12)";
    return "very_large(>=12)";
  }).map((r) => ({ ...r, segment: "spreadMagnitude" }));
  
  const byTotalBucket = segmentBy(samples, (ex) => {
    const t = ex.predictedTotal;
    if (t < 130) return "low(<130)";
    if (t < 145) return "medium(130-145)";
    if (t < 160) return "high(145-160)";
    return "very_high(>=160)";
  }).map((r) => ({ ...r, segment: "totalBucket" }));
  
  // Build bias analysis with weighted contributions
  const totalDecided = ats.wins + ats.losses;
  const allSegments = [
    ...bySport.map((s) => ({ ...s, segment: "sport" })),
    ...byHomeFavorite.map((s) => ({ ...s, segment: "homeFavorite" })),
    ...bySpreadMagnitude.map((s) => ({ ...s, segment: "spreadMagnitude" })),
    ...byTotalBucket.map((s) => ({ ...s, segment: "totalBucket" })),
    ...byConfidenceBand.map((s) => ({ ...s, segment: "confidenceBand" })),
  ];
  
  const biasAnalysis: BiasAnalysis[] = allSegments.map((s) => {
    const decided = s.wins + s.losses;
    const proportion = totalDecided > 0 ? decided / totalDecided : 0;
    const netUnits = computeNetUnits(s.wins, s.losses);
    return {
      segment: s.segment,
      value: s.value,
      sampleCount: s.sampleCount,
      wins: s.wins,
      losses: s.losses,
      winRate: s.winRate,
      weightedContribution: s.winRate * proportion,
      netUnits,
    };
  }).sort((a, b) => a.winRate - b.winRate); // worst first
  
  // Generate recommendations
  const recommendations = generateRecommendations(bySport, byConfidenceBand, bySpreadMagnitude, byTotalBucket, ats.winRate);
  
  // Overall net units
  const overallNetUnits = computeNetUnits(ats.wins, ats.losses);

  return {
    overall: {
      sampleCount: samples.length,
      wins: ats.wins,
      losses: ats.losses,
      pushes: ats.pushes,
      winRate: ats.winRate,
      netUnits: overallNetUnits,
    },
    featureCorrelations,
    featureImportance,
    segmentations: {
      bySport,
      byModelPath,
      byConfidenceBand,
      byHomeFavorite,
      bySpreadMagnitude,
      byTotalBucket,
    },
    biasAnalysis,
    recommendations,
  };
}

/** Compute net units at -110 juice */
function computeNetUnits(wins: number, losses: number): number {
  // Win pays 0.91 units, loss costs 1 unit
  return wins * 0.91 - losses;
}

/** Generate automatic recommendations based on analysis */
function generateRecommendations(
  bySport: SegmentationResult[],
  byConfidenceBand: SegmentationResult[],
  bySpreadMagnitude: SegmentationResult[],
  byTotalBucket: SegmentationResult[],
  overallWinRate: number
): AdjustmentRecommendation[] {
  const recs: AdjustmentRecommendation[] = [];
  
  // Check for disastrous sport segments
  for (const s of bySport) {
    const decided = s.wins + s.losses;
    if (decided >= 10 && s.winRate < 35) {
      recs.push({
        type: "disable",
        target: `sport:${s.value}`,
        reason: `${s.value} ATS is ${s.winRate.toFixed(1)}% (${s.wins}-${s.losses}) — significantly below break-even`,
        severity: "high",
        suggestedAction: `Disable spread recommendations for ${s.value} until model is recalibrated`,
      });
    } else if (decided >= 10 && s.winRate < 45) {
      recs.push({
        type: "downweight",
        target: `sport:${s.value}`,
        reason: `${s.value} ATS is ${s.winRate.toFixed(1)}% — below profitable threshold`,
        severity: "medium",
        suggestedAction: `Reduce confidence for ${s.value} predictions by 20%`,
      });
    }
  }
  
  // Check for inverted confidence
  const highConf = byConfidenceBand.find((s) => s.value.includes("high"));
  const medConf = byConfidenceBand.find((s) => s.value.includes("medium"));
  const lowConf = byConfidenceBand.find((s) => s.value.includes("low"));
  
  if (highConf && medConf && highConf.wins + highConf.losses >= 10 && medConf.wins + medConf.losses >= 10) {
    if (highConf.winRate < medConf.winRate - 5) {
      recs.push({
        type: "recalibrate",
        target: "confidence",
        reason: `High confidence (${highConf.winRate.toFixed(1)}%) underperforms medium (${medConf.winRate.toFixed(1)}%)`,
        severity: "high",
        suggestedAction: "Recalibrate confidence scoring — it's inversely correlated with ATS success",
      });
    }
  }
  
  // Check for problematic spread magnitudes
  for (const s of bySpreadMagnitude) {
    const decided = s.wins + s.losses;
    if (decided >= 10 && s.winRate < 40) {
      recs.push({
        type: "investigate",
        target: `spreadMagnitude:${s.value}`,
        reason: `${s.value} spreads have ${s.winRate.toFixed(1)}% ATS`,
        severity: "medium",
        suggestedAction: `Consider adjusting spread predictions in this range or reducing confidence`,
      });
    }
  }
  
  // Check for problematic total buckets
  for (const s of byTotalBucket) {
    const decided = s.wins + s.losses;
    if (decided >= 10 && s.winRate < 40) {
      recs.push({
        type: "investigate",
        target: `totalBucket:${s.value}`,
        reason: `${s.value} total games have ${s.winRate.toFixed(1)}% ATS`,
        severity: "medium",
        suggestedAction: `Model struggles with ${s.value} tempo games — consider tempo-specific adjustments`,
      });
    }
  }
  
  return recs.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });
}

/**
 * Format report as human-readable string.
 */
export function formatATSFeedbackReport(report: ATSFeedbackReport): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("                    ATS FEEDBACK REPORT                         ");
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  
  // Overall summary
  const netUnitsStr = report.overall.netUnits >= 0 
    ? `+${report.overall.netUnits.toFixed(2)}u` 
    : `${report.overall.netUnits.toFixed(2)}u`;
  lines.push(
    `Overall: ${report.overall.wins}-${report.overall.losses}-${report.overall.pushes} (${report.overall.winRate.toFixed(1)}%) | Net: ${netUnitsStr} | n=${report.overall.sampleCount}`
  );
  lines.push("");

  // Recommendations (if any)
  if (report.recommendations.length > 0) {
    lines.push("🚨 RECOMMENDATIONS");
    lines.push("─".repeat(60));
    for (const r of report.recommendations) {
      const icon = r.severity === "high" ? "🔴" : r.severity === "medium" ? "🟡" : "🟢";
      lines.push(`${icon} [${r.type.toUpperCase()}] ${r.target}`);
      lines.push(`   Reason: ${r.reason}`);
      if (r.suggestedAction) {
        lines.push(`   Action: ${r.suggestedAction}`);
      }
      lines.push("");
    }
  }

  // Feature importance (top 15)
  lines.push("── Feature Importance (by |correlation| with cover) ──");
  const featsWithData = report.featureImportance.filter((f) => f.sampleCount >= 10);
  for (const f of featsWithData.slice(0, 15)) {
    const dir = f.direction === "positive" ? "↑" : f.direction === "negative" ? "↓" : "·";
    lines.push(`  ${f.feature.padEnd(24)} ${f.importance.toFixed(3)} ${dir}  (n=${f.sampleCount})`);
  }
  lines.push("");

  // Segmentations
  const printSegment = (title: string, segments: SegmentationResult[]) => {
    lines.push(`── ${title} ──`);
    for (const s of segments) {
      const decided = s.wins + s.losses;
      const netU = computeNetUnits(s.wins, s.losses);
      const netStr = netU >= 0 ? `+${netU.toFixed(2)}u` : `${netU.toFixed(2)}u`;
      const flag = s.winRate < 40 && decided >= 10 ? " ⚠️" : s.winRate >= 52.4 && decided >= 10 ? " ✅" : "";
      lines.push(
        `  ${s.value.padEnd(24)} ${s.wins}-${s.losses}-${s.pushes}  ${s.winRate.toFixed(1)}%  ${netStr.padStart(8)}${flag}`
      );
    }
    lines.push("");
  };

  printSegment("By Sport", report.segmentations.bySport);
  printSegment("By Home/Away Favorite", report.segmentations.byHomeFavorite);
  
  const spreadMagOrder = ["small(<3)", "medium(3-7)", "large(7-12)", "very_large(>=12)"];
  const spreadSorted = [...report.segmentations.bySpreadMagnitude].sort(
    (a, b) => spreadMagOrder.indexOf(a.value) - spreadMagOrder.indexOf(b.value)
  );
  printSegment("By Spread Magnitude", spreadSorted);
  
  const totalOrder = ["low(<130)", "medium(130-145)", "high(145-160)", "very_high(>=160)"];
  const totalSorted = [...report.segmentations.byTotalBucket].sort(
    (a, b) => totalOrder.indexOf(a.value) - totalOrder.indexOf(b.value)
  );
  printSegment("By Total Bucket", totalSorted);

  const confOrder = ["low(<50)", "medium(50-70)", "high(>=70)"];
  const confSorted = [...report.segmentations.byConfidenceBand].sort(
    (a, b) => confOrder.indexOf(a.value) - confOrder.indexOf(b.value)
  );
  printSegment("By Confidence Band", confSorted);

  printSegment("By Model Path", report.segmentations.byModelPath);

  // Worst segments (bias analysis)
  lines.push("── Worst Performing Segments ──");
  const worstBias = report.biasAnalysis
    .filter((b) => b.wins + b.losses >= 10)
    .sort((a, b) => a.winRate - b.winRate)
    .slice(0, 5);
  for (const b of worstBias) {
    const netStr = b.netUnits >= 0 ? `+${b.netUnits.toFixed(2)}u` : `${b.netUnits.toFixed(2)}u`;
    lines.push(
      `  ${b.segment}:${b.value}`.padEnd(36) + `${b.wins}-${b.losses}  ${b.winRate.toFixed(1)}%  ${netStr}`
    );
  }
  lines.push("");

  // Feature correlations (detailed)
  lines.push("── Feature vs ATS (above vs below median) ──");
  const sorted = [...report.featureCorrelations]
    .filter((f) => f.sampleCount >= 10)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 20);
  for (const f of sorted) {
    const corr = f.correlation != null ? ` r=${f.correlation.toFixed(3)}` : "";
    lines.push(
      `  ${f.feature.padEnd(24)} above=${f.winRateAboveMedian.toFixed(1)}% below=${f.winRateBelowMedian.toFixed(1)}% Δ=${(f.delta >= 0 ? "+" : "") + f.delta.toFixed(1)}%${corr}`
    );
  }

  return lines.join("\n");
}

/**
 * Run advanced ATS feedback report with TensorFlow regression and bootstrap CIs.
 */
export async function runATSFeedbackReportAdvanced(
  examples: TrainingExample[]
): Promise<ATSFeedbackReport> {
  const baseReport = runATSFeedbackReport(examples);
  const samples = getATSSamples(examples);
  
  if (samples.length < 50) {
    // Not enough data for advanced analytics
    return baseReport;
  }
  
  // Add regression-based feature importance
  let regressionImportance;
  try {
    const { logisticRegressionFeatureImportance } = await import("./ml-analytics");
    regressionImportance = await logisticRegressionFeatureImportance(examples);
  } catch (err) {
    console.warn("Could not compute regression importance:", err);
  }
  
  // Add bootstrap confidence intervals
  let overallCI;
  try {
    const { bootstrapConfidenceIntervals } = await import("./ml-analytics");
    overallCI = await bootstrapConfidenceIntervals(samples, 1000);
  } catch (err) {
    console.warn("Could not compute confidence intervals:", err);
  }
  
  // Compute per-sport CIs
  const bySportCI: Record<string, { winRate: number; lower: number; upper: number }> = {};
  if (overallCI) {
    try {
      const { bootstrapConfidenceIntervals } = await import("./ml-analytics");
      for (const sportSeg of baseReport.segmentations.bySport) {
        const sportSamples = samples.filter(s => 
          s.example.sport?.toLowerCase().includes(sportSeg.value.toLowerCase())
        );
        if (sportSamples.length >= 20) {
          bySportCI[sportSeg.value] = await bootstrapConfidenceIntervals(sportSamples, 1000);
        }
      }
    } catch (err) {
      console.warn("Could not compute per-sport CIs:", err);
    }
  }
  
  return {
    ...baseReport,
    regressionFeatureImportance: regressionImportance,
    confidenceIntervals: overallCI ? {
      overall: overallCI,
      bySport: bySportCI,
    } : undefined,
  };
}
