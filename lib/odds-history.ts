/**
 * Odds History Service
 * 
 * Tracks line movements over time for CLV (Closing Line Value) analysis.
 * Captures odds snapshots at regular intervals and marks opening/closing lines.
 */

import { prisma } from "./prisma";
import { getUpcomingGamesBySport } from "./odds-api";
import type { OddsGame } from "@/types";

/** Sports to track odds for */
const TRACKED_SPORTS = [
  "basketball_ncaab",
  "basketball_nba",
  "icehockey_nhl",
  "baseball_mlb",
] as const;

export interface OddsSnapshot {
  gameId: string;
  sport: string;
  spread: number | null;
  total: number | null;
  homeML: number | null;
  awayML: number | null;
  bookmakerData: Array<{
    bookmaker: string;
    spread?: number;
    total?: number;
    homeML?: number;
    awayML?: number;
  }>;
}

export interface CaptureResult {
  sport: string;
  gamesChecked: number;
  newSnapshots: number;
  openingLinesSet: number;
  closingLinesSet: number;
  errors: string[];
}

/**
 * Extract consensus odds from bookmaker data.
 * Uses average of all available bookmaker lines.
 */
function extractConsensusOdds(game: OddsGame): OddsSnapshot {
  const bookmakerData: OddsSnapshot["bookmakerData"] = [];
  const spreads: number[] = [];
  const totals: number[] = [];
  const homeMLs: number[] = [];
  const awayMLs: number[] = [];

  for (const bookmaker of game.bookmakers || []) {
    const bData: OddsSnapshot["bookmakerData"][0] = { bookmaker: bookmaker.key };

    for (const market of bookmaker.markets || []) {
      if (market.key === "spreads") {
        const homeOutcome = market.outcomes.find((o) => o.name === game.home_team);
        if (homeOutcome?.point !== undefined) {
          bData.spread = homeOutcome.point;
          spreads.push(homeOutcome.point);
        }
      } else if (market.key === "totals") {
        const overOutcome = market.outcomes.find((o) => o.name === "Over");
        if (overOutcome?.point !== undefined) {
          bData.total = overOutcome.point;
          totals.push(overOutcome.point);
        }
      } else if (market.key === "h2h") {
        for (const outcome of market.outcomes) {
          if (outcome.name === game.home_team) {
            bData.homeML = outcome.price;
            homeMLs.push(outcome.price);
          } else if (outcome.name === game.away_team) {
            bData.awayML = outcome.price;
            awayMLs.push(outcome.price);
          }
        }
      }
    }

    if (bData.spread !== undefined || bData.total !== undefined || bData.homeML !== undefined) {
      bookmakerData.push(bData);
    }
  }

  // Calculate averages
  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  return {
    gameId: game.id,
    sport: game.sport_key,
    spread: spreads.length > 0 ? Math.round(avg(spreads)! * 2) / 2 : null, // Round to nearest 0.5
    total: totals.length > 0 ? Math.round(avg(totals)! * 2) / 2 : null,
    homeML: homeMLs.length > 0 ? Math.round(avg(homeMLs)!) : null,
    awayML: awayMLs.length > 0 ? Math.round(avg(awayMLs)!) : null,
    bookmakerData,
  };
}

/**
 * Capture odds for all upcoming games in a sport.
 * - Creates new snapshot if odds have changed since last capture
 * - Marks first capture as "opening" line
 * - Marks pre-game capture as "closing" line (when game starts within 30 min)
 *
 * IMPORTANT: Closing line capture depends on cron frequency. A game gets a closing
 * line only if this function runs when minutesUntilGame <= 30. If the cron runs
 * infrequently (e.g., hourly), many games may never get a closing line. For reliable
 * CLV (Closing Line Value) analysis, run capture every 15-30 minutes on game days.
 * See docs/ODDS_CAPTURE.md for full details.
 */
