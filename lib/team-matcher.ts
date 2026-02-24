/**
 * Robust Team Name Matcher
 * 
 * Handles matching team names from different sources (Odds API, SportsData API, etc.)
 * with multiple fallback strategies and validation
 */

import { OddsOutcome, OddsMarket } from "@/types";
import { validateOdds, determineFavorite } from "./odds-standardization";
import { findMatchOverride, applyMatchOverride } from "./team-match-overrides";

export interface TeamMatchResult {
  away: OddsOutcome | null;
  home: OddsOutcome | null;
  confidence: 'high' | 'medium' | 'low';
  method: 'exact' | 'fuzzy' | 'position' | 'odds-validated';
  warnings?: string[];
}

/**
 * Normalize team name for matching
 * Removes common suffixes, normalizes case, handles abbreviations
 */
export function normalizeTeamName(name: string): string[] {
  if (!name) return [];
  
  const normalized = name.toLowerCase().trim();
  const variations: string[] = [normalized];
  
  // Split into words
  const words = normalized.split(/\s+/);
  
  // Add full name
  variations.push(normalized);
  
  // Add first word (often the main identifier)
  if (words.length > 0) {
    variations.push(words[0]);
  }
  
  // Add last word (often mascot/type)
  if (words.length > 1) {
    variations.push(words[words.length - 1]);
  }
  
  // Add first two words (common pattern like "Los Angeles Lakers")
  if (words.length >= 2) {
    variations.push(words.slice(0, 2).join(' '));
  }
  
  // Remove common suffixes for matching
  const suffixes = ['university', 'college', 'state', 'st', 'st.', 'univ', 'u', 'u.'];
  const withoutSuffixes = words
    .filter(w => !suffixes.includes(w))
    .join(' ');
  if (withoutSuffixes && withoutSuffixes !== normalized) {
    variations.push(withoutSuffixes);
  }
  
  // Handle abbreviations (e.g., "UCLA" -> "ucla", "uc", "los angeles")
  if (normalized.match(/^[a-z]{2,4}$/)) {
    // It's likely an abbreviation, add common expansions
    const abbrevExpansions: Record<string, string[]> = {
      'ucla': ['los angeles', 'california los angeles', 'bruins', 'ucla bruins'],
      'usc': ['southern california', 'south california', 'trojans', 'usc trojans'],
      'unc': ['north carolina', 'carolina', 'tar heels', 'north carolina tar heels'],
      'duke': ['duke', 'blue devils', 'duke blue devils'],
      'kentucky': ['kentucky', 'uk', 'wildcats', 'kentucky wildcats'],
      'kansas': ['kansas', 'ku', 'jayhawks', 'kansas jayhawks'],
      'uc': ['california', 'university of california'],
    };
    
    if (abbrevExpansions[normalized]) {
      variations.push(...abbrevExpansions[normalized]);
    }
  }
  
  // Handle "UC" prefix teams (UC Riverside, UC Irvine, etc.)
  if (normalized.startsWith('uc ')) {
    const ucTeam = normalized.replace('uc ', '');
    variations.push(`university of california ${ucTeam}`);
    variations.push(`california ${ucTeam}`);
    variations.push(`uc${ucTeam.replace(/\s+/g, '')}`); // UC Riverside -> ucriverside
  }
  
  // Remove duplicates and return
  return Array.from(new Set(variations));
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find best matching outcome for a team name using fuzzy matching
 */
function findBestMatch(
  teamName: string,
  outcomes: OddsOutcome[],
  teamVariations: string[]
): { outcome: OddsOutcome; score: number } | null {
  let bestMatch: { outcome: OddsOutcome; score: number } | null = null;
  
  for (const outcome of outcomes) {
    const outcomeName = outcome.name.toLowerCase();
    
    // Check exact match first
    for (const variation of teamVariations) {
      if (outcomeName === variation) {
        return { outcome, score: 1.0 };
      }
    }
    
    // Check substring matches
    for (const variation of teamVariations) {
      if (outcomeName.includes(variation) || variation.includes(outcomeName)) {
        const score = Math.max(
          variation.length / Math.max(outcomeName.length, variation.length),
          outcomeName.length / Math.max(outcomeName.length, variation.length)
        );
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { outcome, score };
        }
      }
    }
    
    // Calculate similarity score
    for (const variation of teamVariations) {
      const similarity = calculateSimilarity(outcomeName, variation);
      if (similarity > 0.7) { // 70% similarity threshold
        if (!bestMatch || similarity > bestMatch.score) {
          bestMatch = { outcome, score: similarity };
        }
      }
    }
  }
  
  return bestMatch;
}

