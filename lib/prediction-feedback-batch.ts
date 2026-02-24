/**
 * Prediction Feedback Batch Job
 *
 * 1. Batch check: fetches scores for ALL unvalidated predictions whose game date has passed.
 * 2. Records outcomes for any matched completed games.
 * 3. Trains model: fits Platt scaling from validated predictions and persists params.
 *
 * Matching strategy:
 * - PRIMARY: Odds API completed scores (game IDs match exactly - most reliable).
 * - FALLBACK: ESPN APIs + team-name matching (for games outside Odds API window).
 *
 * Known limitation: Postponed/cancelled games are not explicitly detected. See
 * docs/PREDICTION_VALIDATION_KNOWN_LIMITATIONS.md.
 */

import { getCompletedScoresBySport } from "./odds-api";
import type { LiveGame } from "@/types";
import { getGamesByDate } from "./sportsdata-api";
import { espnNBAClient, espnNHLClient, espnMLBClient } from "./api-clients/espn-sport-client";
import {
  getUnvalidatedPredictions,
  recordOutcomeByMatchup,
  recordOutcomeByGameId,
  getValidatedPredictions,
  getTrackingStats,
  TrackedPrediction,
} from "./prediction-tracker";
import { fitFromValidations, setRecalibrationParams, type RecalibrationParams } from "./recalibration";
import type { Prisma } from "@/generated/prisma-client/client";
import { prisma } from "./prisma";
import { generatePerformanceReport } from "./validation-dashboard";
import type { BiasCorrection } from "./recommendation-engine";
import type { VarianceModel } from "./variance-estimation";
import {
  estimateVarianceModelFromValidatedPredictions,
  DEFAULT_VARIANCE_MODEL,
} from "./variance-estimation";
import { buildTrainingDataset } from "./training-dataset";
import { runEvaluation } from "./evaluation-harness";

const RECALIBRATION_KEY = "recalibration_platt";
const BIAS_CORRECTION_KEY = "bias_correction";
const VARIANCE_MODEL_KEY = "variance_model";
const MONTE_CARLO_NUM_SIMULATIONS_KEY = "monte_carlo_num_simulations";

const DEFAULT_NUM_SIMULATIONS = 10000;

export interface BatchSyncResult {
  success: boolean;
  unvalidatedChecked: number;
  datesFetched: number;
  outcomesRecorded: number;
  trainingRan: boolean;
  recalibrationParams?: RecalibrationParams;
  biasCorrection?: BiasCorrection;
  varianceModel?: VarianceModel;
  validatedCount: number;
  duration: number;
  errors?: string[];
  /** Diagnose why outcomes weren't recorded */
  diagnostics?: {
    oddsApiCompletedCount: number;
    oddsApiMatched: number;
    espnCompletedCount: number;
    espnMatched: number;
    oddsApiErrors?: string[];
    /** Sample predictions that were checked */
    samplePredictions?: Array<{ gameId: string; homeTeam: string; awayTeam: string; date: string; sport?: string }>;
    /** Predictions that couldn't be matched (still unvalidated) */
    unmatchedPredictions?: Array<{ gameId: string; homeTeam: string; awayTeam: string; date: string; sport?: string }>;
    /** Breakdown by sport */
    sportBreakdown?: Record<string, { total: number; matched: number }>;
    /** Sample completed games from Odds API (for debugging ID matching) */
    sampleOddsApiGames?: Array<{ id: string; home_team: string; away_team: string }>;
  };
}

/** Odds API sport keys to fetch (all sports we track predictions for). */
const ODDS_API_SPORTS = ["basketball_ncaab", "basketball_nba", "icehockey_nhl", "baseball_mlb"] as const;

/** Metadata stored with calibrated params (for audit / reproducibility) */
export interface CalibrationMetadata {
  trainedAt: string; // ISO timestamp
  validatedCount: number;
  metrics?: {
    brierScore?: number;
    logLoss?: number;
    winnerAccuracy?: number;
  };
  version?: number;
}

/**
 * Load recalibration params from DB (if stored).
 */
