/**
 * Sport Detection Utilities
 * 
 * Maps The Odds API sport keys to our internal Sport type
 */

import { Sport, SPORT_CONFIGS } from "./sport-config";

/**
 * Map The Odds API sport_key to our Sport type
 */
export function detectSportFromOddsKey(sportKey: string): Sport {
  const mapping: Record<string, Sport> = {
    "basketball_ncaab": "cbb",
    "basketball_nba": "nba",
    "americanfootball_nfl": "nfl",
    "icehockey_nhl": "nhl",
    "baseball_mlb": "mlb",
  };

  return mapping[sportKey] || "cbb"; // Default to CBB if unknown
}

/**
 * Get sport from OddsGame
 */
export function getSportFromGame(game: { sport_key: string }): Sport {
  return detectSportFromOddsKey(game.sport_key);
}

/**
 * Check if a sport is supported
 */
export function isSportSupported(sportKey: string): boolean {
  const sport = detectSportFromOddsKey(sportKey);
  return sport in SPORT_CONFIGS;
}

