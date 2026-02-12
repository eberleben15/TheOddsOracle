/**
 * Stats Calculator
 * 
 * Calculates Four Factors and advanced metrics from raw statistics
 * Used when free APIs don't provide these metrics directly
 */

/**
 * Calculate Effective Field Goal Percentage (eFG%)
 * Formula: (FGM + 0.5 * 3PM) / FGA
 */
export function calculateEFG(
  fieldGoalsMade: number,
  fieldGoalsAttempted: number,
  threePointersMade: number
): number | null {
  if (fieldGoalsAttempted === 0) return null;
  
  const efg = ((fieldGoalsMade + 0.5 * threePointersMade) / fieldGoalsAttempted) * 100;
  return Math.round(efg * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate Turnover Rate (TOV%)
 * Formula: TOV / (FGA + 0.44 * FTA + TOV)
 */
export function calculateTOV(
  turnovers: number,
  fieldGoalsAttempted: number,
  freeThrowsAttempted: number
): number | null {
  const denominator = fieldGoalsAttempted + 0.44 * freeThrowsAttempted + turnovers;
  if (denominator === 0) return null;
  
  const tovRate = (turnovers / denominator) * 100;
  return Math.round(tovRate * 100) / 100;
}

/**
 * Calculate Offensive Rebound Rate (ORB%)
 * Formula: ORB / (ORB + OppDRB)
 */
export function calculateORB(
  offensiveRebounds: number,
  opponentDefensiveRebounds: number
): number | null {
  const denominator = offensiveRebounds + opponentDefensiveRebounds;
  if (denominator === 0) return null;
  
  const orbRate = (offensiveRebounds / denominator) * 100;
  return Math.round(orbRate * 100) / 100;
}

/**
 * Calculate Free Throw Rate (FTR)
 * Formula: FTA / FGA
 */
export function calculateFTR(
  freeThrowsAttempted: number,
  fieldGoalsAttempted: number
): number | null {
  if (fieldGoalsAttempted === 0) return null;
  
  const ftr = freeThrowsAttempted / fieldGoalsAttempted;
  return Math.round(ftr * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Calculate Offensive Rating (points per 100 possessions)
 * Formula: (Points / Possessions) * 100
 */
export function calculateOffensiveRating(
  points: number,
  possessions: number
): number | null {
  if (possessions === 0) return null;
  
  const ortg = (points / possessions) * 100;
  return Math.round(ortg * 100) / 100;
}

/**
 * Calculate Defensive Rating (opponent points per 100 possessions)
 * Formula: (OppPoints / Possessions) * 100
 */
export function calculateDefensiveRating(
  opponentPoints: number,
  possessions: number
): number | null {
  if (possessions === 0) return null;
  
  const drtg = (opponentPoints / possessions) * 100;
  return Math.round(drtg * 100) / 100;
}

/**
 * Calculate Pace (possessions per game)
 * Formula: (FGA + 0.44 * FTA + TOV - ORB) / Games
 * Or simpler: (Team Possessions + Opp Possessions) / 2 / Games
 */
export function calculatePace(
  fieldGoalsAttempted: number,
  freeThrowsAttempted: number,
  turnovers: number,
  offensiveRebounds: number,
  games: number
): number | null {
  if (games === 0) return null;
  
  // Estimate possessions per game
  const possessions = fieldGoalsAttempted + 0.44 * freeThrowsAttempted + turnovers - offensiveRebounds;
  const pace = possessions / games;
  return Math.round(pace * 100) / 100;
}

/**
 * Calculate possessions from game stats
 * Formula: FGA + 0.44 * FTA + TOV - ORB
 */
export function calculatePossessions(
  fieldGoalsAttempted: number,
  freeThrowsAttempted: number,
  turnovers: number,
  offensiveRebounds: number
): number {
  return fieldGoalsAttempted + 0.44 * freeThrowsAttempted + turnovers - offensiveRebounds;
}

/**
 * Calculate Assist-to-Turnover Ratio
 * Formula: AST / TOV
 */
export function calculateAssistTurnoverRatio(
  assists: number,
  turnovers: number
): number | null {
  if (turnovers === 0) return null;
  
  const ratio = assists / turnovers;
  return Math.round(ratio * 100) / 100;
}

/**
 * Calculate all Four Factors from raw stats
 */
export interface FourFactorsInput {
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  turnovers: number;
  freeThrowsAttempted: number;
  offensiveRebounds: number;
  opponentDefensiveRebounds: number;
}

export interface FourFactors {
  effectiveFieldGoalPercentage: number | null;
  turnoverRate: number | null;
  offensiveReboundRate: number | null;
  freeThrowRate: number | null;
}

export function calculateFourFactors(input: FourFactorsInput): FourFactors {
  return {
    effectiveFieldGoalPercentage: calculateEFG(
      input.fieldGoalsMade,
      input.fieldGoalsAttempted,
      input.threePointersMade
    ),
    turnoverRate: calculateTOV(
      input.turnovers,
      input.fieldGoalsAttempted,
      input.freeThrowsAttempted
    ),
    offensiveReboundRate: calculateORB(
      input.offensiveRebounds,
      input.opponentDefensiveRebounds
    ),
    freeThrowRate: calculateFTR(
      input.freeThrowsAttempted,
      input.fieldGoalsAttempted
    ),
  };
}

/**
 * Calculate advanced metrics from raw stats
 */
export interface AdvancedMetricsInput {
  points: number;
  opponentPoints: number;
  possessions: number;
  games: number;
}

export interface AdvancedMetrics {
  offensiveRating: number | null;
  defensiveRating: number | null;
  netRating: number | null;
  pace: number | null;
}

export function calculateAdvancedMetrics(
  input: AdvancedMetricsInput
): AdvancedMetrics {
  const ortg = calculateOffensiveRating(input.points, input.possessions);
  const drtg = calculateDefensiveRating(input.opponentPoints, input.possessions);
  
  return {
    offensiveRating: ortg,
    defensiveRating: drtg,
    netRating: ortg !== null && drtg !== null ? ortg - drtg : null,
    pace: input.games > 0 ? input.possessions / input.games : null,
  };
}
