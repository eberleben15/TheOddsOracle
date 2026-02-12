/**
 * Odds Standardization Utilities
 * 
 * Standardizes odds to decimal format throughout the application
 * and provides conversion utilities between formats
 */

/**
 * Convert American odds to decimal odds
 * @param americanOdds - American odds (e.g., -250, +205)
 * @returns Decimal odds (e.g., 1.4, 3.05)
 */
export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    // Underdog: positive American odds
    return (americanOdds / 100) + 1;
  } else {
    // Favorite: negative American odds
    return (100 / Math.abs(americanOdds)) + 1;
  }
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
 * Calculate implied probability from decimal odds
 * @param decimalOdds - Decimal odds
 * @returns Implied probability as a decimal (0-1)
 */
export function decimalToImpliedProbability(decimalOdds: number): number {
  return 1 / decimalOdds;
}

/**
 * Calculate implied probability from American odds
 * @param americanOdds - American odds
 * @returns Implied probability as a decimal (0-1)
 */
export function americanToImpliedProbability(americanOdds: number): number {
  const decimal = americanToDecimal(americanOdds);
  return decimalToImpliedProbability(decimal);
}

/**
 * Validate that odds make sense for a favorite/underdog
 * @param homeDecimalOdds - Home team decimal odds
 * @param awayDecimalOdds - Away team decimal odds
 * @returns true if odds are valid (favorite has lower decimal odds)
 */
export function validateOdds(homeDecimalOdds: number, awayDecimalOdds: number): boolean {
  // Both odds should be >= 1.0
  if (homeDecimalOdds < 1.0 || awayDecimalOdds < 1.0) {
    return false;
  }
  
  // The sum of implied probabilities should be close to 1 (accounting for vig)
  const homeProb = decimalToImpliedProbability(homeDecimalOdds);
  const awayProb = decimalToImpliedProbability(awayDecimalOdds);
  const totalProb = homeProb + awayProb;
  
  // Total probability should be between 1.0 and 1.1 (0-10% vig)
  return totalProb >= 1.0 && totalProb <= 1.1;
}

/**
 * Determine which team is the favorite based on decimal odds
 * @param homeDecimalOdds - Home team decimal odds
 * @param awayDecimalOdds - Away team decimal odds
 * @returns 'home' | 'away' | null if odds are invalid
 */
export function determineFavorite(homeDecimalOdds: number, awayDecimalOdds: number): 'home' | 'away' | null {
  if (!validateOdds(homeDecimalOdds, awayDecimalOdds)) {
    return null;
  }
  
  // Lower decimal odds = favorite
  if (homeDecimalOdds < awayDecimalOdds) {
    return 'home';
  } else if (awayDecimalOdds < homeDecimalOdds) {
    return 'away';
  }
  
  return null; // Even odds
}

/**
 * Format decimal odds for display
 * @param decimalOdds - Decimal odds
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatDecimalOdds(decimalOdds: number, precision: number = 2): string {
  return decimalOdds.toFixed(precision);
}

/**
 * Format American odds for display
 * @param americanOdds - American odds
 * @returns Formatted string with + or - sign
 */
export function formatAmericanOdds(americanOdds: number): string {
  if (americanOdds > 0) {
    return `+${americanOdds}`;
  }
  return americanOdds.toString();
}

