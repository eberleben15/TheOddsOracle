/**
 * Team Match Overrides
 * 
 * Manual overrides for known problematic team name matches
 * Format: "awayTeam @ homeTeam" -> { awayOutcomeIndex, homeOutcomeIndex }
 * 
 * Use outcome indices (0-based) to specify which outcome belongs to which team
 * when automatic matching fails
 */

export interface TeamMatchOverride {
  awayTeamPattern: string | RegExp;
  homeTeamPattern: string | RegExp;
  awayOutcomeIndex: number; // 0-based index in outcomes array
  homeOutcomeIndex: number; // 0-based index in outcomes array
  reason?: string;
}

/**
 * Known problematic matches that need manual override
 */
export const TEAM_MATCH_OVERRIDES: TeamMatchOverride[] = [
  // Add overrides here as we discover them
  // Example:
  // {
  //   awayTeamPattern: /uc riverside/i,
  //   homeTeamPattern: /ucla/i,
  //   awayOutcomeIndex: 0,
  //   homeOutcomeIndex: 1,
  //   reason: "UCLA odds were being assigned to UC Riverside"
  // },
];

/**
 * Check if a game matches an override pattern
 */
export function findMatchOverride(
  awayTeam: string,
  homeTeam: string
): TeamMatchOverride | null {
  for (const override of TEAM_MATCH_OVERRIDES) {
    const awayMatch = 
      typeof override.awayTeamPattern === 'string'
        ? awayTeam.toLowerCase().includes(override.awayTeamPattern.toLowerCase())
        : override.awayTeamPattern.test(awayTeam);
    
    const homeMatch = 
      typeof override.homeTeamPattern === 'string'
        ? homeTeam.toLowerCase().includes(override.homeTeamPattern.toLowerCase())
        : override.homeTeamPattern.test(homeTeam);
    
    if (awayMatch && homeMatch) {
      return override;
    }
  }
  
  return null;
}

/**
 * Apply override to outcomes if match found
 */
export function applyMatchOverride(
  outcomes: Array<{ name: string; price: number }>,
  override: TeamMatchOverride
): { away: typeof outcomes[0] | null; home: typeof outcomes[0] | null } {
  const away = override.awayOutcomeIndex < outcomes.length 
    ? outcomes[override.awayOutcomeIndex] 
    : null;
  const home = override.homeOutcomeIndex < outcomes.length 
    ? outcomes[override.homeOutcomeIndex] 
    : null;
  
  return { away, home };
}

