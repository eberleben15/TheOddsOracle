/**
 * Prediction Feedback Batch Job
 *
 * 1. Batch check: fetches scores for ALL unvalidated predictions whose game date has passed.
 * 2. Records outcomes for any matched completed games.
 * 3. Trains model: fits Platt scaling from validated predictions and persists params.
 *
 * Matching strategy:
 * - PRIMARY: Odds API completed scores (game IDs match exactly - most reliable).
 * - FALLBACK: ESPN getGamesByDate + team-name matching (for games outside Odds API window).
 */

import { getCompletedScoresBySport } from "./odds-api";
import type { LiveGame } from "@/types";
import { getGamesByDate } from "./sportsdata-api";
import {
  getUnvalidatedPredictions,
  recordOutcomeByMatchup,
  recordOutcomeByGameId,
  getValidatedPredictions,
  getTrackingStats,
} from "./prediction-tracker";
import { fitFromValidations, setRecalibrationParams, type RecalibrationParams } from "./recalibration";
import { prisma } from "./prisma";

const RECALIBRATION_KEY = "recalibration_platt";

export interface BatchSyncResult {
  success: boolean;
  unvalidatedChecked: number;
  datesFetched: number;
  outcomesRecorded: number;
  trainingRan: boolean;
  recalibrationParams?: RecalibrationParams;
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
    samplePredictions?: Array<{ gameId: string; homeTeam: string; awayTeam: string; date: string }>;
  };
}

/** Odds API sport keys to fetch (CBB + NBA - sports we track predictions for). */
const ODDS_API_SPORTS = ["basketball_ncaab", "basketball_nba"] as const;

/**
 * Load recalibration params from DB (if stored).
 */
export async function loadRecalibrationParams(): Promise<RecalibrationParams | null> {
  try {
    const row = await prisma.modelConfig.findUnique({
      where: { key: RECALIBRATION_KEY },
    });
    if (row?.value && typeof row.value === "object" && "A" in row.value && "B" in row.value) {
      return row.value as RecalibrationParams;
    }
  } catch {
    // Table might not exist yet
  }
  return null;
}

/**
 * Save recalibration params to DB.
 */
export async function saveRecalibrationParams(params: RecalibrationParams): Promise<void> {
  try {
    await prisma.modelConfig.upsert({
      where: { key: RECALIBRATION_KEY },
      create: { key: RECALIBRATION_KEY, value: params },
      update: { value: params },
    });
  } catch (error) {
    console.warn("Could not persist recalibration params:", error);
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

/**
 * Run full batch: check all scored games for unvalidated predictions, record outcomes, train model.
 */
export async function runBatchSync(): Promise<BatchSyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  const diagnostics: BatchSyncResult["diagnostics"] = {
    oddsApiCompletedCount: 0,
    oddsApiMatched: 0,
    espnCompletedCount: 0,
    espnMatched: 0,
    oddsApiErrors: [],
  };

  try {
    // 1. Get all unvalidated predictions
    const unvalidated = await getUnvalidatedPredictions();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filter to predictions where game date has passed (game should be played)
    const pastPredictions = unvalidated.filter((p) => new Date(p.date) < todayStart);

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
        diagnostics: { ...diagnostics, samplePredictions: [] },
      };
    }

    const gameIdsNeeded = new Set(pastPredictions.map((p) => p.gameId));
    diagnostics.samplePredictions = pastPredictions.slice(0, 5).map((p) => ({
      gameId: p.gameId,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      date: p.date,
    }));

    let outcomesRecorded = 0;

    // 2a. PRIMARY: Odds API completed scores (exact game ID match - most reliable)
    // Fetch all sports we track (CBB + NBA)
    const oddsCompleted: LiveGame[] = [];
    for (const sportKey of ODDS_API_SPORTS) {
      const result = await getCompletedScoresBySport(sportKey, 1);
      if (result.error) {
        diagnostics.oddsApiErrors!.push(result.error);
        errors.push(result.error);
      }
      oddsCompleted.push(...result.games);
      await new Promise((r) => setTimeout(r, 100)); // small delay between sport fetches
    }
    diagnostics.oddsApiCompletedCount = oddsCompleted.length;

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
        gameIdsNeeded.delete(game.id);
      }
    }

    // 2b. FALLBACK: ESPN getGamesByDate + team-name matching (for games outside Odds API)
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const datesToFetch = Array.from(
      new Set(
        pastPredictions
          .filter((p) => new Date(p.date) >= thirtyDaysAgo)
          .map((p) => {
            const d = new Date(p.date);
            return d.toISOString().slice(0, 10);
          })
      )
    );

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
          }
        }

        await new Promise((r) => setTimeout(r, 150));
      } catch (err) {
        errors.push(`Date ${dateStr}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. Train model from validated predictions
    const validated = await getValidatedPredictions();
    let trainingRan = false;
    let recalibrationParams: RecalibrationParams | undefined;

    if (validated.length >= 20) {
      const pairs = validated.map((v) => ({
        homeWinProb: (v.prediction.winProbability as { home: number }).home,
        actualWinner: (v.actualOutcome!.winner as "home" | "away"),
      }));

      const params = fitFromValidations(pairs, true);
      setRecalibrationParams(params);
      recalibrationParams = params;
      trainingRan = true;

      await saveRecalibrationParams(params);
    }

    const stats = await getTrackingStats();

    return {
      success: errors.length === 0 || outcomesRecorded > 0,
      unvalidatedChecked: pastPredictions.length,
      datesFetched: datesToFetch.length,
      outcomesRecorded,
      trainingRan,
      recalibrationParams,
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