export async function loadRecalibrationParams(): Promise<RecalibrationParams | null> {
  try {
    const row = await prisma.modelConfig.findUnique({
      where: { key: RECALIBRATION_KEY },
    });
    const v = row?.value;
    if (v && typeof v === "object" && "A" in v && "B" in v) {
      return { A: (v as any).A, B: (v as any).B };
    }
  } catch {
    // Table might not exist yet
  }
  return null;
}

/**
 * Load recalibration params with metadata.
 */
export async function loadRecalibrationWithMetadata(): Promise<{
  params: RecalibrationParams;
  metadata?: CalibrationMetadata;
} | null> {
  try {
    const row = await prisma.modelConfig.findUnique({
      where: { key: RECALIBRATION_KEY },
    });
    const v = row?.value;
    if (v && typeof v === "object" && "A" in v && "B" in v) {
      const obj = v as Record<string, unknown>;
      return {
        params: { A: obj.A as number, B: obj.B as number },
        metadata: obj._meta as CalibrationMetadata | undefined,
      };
    }
  } catch {
    // Table might not exist
  }
  return null;
}

/**
 * Save recalibration params to DB with optional metadata.
 */
export async function saveRecalibrationParams(
  params: RecalibrationParams,
  metadata?: CalibrationMetadata
): Promise<void> {
  try {
    const value =
      metadata != null
        ? { ...params, _meta: { ...metadata, trainedAt: metadata.trainedAt || new Date().toISOString() } }
        : params;
    await prisma.modelConfig.upsert({
      where: { key: RECALIBRATION_KEY },
      create: { key: RECALIBRATION_KEY, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
  } catch (error) {
    console.warn("Could not persist recalibration params:", error);
  }
}

/**
 * Load persisted bias corrections from DB.
 */
export async function loadBiasCorrection(): Promise<BiasCorrection | null> {
  try {
    const row = await prisma.modelConfig.findUnique({
      where: { key: BIAS_CORRECTION_KEY },
    });
    const v = row?.value;
    if (v && typeof v === "object" && ("homeTeamBias" in v || "awayTeamBias" in v || "scoreBias" in v)) {
      return v as BiasCorrection;
    }
  } catch {
    // Table might not exist
  }
  return null;
}

/**
 * Save bias corrections to DB.
 */
export async function saveBiasCorrection(params: BiasCorrection): Promise<void> {
  try {
    await prisma.modelConfig.upsert({
      where: { key: BIAS_CORRECTION_KEY },
      create: { key: BIAS_CORRECTION_KEY, value: params as Prisma.InputJsonValue },
      update: { value: params as Prisma.InputJsonValue },
    });
  } catch (error) {
    console.warn("Could not persist bias corrections:", error);
  }
}

/**
 * Load persisted variance model for Monte Carlo simulation.
 */
export async function loadVarianceModel(): Promise<VarianceModel | null> {
  try {
    const row = await prisma.modelConfig.findUnique({
      where: { key: VARIANCE_MODEL_KEY },
    });
    const v = row?.value;
    if (v && typeof v === "object" && "baseVariance" in v && "varianceByQuality" in v) {
      return v as unknown as VarianceModel;
    }
  } catch {
    // Table might not exist
  }
  return null;
}

/**
 * Save variance model to DB.
 */
export async function saveVarianceModel(model: VarianceModel): Promise<void> {
  try {
    await prisma.modelConfig.upsert({
      where: { key: VARIANCE_MODEL_KEY },
      create: { key: VARIANCE_MODEL_KEY, value: model as unknown as Prisma.InputJsonValue },
      update: { value: model as unknown as Prisma.InputJsonValue },
    });
  } catch (error) {
    console.warn("Could not persist variance model:", error);
  }
}

/**
 * Get variance model for Monte Carlo simulation.
 * Returns persisted model if available, otherwise default.
 */
export async function getVarianceModelForSimulation(): Promise<VarianceModel> {
  const loaded = await loadVarianceModel();
  return loaded ?? { ...DEFAULT_VARIANCE_MODEL, estimatedAt: Date.now() };
}

/**
 * Load configured number of Monte Carlo simulations.
 * Returns persisted value if valid (1000–50000), otherwise default 10000.
 */
export async function loadNumSimulations(): Promise<number> {
  try {
    const row = await prisma.modelConfig.findUnique({
      where: { key: MONTE_CARLO_NUM_SIMULATIONS_KEY },
    });
    const v = row?.value;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isNaN(n) && n >= 1000 && n <= 50000) return Math.round(n);
  } catch {
    // Table may not exist
  }
  return DEFAULT_NUM_SIMULATIONS;
}

/**
 * Save Monte Carlo numSimulations to ModelConfig.
 */
export async function saveNumSimulations(num: number): Promise<void> {
  const clamped = Math.max(1000, Math.min(50000, Math.round(num)));
  try {
    await prisma.modelConfig.upsert({
      where: { key: MONTE_CARLO_NUM_SIMULATIONS_KEY },
      create: { key: MONTE_CARLO_NUM_SIMULATIONS_KEY, value: clamped as unknown as Prisma.InputJsonValue },
      update: { value: clamped as unknown as Prisma.InputJsonValue },
    });
  } catch (error) {
    console.warn("Could not persist numSimulations:", error);
  }
}

/**
 * Load recalibration params from DB and set as active for predictions.
 * Call at app/request start for server-side prediction routes.
 */
export async function loadRecalibrationFromDb(): Promise<RecalibrationParams | null> {
  const params = await loadRecalibrationParams();
  if (params) {
    setRecalibrationParams(params);
    return params;
  }
  return null;
}

/** Extract home/away scores from Odds API LiveGame scores array. */
function parseOddsApiScores(
  game: { home_team: string; away_team: string; scores: Array<{ name: string; score: string }> | null }
): { homeScore: number; awayScore: number } | null {
  if (!game.scores || game.scores.length < 2) return null;
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  for (const s of game.scores) {
    const score = parseInt(s.score, 10);
    if (Number.isNaN(score)) continue;
    if (s.name === game.home_team) homeScore = score;
    else if (s.name === game.away_team) awayScore = score;
  }
  if (homeScore == null || awayScore == null) return null;
  return { homeScore, awayScore };
}

/** Map sport key to internal sport code */
function getSportCode(sportKey: string | null | undefined): string {
  if (!sportKey) return "unknown";
  if (sportKey.includes("ncaab")) return "cbb";
  if (sportKey.includes("nba")) return "nba";
  if (sportKey.includes("nhl") || sportKey.includes("hockey")) return "nhl";
  if (sportKey.includes("mlb") || sportKey.includes("baseball")) return "mlb";
  return sportKey;
}

export interface BatchSyncOptions {
  /** If true, skip outcome syncing and only run training */
  trainOnly?: boolean;
  /** If true, skip training and only sync outcomes */
  syncOnly?: boolean;
}

/**
 * Run full batch: check all scored games for unvalidated predictions, record outcomes, train model.
 * Use options to run sync-only or train-only.
 */
export async function runBatchSync(options: BatchSyncOptions = {}): Promise<BatchSyncResult> {
  const { trainOnly = false, syncOnly = false } = options;
  const start = Date.now();
  const errors: string[] = [];
  const sportBreakdown: Record<string, { total: number; matched: number }> = {};
  const diagnostics: BatchSyncResult["diagnostics"] = {
    oddsApiCompletedCount: 0,
    oddsApiMatched: 0,
    espnCompletedCount: 0,
    espnMatched: 0,
    oddsApiErrors: [],
    sportBreakdown,
  };

  try {
    // If train-only, skip outcome syncing entirely
    if (trainOnly) {
      const validated = await getValidatedPredictions();
      let trainingRan = false;
      let recalibrationParams: RecalibrationParams | undefined;
      let biasCorrection: BiasCorrection | undefined;

      if (validated.length >= 20) {
        // Stored winProbability is post-Platt; suitable for training next iteration.
        const pairs = validated.map((v) => ({
          homeWinProb: (v.prediction.winProbability as { home: number }).home,
          actualWinner: (v.actualOutcome!.winner as "home" | "away"),
        }));

        const params = fitFromValidations(pairs, true);
        setRecalibrationParams(params);
        recalibrationParams = params;
        trainingRan = true;

        const examples = await buildTrainingDataset({ limit: 5000 });
        const metrics = examples.length > 0 ? runEvaluation(examples) : undefined;
        await saveRecalibrationParams(params, {
          trainedAt: new Date().toISOString(),
          validatedCount: validated.length,
          metrics: metrics
            ? {
                brierScore: metrics.brierScore,
                logLoss: metrics.logLoss,
                winnerAccuracy: metrics.winnerAccuracy,
              }
            : undefined,
        });
      }

      // Persist bias corrections from validation (for recommendations)
      const report = await generatePerformanceReport(90);
      if (report.biases && (report.biases.homeTeamBias != null || report.biases.awayTeamBias != null || report.biases.scoreBias != null)) {
        biasCorrection = report.biases;
        await saveBiasCorrection(report.biases);
      }

      // Estimate and persist variance model (for Monte Carlo simulation)
      const varianceModel = estimateVarianceModelFromValidatedPredictions(validated);
      await saveVarianceModel(varianceModel);

      const stats = await getTrackingStats();
      return {
        success: true,
        unvalidatedChecked: 0,
        datesFetched: 0,
        outcomesRecorded: 0,
        trainingRan,
        recalibrationParams,
        biasCorrection,
        varianceModel,
        validatedCount: stats.validated,
        duration: Date.now() - start,
        diagnostics,
      };
    }

    // 1. Get all unvalidated predictions
    const unvalidated = await getUnvalidatedPredictions();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filter to predictions where game date has passed (game should be played)
    const pastPredictions = unvalidated.filter((p) => new Date(p.date) < todayStart);

    // Track by sport for diagnostics
    for (const p of pastPredictions) {
      const sport = getSportCode(p.sport);
      if (!sportBreakdown[sport]) sportBreakdown[sport] = { total: 0, matched: 0 };
      sportBreakdown[sport].total++;
    }

    if (pastPredictions.length === 0) {
      const stats = await getTrackingStats();
      return {
        success: true,
        unvalidatedChecked: unvalidated.length,
        datesFetched: 0,
        outcomesRecorded: 0,
        trainingRan: false,
        validatedCount: stats.validated,
        duration: Date.now() - start,
        diagnostics: { ...diagnostics, samplePredictions: [], unmatchedPredictions: [] },
      };
    }

    const gameIdsNeeded = new Set(pastPredictions.map((p) => p.gameId));
    const predictionsBySport = new Map<string, TrackedPrediction[]>();
    for (const p of pastPredictions) {
      const sport = getSportCode(p.sport);
      if (!predictionsBySport.has(sport)) predictionsBySport.set(sport, []);
      predictionsBySport.get(sport)!.push(p);
    }

    diagnostics.samplePredictions = pastPredictions.slice(0, 5).map((p) => ({
      gameId: p.gameId,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      date: p.date,
      sport: getSportCode(p.sport),
    }));

    let outcomesRecorded = 0;
    const matchedGameIds = new Set<string>();

    // 2a. PRIMARY: Odds API completed scores (exact game ID match - most reliable)
    // Use daysFrom=3 for better resilience (covers weekend gaps, cron failures)
    const oddsCompleted: LiveGame[] = [];
    for (const sportKey of ODDS_API_SPORTS) {
      const result = await getCompletedScoresBySport(sportKey, 3);
      if (result.error) {
        diagnostics.oddsApiErrors!.push(result.error);
        errors.push(result.error);
      }
      oddsCompleted.push(...result.games);
      await new Promise((r) => setTimeout(r, 100)); // small delay between sport fetches
    }
    diagnostics.oddsApiCompletedCount = oddsCompleted.length;

    // Sample completed games for debugging
    diagnostics.sampleOddsApiGames = oddsCompleted.slice(0, 5).map((g) => ({
      id: g.id,
      home_team: g.home_team,
      away_team: g.away_team,
    }));

    for (const game of oddsCompleted) {
      if (!gameIdsNeeded.has(game.id)) continue;
      const parsed = parseOddsApiScores(game);
      if (!parsed) continue;
      const recorded = await recordOutcomeByGameId(
        game.id,
        parsed.homeScore,
        parsed.awayScore
      );
      if (recorded) {
        outcomesRecorded++;
        diagnostics.oddsApiMatched!++;
        matchedGameIds.add(game.id);
        gameIdsNeeded.delete(game.id);
        // Track sport breakdown
        const pred = pastPredictions.find((p) => p.gameId === game.id);
        if (pred) {
          const sport = getSportCode(pred.sport);
          if (sportBreakdown[sport]) sportBreakdown[sport].matched++;
        }
      }
    }

    // 2b. FALLBACK: ESPN APIs + team-name matching (for games outside Odds API window)
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Group unmatched predictions by date for ESPN fallback
    const unmatchedPredictions = pastPredictions.filter((p) => !matchedGameIds.has(p.gameId));
    const datesToFetch = Array.from(
      new Set(
        unmatchedPredictions
          .filter((p) => new Date(p.date) >= thirtyDaysAgo)
          .map((p) => {
            const d = new Date(p.date);
            return d.toISOString().slice(0, 10);
          })
      )
    );

    // 2b-i. CBB fallback (ESPN via sportsdata-api)
    for (const dateStr of datesToFetch) {
      try {
        const games = await getGamesByDate(dateStr);
        const completed = games.filter(
          (g) => g.IsClosed && g.HomeTeamScore != null && g.AwayTeamScore != null
        );
        diagnostics.espnCompletedCount! += completed.length;

        for (const game of completed) {
          const recorded = await recordOutcomeByMatchup(
            game.HomeTeam,
            game.AwayTeam,
            game.DateTime || game.Day,
            game.HomeTeamScore!,
            game.AwayTeamScore!
          );
          if (recorded) {
            outcomesRecorded++;
            diagnostics.espnMatched!++;
            // Track CBB matches
            if (sportBreakdown["cbb"]) sportBreakdown["cbb"].matched++;
          }
        }

        await new Promise((r) => setTimeout(r, 150));
      } catch (err) {
        errors.push(`CBB Date ${dateStr}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 2b-ii. NBA fallback (ESPN sport client)
    const nbaPredictions = predictionsBySport.get("nba") ?? [];
    for (const pred of nbaPredictions) {
      if (matchedGameIds.has(pred.gameId)) continue;
      try {
        // Try to get recent games for both teams and match
        const [homeGames, awayGames] = await Promise.all([
          espnNBAClient.getRecentGames(pred.homeTeam, 10),
          espnNBAClient.getRecentGames(pred.awayTeam, 10),
        ]);
        
        const predDate = new Date(pred.date).toISOString().slice(0, 10);
        // Look for game on same date with matching teams
        for (const game of [...homeGames, ...awayGames]) {
          const gameDate = game.date?.slice(0, 10);
          if (gameDate !== predDate) continue;
          
          const recorded = await recordOutcomeByMatchup(
            game.homeTeam,
            game.awayTeam,
            game.date,
            game.homeScore,
            game.awayScore
          );
          if (recorded) {
            outcomesRecorded++;
            diagnostics.espnMatched!++;
            matchedGameIds.add(pred.gameId);
            if (sportBreakdown["nba"]) sportBreakdown["nba"].matched++;
            break;
          }
        }
      } catch (err) {
        // Continue on error
      }
    }

    // 2b-iii. NHL fallback (ESPN sport client)
    const nhlPredictions = predictionsBySport.get("nhl") ?? [];
    for (const pred of nhlPredictions) {
      if (matchedGameIds.has(pred.gameId)) continue;
      try {
        const [homeGames, awayGames] = await Promise.all([
          espnNHLClient.getRecentGames(pred.homeTeam, 10),
          espnNHLClient.getRecentGames(pred.awayTeam, 10),
        ]);
        
        const predDate = new Date(pred.date).toISOString().slice(0, 10);
        for (const game of [...homeGames, ...awayGames]) {
          const gameDate = game.date?.slice(0, 10);
          if (gameDate !== predDate) continue;
          
          const recorded = await recordOutcomeByMatchup(
            game.homeTeam,
            game.awayTeam,
            game.date,
            game.homeScore,
            game.awayScore
          );
          if (recorded) {
            outcomesRecorded++;
            diagnostics.espnMatched!++;
            matchedGameIds.add(pred.gameId);
            if (sportBreakdown["nhl"]) sportBreakdown["nhl"].matched++;
            break;
          }
        }
      } catch (err) {
        // Continue on error
      }
    }

    // 2b-iv. MLB fallback (ESPN sport client)
    const mlbPredictions = predictionsBySport.get("mlb") ?? [];
    for (const pred of mlbPredictions) {
      if (matchedGameIds.has(pred.gameId)) continue;
      try {
        const [homeGames, awayGames] = await Promise.all([
          espnMLBClient.getRecentGames(pred.homeTeam, 10),
          espnMLBClient.getRecentGames(pred.awayTeam, 10),
        ]);
        
        const predDate = new Date(pred.date).toISOString().slice(0, 10);
        for (const game of [...homeGames, ...awayGames]) {
          const gameDate = game.date?.slice(0, 10);
          if (gameDate !== predDate) continue;
          
          const recorded = await recordOutcomeByMatchup(
            game.homeTeam,
            game.awayTeam,
            game.date,
            game.homeScore,
            game.awayScore
          );
          if (recorded) {
            outcomesRecorded++;
            diagnostics.espnMatched!++;
            matchedGameIds.add(pred.gameId);
            if (sportBreakdown["mlb"]) sportBreakdown["mlb"].matched++;
            break;
          }
        }
      } catch (err) {
        // Continue on error
      }
    }

    // Record unmatched predictions for diagnostics
    const stillUnmatched = pastPredictions.filter((p) => !matchedGameIds.has(p.gameId));
    diagnostics.unmatchedPredictions = stillUnmatched.slice(0, 10).map((p) => ({
      gameId: p.gameId,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      date: p.date,
      sport: getSportCode(p.sport),
    }));

    // 3. Train model from validated predictions (skip if syncOnly)
    let trainingRan = false;
    let recalibrationParams: RecalibrationParams | undefined;
    let biasCorrection: BiasCorrection | undefined;
    let varianceModel: VarianceModel | undefined;

    if (!syncOnly) {
      const validated = await getValidatedPredictions();
      if (validated.length >= 20) {
        // Stored winProbability is post-Platt (predictMatchup applies recalibration before storage).
        // This is the correct value for training the next iteration's Platt params.
        const pairs = validated.map((v) => ({
          homeWinProb: (v.prediction.winProbability as { home: number }).home,
          actualWinner: (v.actualOutcome!.winner as "home" | "away"),
        }));

        const params = fitFromValidations(pairs, true);
        setRecalibrationParams(params);
        recalibrationParams = params;
        trainingRan = true;

        const examples = await buildTrainingDataset({ limit: 5000 });
        const metrics = examples.length > 0 ? runEvaluation(examples) : undefined;
        await saveRecalibrationParams(params, {
          trainedAt: new Date().toISOString(),
          validatedCount: validated.length,
          metrics: metrics
            ? {
                brierScore: metrics.brierScore,
                logLoss: metrics.logLoss,
                winnerAccuracy: metrics.winnerAccuracy,
              }
            : undefined,
        });
      }

      // Persist bias corrections from validation (for recommendations)
      const report = await generatePerformanceReport(90);
      if (report.biases && (report.biases.homeTeamBias != null || report.biases.awayTeamBias != null || report.biases.scoreBias != null)) {
        biasCorrection = report.biases;
        await saveBiasCorrection(report.biases);
      }

      // Estimate and persist variance model (for Monte Carlo simulation)
      varianceModel = estimateVarianceModelFromValidatedPredictions(validated);
      await saveVarianceModel(varianceModel);
    }

    const stats = await getTrackingStats();

    return {
      success: errors.length === 0 || outcomesRecorded > 0,
      unvalidatedChecked: pastPredictions.length,
      datesFetched: datesToFetch.length,
      outcomesRecorded,
      trainingRan,
      recalibrationParams,
      biasCorrection,
      varianceModel,
      validatedCount: stats.validated,
      duration: Date.now() - start,
      errors: errors.length > 0 ? errors : undefined,
      diagnostics,
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    const stats = await getTrackingStats();
    return {
      success: false,
      unvalidatedChecked: 0,
      datesFetched: 0,
      outcomesRecorded: 0,
      trainingRan: false,
      validatedCount: stats.validated,
      duration: Date.now() - start,
      errors,
      diagnostics,
    };
  }
}