export async function captureOddsForSport(sport: string): Promise<CaptureResult> {
  const result: CaptureResult = {
    sport,
    gamesChecked: 0,
    newSnapshots: 0,
    openingLinesSet: 0,
    closingLinesSet: 0,
    errors: [],
  };

  try {
    // Fetch current odds
    const games = await getUpcomingGamesBySport(sport, "us", "h2h,spreads,totals");
    result.gamesChecked = games.length;

    const now = new Date();

    for (const game of games) {
      try {
        const snapshot = extractConsensusOdds(game);
        
        // Skip games with no odds data
        if (snapshot.spread === null && snapshot.total === null && snapshot.homeML === null) {
          continue;
        }

        // Check if this is the first capture for this game (opening line)
        const existingCount = await prisma.oddsHistory.count({
          where: { gameId: game.id },
        });

        const isOpening = existingCount === 0;

        // Check if game starts within 30 minutes (potential closing line)
        const gameTime = new Date(game.commence_time);
        const minutesUntilGame = (gameTime.getTime() - now.getTime()) / 1000 / 60;
        const isClosing = minutesUntilGame <= 30 && minutesUntilGame > 0;

        // If closing, unmark any previous closing lines for this game
        if (isClosing) {
          await prisma.oddsHistory.updateMany({
            where: { gameId: game.id, isClosing: true },
            data: { isClosing: false },
          });
        }

        // Check if odds changed since last capture (skip duplicates)
        if (!isOpening) {
          const lastSnapshot = await prisma.oddsHistory.findFirst({
            where: { gameId: game.id },
            orderBy: { capturedAt: "desc" },
          });

          if (lastSnapshot) {
            const sameSpread = lastSnapshot.spread === snapshot.spread;
            const sameTotal = lastSnapshot.total === snapshot.total;
            const sameHomeML = lastSnapshot.homeML === snapshot.homeML;
            const sameAwayML = lastSnapshot.awayML === snapshot.awayML;

            // Skip if nothing changed (unless it's a closing line capture)
            if (sameSpread && sameTotal && sameHomeML && sameAwayML && !isClosing) {
              continue;
            }
          }
        }

        // Create snapshot
        await prisma.oddsHistory.create({
          data: {
            gameId: game.id,
            sport,
            spread: snapshot.spread,
            total: snapshot.total,
            homeML: snapshot.homeML,
            awayML: snapshot.awayML,
            isOpening,
            isClosing,
            bookmakerData: snapshot.bookmakerData,
          },
        });

        result.newSnapshots++;
        if (isOpening) result.openingLinesSet++;
        if (isClosing) result.closingLinesSet++;
      } catch (err) {
        result.errors.push(`Game ${game.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    result.errors.push(`Sport ${sport}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}

/**
 * Capture odds for all tracked sports.
 */
export async function captureAllOdds(sportsFilter?: string[]): Promise<{
  results: CaptureResult[];
  totalSnapshots: number;
  totalErrors: number;
  duration: number;
}> {
  const start = Date.now();
  const results: CaptureResult[] = [];

  // Use filtered sports or all tracked sports
  const sportsToCapture = sportsFilter?.length ? sportsFilter : TRACKED_SPORTS;

  for (const sport of sportsToCapture) {
    const result = await captureOddsForSport(sport);
    results.push(result);
    // Small delay between sports to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  return {
    results,
    totalSnapshots: results.reduce((sum, r) => sum + r.newSnapshots, 0),
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    duration: Date.now() - start,
  };
}

/**
 * Get opening line for a game.
 */
export async function getOpeningLine(gameId: string): Promise<{
  spread: number | null;
  total: number | null;
  homeML: number | null;
  awayML: number | null;
  capturedAt: Date;
} | null> {
  const opening = await prisma.oddsHistory.findFirst({
    where: { gameId, isOpening: true },
    select: { spread: true, total: true, homeML: true, awayML: true, capturedAt: true },
  });
  return opening;
}

/**
 * Get closing line for a game.
 */
export async function getClosingLine(gameId: string): Promise<{
  spread: number | null;
  total: number | null;
  homeML: number | null;
  awayML: number | null;
  capturedAt: Date;
} | null> {
  // First try explicit closing line
  let closing = await prisma.oddsHistory.findFirst({
    where: { gameId, isClosing: true },
    select: { spread: true, total: true, homeML: true, awayML: true, capturedAt: true },
  });

  // Fall back to most recent snapshot
  if (!closing) {
    closing = await prisma.oddsHistory.findFirst({
      where: { gameId },
      orderBy: { capturedAt: "desc" },
      select: { spread: true, total: true, homeML: true, awayML: true, capturedAt: true },
    });
  }

  return closing;
}

/**
 * Get full line history for a game.
 */
export async function getLineHistory(gameId: string): Promise<Array<{
  capturedAt: Date;
  spread: number | null;
  total: number | null;
  homeML: number | null;
  awayML: number | null;
  isOpening: boolean;
  isClosing: boolean;
}>> {
  const history = await prisma.oddsHistory.findMany({
    where: { gameId },
    orderBy: { capturedAt: "asc" },
    select: {
      capturedAt: true,
      spread: true,
      total: true,
      homeML: true,
      awayML: true,
      isOpening: true,
      isClosing: true,
    },
  });
  return history;
}

/**
 * Calculate line movement for a game (closing - opening).
 */
export async function getLineMovement(gameId: string): Promise<{
  spreadMovement: number | null;
  totalMovement: number | null;
  openingSpread: number | null;
  closingSpread: number | null;
  openingTotal: number | null;
  closingTotal: number | null;
} | null> {
  const [opening, closing] = await Promise.all([
    getOpeningLine(gameId),
    getClosingLine(gameId),
  ]);

  if (!opening || !closing) return null;

  return {
    spreadMovement:
      opening.spread !== null && closing.spread !== null
        ? closing.spread - opening.spread
        : null,
    totalMovement:
      opening.total !== null && closing.total !== null
        ? closing.total - opening.total
        : null,
    openingSpread: opening.spread,
    closingSpread: closing.spread,
    openingTotal: opening.total,
    closingTotal: closing.total,
  };
}

/**
 * Mark closing lines for games that have started.
 * Should be called periodically to ensure closing lines are captured.
 */
export async function markClosingLines(): Promise<number> {
  const now = new Date();
  
  // Find games that started recently (last 2 hours) without a closing line marked
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  
  const trackedGames = await prisma.trackedGame.findMany({
    where: {
      commenceTime: {
        gte: twoHoursAgo,
        lte: now,
      },
    },
    select: { externalId: true },
  });

  let marked = 0;
  for (const game of trackedGames) {
    // Check if already has closing line
    const hasClosing = await prisma.oddsHistory.findFirst({
      where: { gameId: game.externalId, isClosing: true },
    });
    
    if (!hasClosing) {
      // Mark most recent snapshot as closing
      const lastSnapshot = await prisma.oddsHistory.findFirst({
        where: { gameId: game.externalId },
        orderBy: { capturedAt: "desc" },
      });
      
      if (lastSnapshot) {
        await prisma.oddsHistory.update({
          where: { id: lastSnapshot.id },
          data: { isClosing: true },
        });
        marked++;
      }
    }
  }
  
  return marked;
}

/**
 * Get statistics about odds history data.
 */
export async function getOddsHistoryStats(sport?: string): Promise<{
  totalSnapshots: number;
  gamesTracked: number;
  openingLines: number;
  closingLines: number;
  bySport: Record<string, number>;
}> {
  const where = sport ? { sport } : {};
  
  const [total, openingCount, closingCount, bySport] = await Promise.all([
    prisma.oddsHistory.count({ where }),
    prisma.oddsHistory.count({ where: { ...where, isOpening: true } }),
    prisma.oddsHistory.count({ where: { ...where, isClosing: true } }),
    prisma.oddsHistory.groupBy({
      by: ["sport"],
      _count: true,
    }),
  ]);

  const gameIds = await prisma.oddsHistory.findMany({
    where,
    select: { gameId: true },
    distinct: ["gameId"],
  });

  const sportCounts: Record<string, number> = {};
  for (const row of bySport) {
    sportCounts[row.sport] = row._count;
  }

  return {
    totalSnapshots: total,
    gamesTracked: gameIds.length,
    openingLines: openingCount,
    closingLines: closingCount,
    bySport: sportCounts,
  };
}

/**
 * Clean up old odds history (keep last 30 days).
 */
export async function cleanupOldOddsHistory(daysToKeep: number = 30): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const result = await prisma.oddsHistory.deleteMany({
    where: {
      capturedAt: { lt: cutoff },
    },
  });

  return result.count;
}
