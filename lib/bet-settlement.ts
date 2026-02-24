/**
 * Automatic bet settlement when games complete.
 *
 * Uses The Odds API completed scores to resolve pending bets:
 * - Fetches pending BetRecords, groups by game and sport
 * - Fetches completed scores per sport (scores API, daysFrom=1)
 * - For each completed game with pending bets, computes win/loss/push and updates records
 */

import { prisma } from "@/lib/prisma";
import { getCompletedScoresBySport } from "@/lib/odds-api";
import type { LiveGame } from "@/types";

/** Map BetRecord.sport (may be "cbb" or "basketball_ncaab") to Odds API sport key */
function toOddsApiSportKey(sport: string | null): string {
  if (!sport) return "basketball_ncaab";
  const lower = sport.toLowerCase();
  const known: Record<string, string> = {
    cbb: "basketball_ncaab",
    nba: "basketball_nba",
    nhl: "icehockey_nhl",
    mlb: "baseball_mlb",
    nfl: "americanfootball_nfl",
    basketball_ncaab: "basketball_ncaab",
    basketball_nba: "basketball_nba",
    icehockey_nhl: "icehockey_nhl",
    baseball_mlb: "baseball_mlb",
    americanfootball_nfl: "americanfootball_nfl",
  };
  return known[lower] ?? sport;
}

/** Extract home/away scores from Odds API LiveGame */
function parseScores(game: LiveGame): { homeScore: number; awayScore: number } | null {
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

export type BetResult = "win" | "loss" | "push";

interface BetRecordForResolution {
  id: string;
  betType: string;
  betSide: string;
  line: number | null;
}

/**
 * Resolve a single bet to win/loss/push given final scores.
 */
export function resolveBetResult(
  homeScore: number,
  awayScore: number,
  record: BetRecordForResolution
): BetResult {
  const { betType, betSide, line } = record;
  const total = homeScore + awayScore;
  const spread = homeScore - awayScore;

  if (betType === "total_over" || betType === "total_under") {
    if (line == null) return "loss";
    if (total > line) return betType === "total_over" ? "win" : "loss";
    if (total < line) return betType === "total_under" ? "win" : "loss";
    return "push";
  }

  if (betType === "spread") {
    if (line == null) return "loss";
    // Line is stored as positive (e.g. 3.5). Home -3.5 means home gives 3.5 → home covers if (homeScore - awayScore) > 3.5
    // Away +3.5 → away covers if (homeScore - awayScore) < 3.5
    if (betSide === "home") {
      if (spread > line) return "win";
      if (spread < line) return "loss";
      return "push";
    }
    if (betSide === "away") {
      if (spread < line) return "win";
      if (spread > line) return "loss";
      return "push";
    }
  }

  if (betType === "moneyline") {
    if (betSide === "home") {
      if (homeScore > awayScore) return "win";
      if (homeScore < awayScore) return "loss";
      return "push";
    }
    if (betSide === "away") {
      if (awayScore > homeScore) return "win";
      if (awayScore < homeScore) return "loss";
      return "push";
    }
  }

  return "loss";
}

export function actualPayoutForResult(
  result: BetResult,
  stake: number,
  potentialPayout: number
): number {
  if (result === "win") return potentialPayout;
  if (result === "loss") return -stake;
  return 0;
}

export interface SettleBetsResult {
  success: boolean;
  settled: number;
  errors: string[];
  duration: number;
}

/**
 * Find all pending bets, fetch completed scores per sport, resolve and update each bet.
 */
export async function runSettleBets(daysFrom: number = 1): Promise<SettleBetsResult> {
  const start = Date.now();
  const errors: string[] = [];
  let settled = 0;

  const pending = await prisma.betRecord.findMany({
    where: {
      OR: [{ result: "pending" }, { result: null }],
    },
    orderBy: { date: "asc" },
  });

  if (pending.length === 0) {
    return { success: true, settled: 0, errors: [], duration: Date.now() - start };
  }

  // Group by Odds API sport key
  const bySport = new Map<string, typeof pending>();
  for (const bet of pending) {
    const key = toOddsApiSportKey(bet.sport);
    if (!bySport.has(key)) bySport.set(key, []);
    bySport.get(key)!.push(bet);
  }

  // Fetch completed games per sport and build gameId -> scores
  const gameScores = new Map<string, { homeScore: number; awayScore: number }>();

  for (const [oddsSportKey, bets] of bySport) {
    const { games, error } = await getCompletedScoresBySport(oddsSportKey, daysFrom);
    if (error) {
      errors.push(`${oddsSportKey}: ${error}`);
      continue;
    }
    for (const game of games) {
      const scores = parseScores(game);
      if (scores) gameScores.set(game.id, scores);
    }
  }

  for (const record of pending) {
    const scores = gameScores.get(record.gameId);
    if (!scores) continue;

    const result = resolveBetResult(
      scores.homeScore,
      scores.awayScore,
      {
        id: record.id,
        betType: record.betType,
        betSide: record.betSide,
        line: record.line,
      }
    );

    const actualPayout = actualPayoutForResult(
      result,
      record.stake,
      record.potentialPayout
    );

    try {
      await prisma.betRecord.update({
        where: { id: record.id },
        data: {
          result,
          actualPayout,
          settledAt: new Date(),
        },
      });
      settled++;
    } catch (e) {
      errors.push(`Update ${record.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    success: errors.length === 0,
    settled,
    errors,
    duration: Date.now() - start,
  };
}
