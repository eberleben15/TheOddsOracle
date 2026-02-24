"use client";

import { Card, CardBody, CardHeader, Chip } from "@nextui-org/react";
import { ParsedOdds } from "@/lib/odds-utils";
import { TeamStats } from "@/types";
import {
  findBestOdds,
  calculateImpliedProbability,
  calculateExpectedTotal,
  calculateWinProbability,
  hasValue,
  calculateReturn,
} from "@/lib/betting-utils";
import { decimalToAmerican, formatDecimalOdds } from "@/lib/odds-utils";
import { getTeamData } from "@/lib/team-data";
import { OddsGame } from "@/types";
import { calculateTeamAnalytics, predictMatchup } from "@/lib/advanced-analytics";
import { getSportFromGame } from "@/lib/sports/sport-detection";

interface BettingInsightsProps {
  parsedOdds: ParsedOdds[];
  awayTeamStats: TeamStats;
  homeTeamStats: TeamStats;
  awayTeamName: string;
  homeTeamName: string;
  game?: OddsGame;
  prediction?: {
    winProbability: { away: number; home: number };
    predictedScore: { away: number; home: number };
    predictedSpread: number;
    confidence: number;
  };
}

export function BettingInsights({
  parsedOdds,
  awayTeamStats,
  homeTeamStats,
  awayTeamName,
  homeTeamName,
  game,
  prediction,
}: BettingInsightsProps) {
  const awayTeamData = getTeamData(awayTeamName);
  const homeTeamData = getTeamData(homeTeamName);
  const sport = game ? getSportFromGame(game) : undefined;
  const isMLB = sport === "mlb";
  const pointsPerGameLabel = isMLB ? "Runs Per Game" : "Points Per Game";
  const pointsAllowedLabel = isMLB ? "Runs Allowed Per Game" : "Points Allowed Per Game";
  const netRatingLabel = isMLB ? "Run Differential" : "Net Rating";

  // Calculate prediction if we have game but no prediction provided
  let calculatedPrediction = prediction;
  if (game && !prediction) {
    try {
      const awayAnalytics = calculateTeamAnalytics(awayTeamStats, awayTeamStats.recentGames || [], false, sport);
      const homeAnalytics = calculateTeamAnalytics(homeTeamStats, homeTeamStats.recentGames || [], true, sport);
      calculatedPrediction = predictMatchup(awayAnalytics, homeAnalytics, awayTeamStats, homeTeamStats, sport);
    } catch (error) {
      console.warn("Error calculating prediction:", error);
    }
  }

  // Note: Favorable bets are rendered in AdvancedAnalytics component to avoid duplication

  // Helper function to safely display numbers
  const safeNumber = (value: number | undefined, decimals: number = 1): string => {
    if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
      return "--";
    }
    return value.toFixed(decimals);
  };

  // Helper to get safe stat value with fallback
  const getStat = (value: number | undefined, fallback: number = 0): number => {
    return value !== undefined && !isNaN(value) && isFinite(value) ? value : fallback;
  };

  // Check if we have valid stats
  const hasValidStats = 
    awayTeamStats?.pointsPerGame !== undefined &&
    awayTeamStats?.pointsAllowedPerGame !== undefined &&
    homeTeamStats?.pointsPerGame !== undefined &&
    homeTeamStats?.pointsAllowedPerGame !== undefined;

  // Find best odds
  const bestAwayML = findBestOdds(parsedOdds, "away", "moneyline");
  const bestHomeML = findBestOdds(parsedOdds, "home", "moneyline");
  const bestAwaySpread = findBestOdds(parsedOdds, "away", "spread");
  const bestHomeSpread = findBestOdds(parsedOdds, "home", "spread");

  // Calculate probabilities (with safe defaults)
  const winProb = hasValidStats ? calculateWinProbability(
    awayTeamStats.pointsPerGame,
    awayTeamStats.pointsAllowedPerGame,
    homeTeamStats.pointsPerGame,
    homeTeamStats.pointsAllowedPerGame
  ) : { team1: 0.5, team2: 0.5 };

  // Calculate expected total - use predicted scores if available, otherwise fallback to simple calculation
  let expectedTotal = 0;
  if (calculatedPrediction?.predictedScore) {
    // Use the predicted scores from advanced analytics (most accurate)
    expectedTotal = calculatedPrediction.predictedScore.away + calculatedPrediction.predictedScore.home;
  } else if (hasValidStats) {
    // Fallback to simple calculation if prediction not available
    expectedTotal = calculateExpectedTotal(
      awayTeamStats.pointsPerGame,
      awayTeamStats.pointsAllowedPerGame,
      homeTeamStats.pointsPerGame,
      homeTeamStats.pointsAllowedPerGame
    );
  }

  // Calculate implied probabilities from odds
  const awayImpliedProb = bestAwayML
    ? calculateImpliedProbability(decimalToAmerican(bestAwayML.odds.price))
    : 0;
  const homeImpliedProb = bestHomeML
    ? calculateImpliedProbability(decimalToAmerican(bestHomeML.odds.price))
    : 0;

  // Check for value bets
  const awayHasValue = bestAwayML && hasValue(awayImpliedProb, winProb.team1);
  const homeHasValue = bestHomeML && hasValue(homeImpliedProb, winProb.team2);

  // Calculate potential returns for $100 bet
  const awayReturn = bestAwayML
    ? calculateReturn(100, decimalToAmerican(bestAwayML.odds.price))
    : 0;
  const homeReturn = bestHomeML
    ? calculateReturn(100, decimalToAmerican(bestHomeML.odds.price))
    : 0;

  return (
    <div className="space-y-6">
      {/* Standard Betting Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Best Odds Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Best Odds</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          {bestAwayML && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: awayTeamData.primaryColor }}
                >
                  {awayTeamName.split(" ")[0]}
                </span>
                {awayHasValue && (
                  <Chip size="sm" className="bg-value-light text-value font-medium" variant="flat">
                    Value
                  </Chip>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold">{formatDecimalOdds(bestAwayML.odds.price)}</div>
                <div className="text-xs text-gray-500">{bestAwayML.bookmaker}</div>
              </div>
            </div>
          )}
          {bestHomeML && (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium"
                  style={{ color: homeTeamData.primaryColor }}
                >
                  {homeTeamName.split(" ")[0]}
                </span>
                {homeHasValue && (
                  <Chip size="sm" className="bg-value-light text-value font-medium" variant="flat">
                    Value
                  </Chip>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold">{formatDecimalOdds(bestHomeML.odds.price)}</div>
                <div className="text-xs text-gray-500">{bestHomeML.bookmaker}</div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Expected Total Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Expected Total</h3>
        </CardHeader>
        <CardBody>
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">
              {safeNumber(expectedTotal, 1)}
            </div>
            <p className="text-sm text-gray-600">
              {calculatedPrediction?.predictedScore 
                ? "Based on AI prediction" 
                : hasValidStats 
                  ? "Based on team averages" 
                  : "Stats unavailable"}
            </p>
          </div>
        </CardBody>
      </Card>

      {/* Potential Returns Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Potential Returns</h3>
          <p className="text-xs text-gray-500">On $100 bet</p>
        </CardHeader>
        <CardBody className="space-y-3">
          {bestAwayML && (
            <div className="flex justify-between items-center">
              <span
                className="text-sm"
                style={{ color: awayTeamData.primaryColor }}
              >
                {awayTeamName.split(" ")[0]}
              </span>
              <span className="font-bold text-gray-700">
                ${safeNumber(awayReturn, 2)}
              </span>
            </div>
          )}
          {bestHomeML && (
            <div className="flex justify-between items-center">
              <span
                className="text-sm"
                style={{ color: homeTeamData.primaryColor }}
              >
                {homeTeamName.split(" ")[0]}
              </span>
              <span className="font-bold text-gray-700">
                ${safeNumber(homeReturn, 2)}
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Value Bets Card */}
      {(awayHasValue || homeHasValue) && (
        <Card className="border-2 border-value/30 bg-value-light/30">
          <CardHeader>
            <h3 className="text-lg font-semibold text-value">Value Bets</h3>
          </CardHeader>
          <CardBody className="space-y-2">
            {awayHasValue && (
              <div className="flex justify-between items-center">
                <span
                  className="text-sm font-medium"
                  style={{ color: awayTeamData.primaryColor }}
                >
                  {awayTeamName.split(" ")[0]} ML
                </span>
                <Chip size="sm" className="bg-value text-white">
                  {safeNumber(winProb.team1 * 100 - awayImpliedProb * 100, 1)}% edge
                </Chip>
              </div>
            )}
            {homeHasValue && (
              <div className="flex justify-between items-center">
                <span
                  className="text-sm font-medium"
                  style={{ color: homeTeamData.primaryColor }}
                >
                  {homeTeamName.split(" ")[0]} ML
                </span>
                <Chip size="sm" className="bg-value text-white">
                  {safeNumber(winProb.team2 * 100 - homeImpliedProb * 100, 1)}% edge
                </Chip>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Quick Stats Comparison */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Quick Comparison</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{pointsPerGameLabel}</span>
              <div className="flex gap-4">
                <span style={{ color: awayTeamData.primaryColor }}>
                  {safeNumber(awayTeamStats?.pointsPerGame, 1)}
                </span>
                <span style={{ color: homeTeamData.primaryColor }}>
                  {safeNumber(homeTeamStats?.pointsPerGame, 1)}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{pointsAllowedLabel}</span>
              <div className="flex gap-4">
                <span style={{ color: awayTeamData.primaryColor }}>
                  {safeNumber(awayTeamStats?.pointsAllowedPerGame, 1)}
                </span>
                <span style={{ color: homeTeamData.primaryColor }}>
                  {safeNumber(homeTeamStats?.pointsAllowedPerGame, 1)}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{netRatingLabel}</span>
              <div className="flex gap-4">
                <span style={{ color: awayTeamData.primaryColor }}>
                  {safeNumber(
                    getStat(awayTeamStats?.pointsPerGame) - getStat(awayTeamStats?.pointsAllowedPerGame),
                    1
                  )}
                </span>
                <span style={{ color: homeTeamData.primaryColor }}>
                  {safeNumber(
                    getStat(homeTeamStats?.pointsPerGame) - getStat(homeTeamStats?.pointsAllowedPerGame),
                    1
                  )}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
      </div>
    </div>
  );
}

