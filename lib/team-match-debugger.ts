/**
 * Team Match Debugger
 * 
 * Tools for debugging and validating team name matching
 */

import { OddsGame, OddsMarket } from "@/types";
import { matchTeamsToOutcomes, normalizeTeamName } from "./team-matcher";
import { validateOdds, determineFavorite } from "./odds-standardization";

export interface MatchDebugInfo {
  game: {
    id: string;
    awayTeam: string;
    homeTeam: string;
  };
  markets: {
    moneyline?: {
      outcomes: Array<{ name: string; price: number }>;
      match: {
        away: string | null;
        home: string | null;
        confidence: 'high' | 'medium' | 'low';
        method: string;
        warnings?: string[];
      };
      validation: {
        oddsValid: boolean;
        favorite: 'home' | 'away' | null;
        oddsRatio: number;
        potentialReversal: boolean;
      };
    };
    spread?: {
      outcomes: Array<{ name: string; price: number; point?: number }>;
      match: {
        away: string | null;
        home: string | null;
        confidence: 'high' | 'medium' | 'low';
        method: string;
        warnings?: string[];
      };
    };
  };
  recommendations: string[];
}

/**
 * Debug team matching for a specific game
 */
export function debugTeamMatching(game: OddsGame): MatchDebugInfo {
  const recommendations: string[] = [];
  
  const moneylineMarket = game.bookmakers?.[0]?.markets.find((m) => m.key === "h2h");
  const spreadMarket = game.bookmakers?.[0]?.markets.find((m) => m.key === "spreads");

  const moneylineMatch = matchTeamsToOutcomes(
    moneylineMarket,
    game.away_team,
    game.home_team
  );

  const spreadMatch = matchTeamsToOutcomes(
    spreadMarket,
    game.away_team,
    game.home_team
  );

  // Validate moneyline odds
  let moneylineValidation: {
    oddsValid: boolean;
    favorite: 'home' | 'away' | null;
    oddsRatio: number;
    potentialReversal: boolean;
  } | undefined;
  if (moneylineMatch.away && moneylineMatch.home) {
    const awayDecimal = moneylineMatch.away.price;
    const homeDecimal = moneylineMatch.home.price;
    const oddsValid = validateOdds(homeDecimal, awayDecimal);
    const favorite = determineFavorite(homeDecimal, awayDecimal);
    const oddsRatio = Math.max(homeDecimal, awayDecimal) / Math.min(homeDecimal, awayDecimal);
    
    // Check for potential reversal
    // If confidence is low and odds ratio is high, might be reversed
    const potentialReversal = 
      moneylineMatch.confidence === 'low' && 
      oddsRatio > 5 &&
      moneylineMatch.method === 'position';

    moneylineValidation = {
      oddsValid,
      favorite,
      oddsRatio,
      potentialReversal,
    };

    // Generate recommendations
    if (!oddsValid) {
      recommendations.push('⚠️ Odds validation failed - odds may be invalid');
    }
    
    if (potentialReversal) {
      recommendations.push(
        `⚠️ POTENTIAL REVERSAL DETECTED: Low confidence match with high odds ratio (${oddsRatio.toFixed(2)}). ` +
        `Favorite appears to be ${favorite === 'home' ? game.home_team : game.away_team}. ` +
        `Verify team assignments manually.`
      );
    }
    
    if (moneylineMatch.confidence === 'low') {
      recommendations.push(
        `⚠️ Low confidence match (${moneylineMatch.method}). ` +
        `Consider adding explicit team name mappings for "${game.away_team}" and "${game.home_team}".`
      );
    }

    if (moneylineMatch.warnings && moneylineMatch.warnings.length > 0) {
      recommendations.push(...moneylineMatch.warnings.map(w => `⚠️ ${w}`));
    }
  }

  return {
    game: {
      id: game.id,
      awayTeam: game.away_team,
      homeTeam: game.home_team,
    },
    markets: {
      moneyline: moneylineMarket ? {
        outcomes: moneylineMarket.outcomes.map(o => ({
          name: o.name,
          price: o.price,
        })),
        match: {
          away: moneylineMatch.away?.name || null,
          home: moneylineMatch.home?.name || null,
          confidence: moneylineMatch.confidence,
          method: moneylineMatch.method,
          warnings: moneylineMatch.warnings,
        },
        validation: moneylineValidation!,
      } : undefined,
      spread: spreadMarket ? {
        outcomes: spreadMarket.outcomes.map(o => ({
          name: o.name,
          price: o.price,
          point: o.point,
        })),
        match: {
          away: spreadMatch.away?.name || null,
          home: spreadMatch.home?.name || null,
          confidence: spreadMatch.confidence,
          method: spreadMatch.method,
          warnings: spreadMatch.warnings,
        },
      } : undefined,
    },
    recommendations,
  };
}

/**
 * Generate team name variations for debugging
 */
export function generateTeamVariations(teamName: string): {
  normalized: string[];
  suggestions: string[];
} {
  const normalized = normalizeTeamName(teamName);
  
  // Generate suggestions for common patterns
  const suggestions: string[] = [];
  const words = teamName.toLowerCase().split(/\s+/);
  
  // Common abbreviations
  if (words.length > 1) {
    const abbrev = words.map(w => w[0]).join('').toUpperCase();
    suggestions.push(abbrev);
  }
  
  // Common suffixes to try
  const suffixes = ['university', 'college', 'state', 'st', 'st.', 'univ', 'u'];
  for (const suffix of suffixes) {
    if (!teamName.toLowerCase().includes(suffix)) {
      suggestions.push(`${teamName} ${suffix}`);
      suggestions.push(`${teamName} ${suffix.charAt(0).toUpperCase() + suffix.slice(1)}`);
    }
  }
  
  return {
    normalized,
    suggestions,
  };
}

