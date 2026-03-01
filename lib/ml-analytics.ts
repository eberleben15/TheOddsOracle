/**
 * ML Analytics with TensorFlow.js
 *
 * Provides regression-based feature importance and bootstrap confidence intervals.
 */

import * as tf from "@tensorflow/tfjs-node";
import type { TrainingExample } from "./prediction-features";
import { getATSSamples, type ATSSample } from "./ats-feedback";

export interface RegressionFeatureImportance {
  feature: string;
  coefficient: number;
  absCoefficient: number;
  pValue: number;
  significant: boolean;
}

/**
 * Compute feature importance using logistic regression.
 * Returns coefficients indicating which features best predict ATS success.
 */
export async function logisticRegressionFeatureImportance(
  examples: TrainingExample[]
): Promise<RegressionFeatureImportance[]> {
  const samples = getATSSamples(examples);
  if (samples.length < 50) {
    throw new Error("Need at least 50 samples for regression");
  }
  
  // Extract features and outcomes
  const { features, outcomes, featureNames } = extractFeatureMatrix(samples);
  
  // Create TensorFlow tensors
  const X = tf.tensor2d(features);
  const y = tf.tensor1d(outcomes);
  
  // Build logistic regression model with L1 regularization
  const model = tf.sequential({
    layers: [
      tf.layers.dense({
        inputShape: [features[0].length],
        units: 1,
        activation: "sigmoid",
        kernelRegularizer: tf.regularizers.l1({ l1: 0.01 }),
      }),
    ],
  });
  
  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
  });
  
  // Train model
  await model.fit(X, y, {
    epochs: 100,
    batchSize: 32,
    validationSplit: 0.2,
    verbose: 0,
  });
  
  // Extract coefficients
  const weights = model.layers[0].getWeights()[0];
  const coefficients = await weights.data();
  
  // Map back to feature names
  const importance: RegressionFeatureImportance[] = featureNames.map((name, i) => ({
    feature: name,
    coefficient: coefficients[i],
    absCoefficient: Math.abs(coefficients[i]),
    pValue: 0, // TODO: Bootstrap for p-values
    significant: Math.abs(coefficients[i]) > 0.01,
  }));
  
  // Cleanup
  X.dispose();
  y.dispose();
  model.dispose();
  
  return importance.sort((a, b) => b.absCoefficient - a.absCoefficient);
}

/**
 * Extract feature matrix from ATS samples.
 */
function extractFeatureMatrix(samples: ATSSample[]): {
  features: number[][];
  outcomes: number[];
  featureNames: string[];
} {
  const featureNames = [
    "homeWinProb",
    "predictedSpread",
    "confidence",
    "homeNetRating",
    "awayNetRating",
    "homeMomentum",
    "awayMomentum",
    "momentumDiff",
    "sosDiff",
    "homeOffensiveRating",
    "awayOffensiveRating",
    "homeDefensiveRating",
    "awayDefensiveRating",
    "homeOffensiveEfficiency",
    "awayOffensiveEfficiency",
    "homeDefensiveEfficiency",
    "awayDefensiveEfficiency",
    "homeWinStreak",
    "awayWinStreak",
    "homeLast5Wins",
    "awayLast5Wins",
    "homeShootingEfficiency",
    "awayShootingEfficiency",
    "homeThreePointThreat",
    "awayThreePointThreat",
    "homeFreeThrowReliability",
    "awayFreeThrowReliability",
    "homeReboundingAdvantage",
    "awayReboundingAdvantage",
    "homeAssistToTurnoverRatio",
    "awayAssistToTurnoverRatio",
    "homeConsistency",
    "awayConsistency",
  ];
  
  const features = samples.map(s => {
    const ex = s.example;
    return [
      ex.homeWinProb ?? 0.5,
      ex.predictedSpread ?? 0,
      ex.confidence ?? 50,
      ex.homeNetRating ?? 0,
      ex.awayNetRating ?? 0,
      ex.homeMomentum ?? 0,
      ex.awayMomentum ?? 0,
      ex.momentumDiff ?? 0,
      ex.sosDiff ?? 0,
      ex.homeOffensiveRating ?? 0,
      ex.awayOffensiveRating ?? 0,
      ex.homeDefensiveRating ?? 0,
      ex.awayDefensiveRating ?? 0,
      ex.homeOffensiveEfficiency ?? 0,
      ex.awayOffensiveEfficiency ?? 0,
      ex.homeDefensiveEfficiency ?? 0,
      ex.awayDefensiveEfficiency ?? 0,
      ex.homeWinStreak ?? 0,
      ex.awayWinStreak ?? 0,
      ex.homeLast5Wins ?? 0,
      ex.awayLast5Wins ?? 0,
      ex.homeShootingEfficiency ?? 0,
      ex.awayShootingEfficiency ?? 0,
      ex.homeThreePointThreat ?? 0,
      ex.awayThreePointThreat ?? 0,
      ex.homeFreeThrowReliability ?? 0,
      ex.awayFreeThrowReliability ?? 0,
      ex.homeReboundingAdvantage ?? 0,
      ex.awayReboundingAdvantage ?? 0,
      ex.homeAssistToTurnoverRatio ?? 0,
      ex.awayAssistToTurnoverRatio ?? 0,
      ex.homeConsistency ?? 0,
      ex.awayConsistency ?? 0,
    ];
  });
  
  const outcomes = samples.map(s => s.cover === 1 ? 1 : 0);
  
  return { features, outcomes, featureNames };
}

/**
 * Calculate bootstrap confidence intervals for win rate.
 */
export async function bootstrapConfidenceIntervals(
  samples: ATSSample[],
  iterations: number = 1000
): Promise<{ winRate: number; lower: number; upper: number }> {
  const winRates: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    // Resample with replacement
    const resampled = [];
    for (let j = 0; j < samples.length; j++) {
      const idx = Math.floor(Math.random() * samples.length);
      resampled.push(samples[idx]);
    }
    
    // Calculate win rate for this bootstrap sample
    const decided = resampled.filter(s => s.cover !== 0);
    if (decided.length > 0) {
      const wr = (decided.filter(s => s.cover === 1).length / decided.length) * 100;
      winRates.push(wr);
    }
  }
  
  winRates.sort((a, b) => a - b);
  const lower = winRates[Math.floor(iterations * 0.025)] ?? 0;
  const upper = winRates[Math.floor(iterations * 0.975)] ?? 0;
  
  const decided = samples.filter(s => s.cover !== 0);
  const actualWinRate = decided.length > 0 
    ? (decided.filter(s => s.cover === 1).length / decided.length) * 100 
    : 0;
  
  return { winRate: actualWinRate, lower, upper };
}

/**
 * Calculate bootstrap confidence intervals for a metric function.
 */
export async function bootstrapMetric<T>(
  data: T[],
  metricFn: (sample: T[]) => number,
  iterations: number = 1000
): Promise<{ value: number; lower: number; upper: number }> {
  const values: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    // Resample with replacement
    const resampled = [];
    for (let j = 0; j < data.length; j++) {
      const idx = Math.floor(Math.random() * data.length);
      resampled.push(data[idx]);
    }
    
    const value = metricFn(resampled);
    if (!Number.isNaN(value) && Number.isFinite(value)) {
      values.push(value);
    }
  }
  
  values.sort((a, b) => a - b);
  const lower = values[Math.floor(iterations * 0.025)] ?? 0;
  const upper = values[Math.floor(iterations * 0.975)] ?? 0;
  
  const actualValue = metricFn(data);
  
  return { value: actualValue, lower, upper };
}
