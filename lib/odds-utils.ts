import { OddsGame, OddsMarket, OddsOutcome } from "@/types";

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
}

/**
 * Parse odds data and match outcomes to teams
 */
export function parseOdds(game: OddsGame): ParsedOdds[] {
  if (!game.bookmakers || game.bookmakers.length === 0) {
    return [];
  }

  return game.bookmakers.map((bookmaker) => {
    const moneylineMarket = bookmaker.markets.find((m) => m.key === "h2h");
    const spreadMarket = bookmaker.markets.find((m) => m.key === "spreads");

    const parseMarket = (
      market: OddsMarket | undefined,
      team1: string,
      team2: string
    ) => {
      if (!market) return { team1: null, team2: null };

      // Normalize team names for matching
      const normalizeTeamName = (name: string): string[] => {
        const parts = name.toLowerCase().split(" ");
        const variations = [
          name.toLowerCase(), // Full name
          parts[0], // First word
        ];
        
        if (parts.length > 1) {
          variations.push(parts[parts.length - 1]); // Last word
          variations.push(parts.slice(0, 2).join(" ")); // First two words
        }
        
        return variations;
      };

      const team1Variations = normalizeTeamName(team1);
      const team2Variations = normalizeTeamName(team2);

      // Try to match outcomes to teams
      let team1Outcome: OddsOutcome | null = null;
      let team2Outcome: OddsOutcome | null = null;

      for (const outcome of market.outcomes) {
        const outcomeName = outcome.name.toLowerCase();
        
        // Check if this outcome matches team1
        if (!team1Outcome && team1Variations.some((variant) => outcomeName.includes(variant) || variant.includes(outcomeName))) {
          team1Outcome = outcome;
          continue;
        }
        
        // Check if this outcome matches team2
        if (!team2Outcome && team2Variations.some((variant) => outcomeName.includes(variant) || variant.includes(outcomeName))) {
          team2Outcome = outcome;
          continue;
        }
      }

      // Fallback: if we couldn't match by name, use position (first = away, second = home)
      if (!team1Outcome && market.outcomes.length >= 1) {
        team1Outcome = market.outcomes[0];
      }
      if (!team2Outcome && market.outcomes.length >= 2) {
        team2Outcome = market.outcomes[1];
      }

      return {
        team1: team1Outcome,
        team2: team2Outcome,
      };
    };

    const moneyline = parseMarket(moneylineMarket, game.away_team, game.home_team);
    const spread = parseMarket(spreadMarket, game.away_team, game.home_team);

    return {
      bookmaker: bookmaker.title,
      moneyline: {
        away: moneyline.team1,
        home: moneyline.team2,
      },
      spread: {
        away: spread.team1,
        home: spread.team2,
      },
    };
  });
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