/**
 * Match outcomes to teams with multiple strategies and validation
 */
export function matchTeamsToOutcomes(
  market: OddsMarket | undefined,
  awayTeamName: string,
  homeTeamName: string
): TeamMatchResult {
  if (!market || !market.outcomes || market.outcomes.length < 2) {
    return {
      away: null,
      home: null,
      confidence: 'low',
      method: 'position',
      warnings: ['Market has insufficient outcomes'],
    };
  }

  // Check for manual override first
  const override = findMatchOverride(awayTeamName, homeTeamName);
  if (override) {
    const result = applyMatchOverride(market.outcomes, override);
    return {
      away: result.away,
      home: result.home,
      confidence: 'high',
      method: 'odds-validated',
      warnings: override.reason ? [`Using manual override: ${override.reason}`] : undefined,
    };
  }

  const warnings: string[] = [];
  const awayVariations = normalizeTeamName(awayTeamName);
  const homeVariations = normalizeTeamName(homeTeamName);
  
  let awayOutcome: OddsOutcome | null = null;
  let homeOutcome: OddsOutcome | null = null;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let method: 'exact' | 'fuzzy' | 'position' | 'odds-validated' = 'position';

  // Strategy 1: Exact name matching
  // Try to match each outcome to exactly one team (avoid double-matching)
  const matchedOutcomes = new Set<OddsOutcome>();
  
  for (const outcome of market.outcomes) {
    const outcomeName = outcome.name.toLowerCase();
    
    // Check away team first (if not already matched)
    if (!awayOutcome && !matchedOutcomes.has(outcome)) {
      for (const variation of awayVariations) {
        if (outcomeName === variation || outcomeName.includes(variation) || variation.includes(outcomeName)) {
          awayOutcome = outcome;
          matchedOutcomes.add(outcome);
          confidence = 'high';
          method = 'exact';
          break;
        }
      }
    }
    
    // Check home team (if not already matched and away team is different)
    if (!homeOutcome && !matchedOutcomes.has(outcome) && awayOutcome !== outcome) {
      for (const variation of homeVariations) {
        if (outcomeName === variation || outcomeName.includes(variation) || variation.includes(outcomeName)) {
          homeOutcome = outcome;
          matchedOutcomes.add(outcome);
          confidence = 'high';
          method = 'exact';
          break;
        }
      }
    }
  }

  // Strategy 2: Fuzzy matching if exact match failed
  // Only match outcomes that haven't been matched yet
  if (!awayOutcome || !homeOutcome) {
    if (!awayOutcome) {
      const availableOutcomes = market.outcomes.filter(o => !matchedOutcomes.has(o));
      const match = findBestMatch(awayTeamName, availableOutcomes, awayVariations);
      if (match && match.score > 0.7) {
        awayOutcome = match.outcome;
        matchedOutcomes.add(match.outcome);
        confidence = match.score > 0.85 ? 'high' : 'medium';
        method = 'fuzzy';
      }
    }
    
    if (!homeOutcome) {
      const availableOutcomes = market.outcomes.filter(o => !matchedOutcomes.has(o) && o !== awayOutcome);
      const match = findBestMatch(homeTeamName, availableOutcomes, homeVariations);
      if (match && match.score > 0.7) {
        homeOutcome = match.outcome;
        matchedOutcomes.add(match.outcome);
        confidence = match.score > 0.85 ? 'high' : 'medium';
        method = 'fuzzy';
      }
    }
  }

  // Strategy 3: Smart position-based fallback using spread points
  // For spreads: negative point = favorite (usually home), positive = underdog (usually away)
  // Use this to help determine which outcome belongs to which team
  if (!awayOutcome || !homeOutcome) {
    if (market.outcomes.length === 2) {
      const outcome1 = market.outcomes[0];
      const outcome2 = market.outcomes[1];
      
      // Check if this is a spread market (has point values)
      const hasSpreadPoints = outcome1.point !== undefined && outcome2.point !== undefined;
      
      if (hasSpreadPoints) {
        // Use spread points to determine favorite/underdog
        // Negative point = favorite (typically home), positive = underdog (typically away)
        const outcome1Point = outcome1.point || 0;
        const outcome2Point = outcome2.point || 0;
        
        // The outcome with negative point is likely the favorite (home)
        // The outcome with positive point is likely the underdog (away)
        if (outcome1Point < 0 && outcome2Point > 0) {
          // outcome1 is favorite (home), outcome2 is underdog (away)
          if (!awayOutcome) awayOutcome = outcome2;
          if (!homeOutcome) homeOutcome = outcome1;
          if (method !== 'exact' && method !== 'fuzzy') {
            confidence = 'medium';
            method = 'odds-validated';
            warnings.push(`Using spread point logic: ${outcome2.name} (${outcome2Point > 0 ? '+' : ''}${outcome2Point}) = away, ${outcome1.name} (${outcome1Point}) = home`);
          }
        } else if (outcome1Point > 0 && outcome2Point < 0) {
          // outcome1 is underdog (away), outcome2 is favorite (home)
          if (!awayOutcome) awayOutcome = outcome1;
          if (!homeOutcome) homeOutcome = outcome2;
          if (method !== 'exact' && method !== 'fuzzy') {
            confidence = 'medium';
            method = 'odds-validated';
            warnings.push(`Using spread point logic: ${outcome1.name} (${outcome1Point > 0 ? '+' : ''}${outcome1Point}) = away, ${outcome2.name} (${outcome2Point}) = home`);
          }
        } else {
          // Both have same sign or unclear, fall back to position
          if (!awayOutcome) awayOutcome = outcome1;
          if (!homeOutcome) homeOutcome = outcome2;
          if (method !== 'exact' && method !== 'fuzzy') {
            confidence = 'low';
            method = 'position';
            warnings.push(`Using position-based matching (spread points unclear)`);
          }
        }
      } else {
        // Not a spread market, use simple position fallback
        if (!awayOutcome && market.outcomes.length >= 1) {
          awayOutcome = outcome1;
          if (method !== 'exact' && method !== 'fuzzy') {
            confidence = 'low';
            method = 'position';
            warnings.push(`Using position-based matching for away team (${awayTeamName})`);
          }
        }
        
        if (!homeOutcome && market.outcomes.length >= 2) {
          homeOutcome = outcome2;
          if (method !== 'exact' && method !== 'fuzzy') {
            confidence = 'low';
            method = 'position';
            warnings.push(`Using position-based matching for home team (${homeTeamName})`);
          }
        }
      }
    } else {
      // Not enough outcomes
      if (!awayOutcome && market.outcomes.length >= 1) {
        awayOutcome = market.outcomes[0];
      }
      if (!homeOutcome && market.outcomes.length >= 2) {
        homeOutcome = market.outcomes[1];
      }
    }
  }

  // Strategy 4: Validate using odds logic and detect reversals
  if (awayOutcome && homeOutcome && awayOutcome !== homeOutcome) {
    const awayDecimal = awayOutcome.price;
    const homeDecimal = homeOutcome.price;
    
    // Skip validation if odds are invalid (e.g., 1.0)
    const awayValid = awayDecimal >= 1.0;
    const homeValid = homeDecimal >= 1.0;
    
    if (!awayValid || !homeValid) {
      warnings.push(`Invalid odds detected: away=${awayDecimal}, home=${homeDecimal}. Skipping odds-based validation.`);
    } else {
      // Validate odds are reasonable
      if (!validateOdds(homeDecimal, awayDecimal)) {
        warnings.push(`Odds validation failed: home=${homeDecimal}, away=${awayDecimal}`);
      }
      
      // Check if we might have a reversal
      // If both teams were matched by position and odds suggest a clear favorite,
      // we might have them reversed
      if (method === 'position' && market.outcomes.length === 2) {
        const favorite = determineFavorite(homeDecimal, awayDecimal);
        const oddsRatio = Math.max(homeDecimal, awayDecimal) / Math.min(homeDecimal, awayDecimal);
        
        // If odds ratio is very large (> 10), and we matched by position, likely a reversal
        if (oddsRatio > 10) {
          warnings.push(
            `Very large odds difference detected (ratio: ${oddsRatio.toFixed(2)}). ` +
            `Favorite: ${favorite === 'home' ? homeTeamName : awayTeamName} ` +
            `(${favorite === 'home' ? homeDecimal : awayDecimal} decimal). ` +
            `This suggests a potential reversal - consider using spread point logic or manual override.`
          );
          
          // For moneyline markets, try to fix using odds if ratio is extreme
          // Lower decimal odds = favorite, higher = underdog
          // Favorite is typically home, underdog is typically away
          if (market.outcomes.length === 2 && !market.outcomes[0].point && !market.outcomes[1].point) {
            // This is a moneyline market (no spread points)
            const outcome1 = market.outcomes[0];
            const outcome2 = market.outcomes[1];
            const outcome1Decimal = outcome1.price;
            const outcome2Decimal = outcome2.price;
            
            // If odds are valid and suggest a clear favorite/underdog
            if (outcome1Decimal >= 1.0 && outcome2Decimal >= 1.0) {
              const lowerOddsOutcome = outcome1Decimal < outcome2Decimal ? outcome1 : outcome2;
              const higherOddsOutcome = outcome1Decimal < outcome2Decimal ? outcome2 : outcome1;
              
              // Swap if current assignment doesn't match odds logic
              if ((awayOutcome === lowerOddsOutcome && homeOutcome === higherOddsOutcome) ||
                  (awayOutcome === higherOddsOutcome && homeOutcome === lowerOddsOutcome)) {
                // Current assignment might be wrong - favorite should be home, underdog should be away
                if (awayOutcome === lowerOddsOutcome) {
                  // Away is favorite, but should be home - swap them
                  const temp = awayOutcome;
                  awayOutcome = homeOutcome;
                  homeOutcome = temp;
                  warnings.push(`Swapped teams based on odds logic: ${lowerOddsOutcome.name} (favorite) should be home, ${higherOddsOutcome.name} (underdog) should be away`);
                  method = 'odds-validated';
                  confidence = 'medium';
                }
              }
            }
          }
        } else if (oddsRatio > 5) {
          warnings.push(
            `Large odds difference detected (ratio: ${oddsRatio.toFixed(2)}). ` +
            `Favorite: ${favorite === 'home' ? homeTeamName : awayTeamName} ` +
            `(${favorite === 'home' ? homeDecimal : awayDecimal} decimal). ` +
            `Verify team assignments are correct.`
          );
        }
      }
      
      // If we used fuzzy matching, upgrade confidence if odds validate correctly
      if (method === 'fuzzy' && validateOdds(homeDecimal, awayDecimal)) {
        confidence = 'medium';
        method = 'odds-validated';
      }
    }
  }

  // Final validation: ensure we don't have the same outcome for both teams
  if (awayOutcome && homeOutcome && awayOutcome === homeOutcome) {
    warnings.push('CRITICAL: Same outcome assigned to both teams!');
    
    // Try to fix using spread points if available
    if (market.outcomes.length === 2) {
      const outcome1 = market.outcomes[0];
      const outcome2 = market.outcomes[1];
      const hasSpreadPoints = outcome1.point !== undefined && outcome2.point !== undefined;
      
      if (hasSpreadPoints) {
        const outcome1Point = outcome1.point || 0;
        const outcome2Point = outcome2.point || 0;
        
        // Assign based on spread points: negative = favorite (home), positive = underdog (away)
        if (outcome1Point < 0 && outcome2Point > 0) {
          awayOutcome = outcome2; // Positive point = underdog = away
          homeOutcome = outcome1; // Negative point = favorite = home
        } else if (outcome1Point > 0 && outcome2Point < 0) {
          awayOutcome = outcome1; // Positive point = underdog = away
          homeOutcome = outcome2; // Negative point = favorite = home
        } else {
          // Fallback to position
          awayOutcome = outcome1;
          homeOutcome = outcome2;
        }
        confidence = 'medium';
        method = 'odds-validated';
        warnings.push('Fixed using spread point logic');
      } else {
        // Reset and use position-based
        awayOutcome = outcome1;
        homeOutcome = outcome2;
        confidence = 'low';
        method = 'position';
      }
    }
  }

  return {
    away: awayOutcome,
    home: homeOutcome,
    confidence,
    method,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Enhanced parseOdds function with robust team matching
 */
/** Parsed total (Over/Under) from a bookmaker */
export interface ParsedTotalResult {
  over: OddsOutcome | null;
  under: OddsOutcome | null;
  point: number | null;
}

function parseTotalsMarket(markets: OddsMarket[] | undefined): ParsedTotalResult {
  const totalsMarket = markets?.find((m) => m.key === "totals");
  if (!totalsMarket?.outcomes?.length) return { over: null, under: null, point: null };
  const overOutcome = totalsMarket.outcomes.find((o) => o.name === "Over") ?? null;
  const underOutcome = totalsMarket.outcomes.find((o) => o.name === "Under") ?? null;
  const point = overOutcome?.point ?? underOutcome?.point ?? null;
  return { over: overOutcome ?? null, under: underOutcome ?? null, point };
}

export function parseOddsWithValidation(
  game: { away_team: string; home_team: string },
  bookmakers: Array<{ title: string; markets: OddsMarket[] }>
): Array<{
  bookmaker: string;
  moneyline?: { away: OddsOutcome | null; home: OddsOutcome | null };
  spread?: { away: OddsOutcome | null; home: OddsOutcome | null };
  total?: ParsedTotalResult | null;
  matchQuality?: {
    moneyline?: TeamMatchResult;
    spread?: TeamMatchResult;
  };
}> {
  return bookmakers.map((bookmaker) => {
    const moneylineMarket = bookmaker.markets.find((m) => m.key === "h2h");
    const spreadMarket = bookmaker.markets.find((m) => m.key === "spreads");

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

    // Log warnings in development
    if (process.env.NODE_ENV === 'development') {
      if (moneylineMatch.warnings && moneylineMatch.warnings.length > 0) {
        console.warn(`[TeamMatcher] Moneyline warnings for ${game.away_team} @ ${game.home_team}:`, moneylineMatch.warnings);
      }
      if (spreadMatch.warnings && spreadMatch.warnings.length > 0) {
        console.warn(`[TeamMatcher] Spread warnings for ${game.away_team} @ ${game.home_team}:`, spreadMatch.warnings);
      }
      
      if (moneylineMatch.confidence === 'low' || spreadMatch.confidence === 'low') {
        console.warn(
          `[TeamMatcher] Low confidence match for ${game.away_team} @ ${game.home_team}. ` +
          `Moneyline: ${moneylineMatch.method} (${moneylineMatch.confidence}), ` +
          `Spread: ${spreadMatch.method} (${spreadMatch.confidence})`
        );
      }
    }

    const totalParsed = parseTotalsMarket(bookmaker.markets);

    return {
      bookmaker: bookmaker.title,
      moneyline: {
        away: moneylineMatch.away,
        home: moneylineMatch.home,
      },
      spread: {
        away: spreadMatch.away,
        home: spreadMatch.home,
      },
      total: (totalParsed.over ?? totalParsed.under) ? totalParsed : null,
      matchQuality: {
        moneyline: moneylineMatch,
        spread: spreadMatch,
      },
    };
  });
}

