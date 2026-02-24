import { OddsGame, OddsMarket, OddsOutcome } from "@/types";
import { parseOddsWithValidation } from "./team-matcher";

export interface ParsedTotal {
  over: OddsOutcome | null;
  under: OddsOutcome | null;
  point: number | null;
}

export interface ParsedOdds {
  bookmaker: string;
  moneyline?: {
    away: OddsOutcome | null;
    home: OddsOutcome | null;
  };
  spread?: {
    away: OddsOutcome | null;
    home: OddsOutcome | null;
  };
  total?: ParsedTotal | null;
  matchQuality?: {
    moneyline?: {
      confidence: 'high' | 'medium' | 'low';
      method: string;
      warnings?: string[];
    };
    spread?: {
      confidence: 'high' | 'medium' | 'low';
      method: string;
      warnings?: string[];
    };
  };
}

/**
 * Parse odds data and match outcomes to teams using robust matching
 */
export function parseOdds(game: OddsGame): ParsedOdds[] {
  if (!game.bookmakers || game.bookmakers.length === 0) {
    return [];
  }

  // Use the enhanced team matcher
  const results = parseOddsWithValidation(
    { away_team: game.away_team, home_team: game.home_team },
    game.bookmakers.map(b => ({ title: b.title, markets: b.markets }))
  );

  // Convert to ParsedOdds format
  return results.map((result) => ({
    bookmaker: result.bookmaker,
    moneyline: result.moneyline,
    spread: result.spread,
    total: result.total ?? undefined,
    matchQuality: result.matchQuality ? {
      moneyline: result.matchQuality.moneyline ? {
        confidence: result.matchQuality.moneyline.confidence,
        method: result.matchQuality.moneyline.method,
        warnings: result.matchQuality.moneyline.warnings,
      } : undefined,
      spread: result.matchQuality.spread ? {
        confidence: result.matchQuality.spread.confidence,
        method: result.matchQuality.spread.method,
        warnings: result.matchQuality.spread.warnings,
      } : undefined,
    } : undefined,
  }));
}

/**
 * Convert decimal odds to American odds
 * @param decimalOdds - Decimal odds (e.g., 1.4, 3.05)
 * @returns American odds (e.g., -250, +205)
 */
export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds >= 2.0) {
    // Underdog: positive American odds
    return Math.round((decimalOdds - 1) * 100);
  } else {
    // Favorite: negative American odds
    return Math.round(-100 / (decimalOdds - 1));
  }
}

/**
 * Format odds price for display (assumes American odds format)
 */
export function formatOddsPrice(price: number): string {
  if (price > 0) {
    return `+${price}`;
  }
  return price.toString();
}

/**
 * Format decimal odds to American odds for display
 */
export function formatDecimalOdds(decimalOdds: number): string {
  const americanOdds = decimalToAmerican(decimalOdds);
  return formatOddsPrice(americanOdds);
}

/**
 * Format spread for display
 */
export function formatSpread(outcome: OddsOutcome): string {
  const spread = outcome.point !== undefined ? outcome.point : 0;
  const sign = spread > 0 ? "+" : "";
  // Spread odds are typically already in American format, but convert if needed
  const odds = formatDecimalOdds(outcome.price);
  return `${sign}${spread} (${odds})`;
}

/**
 * Get best moneyline odds across all bookmakers
 * Best odds = highest decimal odds (which converts to best American odds for both favorites and underdogs)
 */
export function getBestMoneylineOdds(
  parsedOdds: ParsedOdds[]
): { 
  away: OddsOutcome | null; 
  home: OddsOutcome | null;
  awayBookmaker?: string;
  homeBookmaker?: string;
} | null {
  if (parsedOdds.length === 0) return null;

  let bestAway: OddsOutcome | null = null;
  let bestHome: OddsOutcome | null = null;
  let awayBookmaker: string | undefined;
  let homeBookmaker: string | undefined;

  parsedOdds.forEach((odds) => {
    if (odds.moneyline?.away) {
      // Higher decimal odds = better odds (works for both favorites and underdogs)
      if (!bestAway || odds.moneyline.away.price > bestAway.price) {
        bestAway = odds.moneyline.away;
        awayBookmaker = odds.bookmaker;
      }
    }
    if (odds.moneyline?.home) {
      // Higher decimal odds = better odds (works for both favorites and underdogs)
      if (!bestHome || odds.moneyline.home.price > bestHome.price) {
        bestHome = odds.moneyline.home;
        homeBookmaker = odds.bookmaker;
      }
    }
  });

  return { away: bestAway, home: bestHome, awayBookmaker, homeBookmaker };
}

/** OddsSnapshot format (aligned with recommendation-engine) */
export interface OddsSnapshotForRecs {
  spread?: number;
  total?: number;
  moneyline?: { away?: number; home?: number };
}

/**
 * Build best-odds snapshot from all bookmakers.
 * - Moneyline: best (highest decimal) price per side across books
 * - Spread: consensus (median) of home spread point
 * - Total: consensus (median) of total point
 */
export function buildBestOddsSnapshot(parsedOdds: ParsedOdds[]): OddsSnapshotForRecs | null {
  if (!parsedOdds.length) return null;
  const snapshot: OddsSnapshotForRecs = {};

  // Best moneyline
  const bestML = getBestMoneylineOdds(parsedOdds);
  if (bestML?.away || bestML?.home) {
    snapshot.moneyline = {
      away: bestML.away?.price,
      home: bestML.home?.price,
    };
  }

  // Consensus spread (home spread point)
  const spreadPoints = parsedOdds
    .map((o) => o.spread?.home?.point)
    .filter((p): p is number => typeof p === "number");
  if (spreadPoints.length > 0) {
    spreadPoints.sort((a, b) => a - b);
    snapshot.spread = spreadPoints[Math.floor(spreadPoints.length / 2)];
  }

  // Consensus total
  const totalPoints = parsedOdds
    .map((o) => o.total?.point)
    .filter((p): p is number => typeof p === "number");
  if (totalPoints.length > 0) {
    totalPoints.sort((a, b) => a - b);
    snapshot.total = totalPoints[Math.floor(totalPoints.length / 2)];
  }

  return Object.keys(snapshot).length > 0 ? snapshot : null;
}

