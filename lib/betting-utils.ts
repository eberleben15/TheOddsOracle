import { OddsOutcome } from "@/types";
import { ParsedOdds, decimalToAmerican } from "./odds-utils";

/**
 * Calculate implied probability from American odds
 */
export function calculateImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Calculate potential payout for a bet
 */
export function calculatePayout(betAmount: number, americanOdds: number): number {
  if (americanOdds > 0) {
    return betAmount * (americanOdds / 100);
  } else {
    return betAmount * (100 / Math.abs(americanOdds));
  }
}

/**
 * Calculate total return (stake + winnings)
 */
export function calculateReturn(betAmount: number, americanOdds: number): number {
  return betAmount + calculatePayout(betAmount, americanOdds);
}

/**
 * Find best odds across all bookmakers for a team
 */
export function findBestOdds(
  parsedOdds: ParsedOdds[],
  teamType: "away" | "home",
  marketType: "moneyline" | "spread"
): { odds: OddsOutcome; bookmaker: string } | null {
  let best: { odds: OddsOutcome; bookmaker: string } | null = null;

  parsedOdds.forEach((bookmakerOdds) => {
    const market = bookmakerOdds[marketType];
    if (!market) return;

    const teamOdds = market[teamType];
    if (!teamOdds) return;

    // For moneyline: higher decimal = better
    // For spread: we want the best odds on the spread (higher decimal = better)
    if (
      !best ||
      teamOdds.price > best.odds.price
    ) {
      best = { odds: teamOdds, bookmaker: bookmakerOdds.bookmaker };
    }
  });

  return best;
}

/**
 * Calculate expected total points based on team averages
 * Uses a matchup-adjusted approach: team offense vs opponent defense
 */
export function calculateExpectedTotal(
  team1PPG: number,
  team1PAPG: number,
  team2PPG: number,
  team2PAPG: number
): number {
  // Matchup-adjusted scoring:
  // Team1's expected score = Team1's offense adjusted by Team2's defense
  // Team2's expected score = Team2's offense adjusted by Team1's defense
  
  // League average for college basketball (~72 PPG)
  const leagueAvg = 72;
  
  // Calculate how much better/worse each defense is vs league average
  const team2DefStrength = (team2PAPG - leagueAvg) / leagueAvg; // Negative = good defense
  const team1DefStrength = (team1PAPG - leagueAvg) / leagueAvg;
  
  // Adjust team offense based on opponent's defensive strength
  // Good defense reduces opponent scoring, bad defense increases it
  const team1Expected = team1PPG * (1 - team2DefStrength * 0.3); // 30% adjustment factor
  const team2Expected = team2PPG * (1 - team1DefStrength * 0.3);
  
  // Ensure reasonable totals for college basketball (typically 130-160)
  const total = team1Expected + team2Expected;
  return Math.max(120, Math.min(180, total));
}

/**
 * Calculate win probability based on stats
 */
export function calculateWinProbability(
  team1PPG: number,
  team1PAPG: number,
  team2PPG: number,
  team2PAPG: number
): { team1: number; team2: number } {
  const team1Expected = (team1PPG + team2PAPG) / 2;
  const team2Expected = (team2PPG + team1PAPG) / 2;
  const total = team1Expected + team2Expected;
  
  return {
    team1: team1Expected / total,
    team2: team2Expected / total,
  };
}

/**
 * Check if a bet has value (comparing implied probability to calculated probability)
 */
export function hasValue(
  impliedProbability: number,
  calculatedProbability: number,
  threshold: number = 0.05
): boolean {
  return calculatedProbability > impliedProbability + threshold;
}

/**
 * Calculate ATS (Against The Spread) record from recent games
 */
export function calculateATSRecord(
  games: Array<{ homeScore: number; awayScore: number; homeTeam: string; awayTeam: string }>,
  teamName: string,
  spreads: Array<{ team: string; spread: number }>
): { wins: number; losses: number; pushes: number } {
  let wins = 0;
  let losses = 0;
  let pushes = 0;

  games.forEach((game) => {
    const isHome = game.homeTeam === teamName;
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const opponentScore = isHome ? game.awayScore : game.homeScore;
    
    // Find spread for this game (simplified - in reality you'd match by date/opponent)
    const spreadData = spreads.find((s) => s.team === teamName);
    if (!spreadData) return;

    const adjustedScore = teamScore + spreadData.spread;
    const margin = adjustedScore - opponentScore;

    if (margin > 0) wins++;
    else if (margin < 0) losses++;
    else pushes++;
  });

  return { wins, losses, pushes };
}

/**
 * Calculate Over/Under record
 */
export function calculateOverUnderRecord(
  games: Array<{ homeScore: number; awayScore: number }>,
  overUnder: number
): { over: number; under: number; push: number } {
  let over = 0;
  let under = 0;
  let push = 0;

  games.forEach((game) => {
    const total = game.homeScore + game.awayScore;
    if (total > overUnder) over++;
    else if (total < overUnder) under++;
    else push++;
  });

  return { over, under, push };
}

