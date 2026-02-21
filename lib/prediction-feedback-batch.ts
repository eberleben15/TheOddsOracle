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
        success: true,
        unvalidatedChecked: 0,
        datesFetched: 0,
        outcomesRecorded: 0,
        trainingRan,
        recalibrationParams,
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

    if (!syncOnly) {
      const validated = await getValidatedPredictions();
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
