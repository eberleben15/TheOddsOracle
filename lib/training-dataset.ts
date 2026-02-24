/**
 * Training Dataset Builder
 *
 * Builds datasets from validated predictions for historical calibration and ML.
 * Supports date-based splitting, export to JSON, and basic statistics.
 */

import { getValidatedPredictions } from "./prediction-tracker";
import { extractFeatures, type TrainingExample } from "./prediction-features";

export interface DatasetOptions {
  /** Optional sport filter */
  sport?: string;
  /** Include only examples after this date (ISO string or Date) */
  minDate?: string | Date;
  /** Include only examples before this date (ISO string or Date) */
  maxDate?: string | Date;
  /** Max number of examples (for quick experiments) */
  limit?: number;
}

export interface DatasetStats {
  count: number;
  dateRange: { min: string; max: string };
  sportBreakdown: Record<string, number>;
  hasTraceCount: number;
  withMarketLinesCount: number;
}

/**
 * Build a training dataset from validated predictions.
 */
export async function buildTrainingDataset(
  options: DatasetOptions = {}
): Promise<TrainingExample[]> {
  const validated = await getValidatedPredictions(options.sport);

  let examples: TrainingExample[] = [];
  for (const p of validated) {
    const ex = extractFeatures(p);
    if (!ex) continue;
    examples.push(ex);
  }

  if (options.minDate) {
    const min = typeof options.minDate === "string" ? options.minDate : options.minDate.toISOString();
    examples = examples.filter((e) => e.date >= min);
  }
  if (options.maxDate) {
    const max = typeof options.maxDate === "string" ? options.maxDate : options.maxDate.toISOString();
    examples = examples.filter((e) => e.date <= max);
  }

  if (options.limit != null && options.limit > 0) {
    examples = examples.slice(-options.limit);
  }

  return examples;
}

/**
 * Split dataset by date: train = before cutoff, test = on or after cutoff.
 */
export function splitByDate(
  examples: TrainingExample[],
  testCutoffDate: string | Date
): { train: TrainingExample[]; test: TrainingExample[] } {
  const cutoff =
    typeof testCutoffDate === "string" ? testCutoffDate : testCutoffDate.toISOString().split("T")[0];

  const train: TrainingExample[] = [];
  const test: TrainingExample[] = [];
  for (const ex of examples) {
    const exDate = ex.date.split("T")[0];
    if (exDate < cutoff) train.push(ex);
    else test.push(ex);
  }
  return { train, test };
}

/**
 * Time-based split: last N% of examples (by date) as test, rest as train.
 */
export function splitByTimeFraction(
  examples: TrainingExample[],
  testFraction: number = 0.2
): { train: TrainingExample[]; test: TrainingExample[] } {
  const sorted = [...examples].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const testCount = Math.max(0, Math.floor(n * testFraction));
  const trainCount = n - testCount;
  return {
    train: sorted.slice(0, trainCount),
    test: sorted.slice(trainCount),
  };
}

/**
 * Compute dataset statistics.
 */
export function getDatasetStats(examples: TrainingExample[]): DatasetStats {
  if (examples.length === 0) {
    return {
      count: 0,
      dateRange: { min: "", max: "" },
      sportBreakdown: {},
      hasTraceCount: 0,
      withMarketLinesCount: 0,
    };
  }

  const dates = examples.map((e) => e.date).sort();
  const sportBreakdown: Record<string, number> = {};
  let hasTraceCount = 0;
  let withMarketLinesCount = 0;

  for (const ex of examples) {
    sportBreakdown[ex.sport] = (sportBreakdown[ex.sport] ?? 0) + 1;
    if (ex.fourFactorsScore != null || ex.efficiencyScore != null || ex.totalScore !== 0) {
      hasTraceCount++;
    }
    if (ex.marketSpread != null || ex.marketTotal != null) {
      withMarketLinesCount++;
    }
  }

  return {
    count: examples.length,
    dateRange: { min: dates[0] ?? "", max: dates[dates.length - 1] ?? "" },
    sportBreakdown,
    hasTraceCount,
    withMarketLinesCount,
  };
}

/**
 * Export dataset to JSON (for external ML tools).
 */
export function exportToJson(examples: TrainingExample[]): string {
  return JSON.stringify(examples, null, 0);
}
