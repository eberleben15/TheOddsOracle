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

interface BettingInsightsProps {
  parsedOdds: ParsedOdds[];
  awayTeamStats: TeamStats;
  homeTeamStats: TeamStats;
  awayTeamName: string;
  homeTeamName: string;
}

export function BettingInsights({
  parsedOdds,
  awayTeamStats,
  homeTeamStats,
  awayTeamName,
  homeTeamName,
}: BettingInsightsProps) {
  const awayTeamData = getTeamData(awayTeamName);
  const homeTeamData = getTeamData(homeTeamName);

  // Find best odds
  const bestAwayML = findBestOdds(parsedOdds, "away", "moneyline");
  const bestHomeML = findBestOdds(parsedOdds, "home", "moneyline");
  const bestAwaySpread = findBestOdds(parsedOdds, "away", "spread");
  const bestHomeSpread = findBestOdds(parsedOdds, "home", "spread");

  // Calculate probabilities
  const winProb = calculateWinProbability(
    awayTeamStats.pointsPerGame,
    awayTeamStats.pointsAllowedPerGame,
    homeTeamStats.pointsPerGame,
    homeTeamStats.pointsAllowedPerGame
  );

  // Calculate expected total
  const expectedTotal = calculateExpectedTotal(
    awayTeamStats.pointsPerGame,
    awayTeamStats.pointsAllowedPerGame,
    homeTeamStats.pointsPerGame,
    homeTeamStats.pointsAllowedPerGame
  );

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
                  <Chip size="sm" color="success" variant="flat">
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
                  <Chip size="sm" color="success" variant="flat">
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

      {/* Win Probability Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Win Probability</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span
                className="text-sm font-medium"
                style={{ color: awayTeamData.primaryColor }}
              >
                {awayTeamName.split(" ")[0]}
              </span>
              <span className="font-bold">
                {(winProb.team1 * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${winProb.team1 * 100}%`,
                  backgroundColor: awayTeamData.primaryColor,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span
                className="text-sm font-medium"
                style={{ color: homeTeamData.primaryColor }}
              >
                {homeTeamName.split(" ")[0]}
              </span>
              <span className="font-bold">
                {(winProb.team2 * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${winProb.team2 * 100}%`,
                  backgroundColor: homeTeamData.primaryColor,
                }}
              />
            </div>
          </div>
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
              {expectedTotal.toFixed(1)}
            </div>
            <p className="text-sm text-gray-600">
              Based on team averages
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
              <span className="font-bold text-green-600">
                ${awayReturn.toFixed(2)}
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
              <span className="font-bold text-green-600">
                ${homeReturn.toFixed(2)}
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Value Bets Card */}
      {(awayHasValue || homeHasValue) && (
        <Card className="border-2 border-success">
          <CardHeader>
            <h3 className="text-lg font-semibold text-success">Value Bets</h3>
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
                <Chip size="sm" color="success">
                  {(winProb.team1 * 100 - awayImpliedProb * 100).toFixed(1)}% edge
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
                <Chip size="sm" color="success">
                  {(winProb.team2 * 100 - homeImpliedProb * 100).toFixed(1)}% edge
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
              <span className="text-gray-600">Offensive Rating</span>
              <div className="flex gap-4">
                <span style={{ color: awayTeamData.primaryColor }}>
                  {awayTeamStats.pointsPerGame.toFixed(1)}
                </span>
                <span style={{ color: homeTeamData.primaryColor }}>
                  {homeTeamStats.pointsPerGame.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Defensive Rating</span>
              <div className="flex gap-4">
                <span style={{ color: awayTeamData.primaryColor }}>
                  {awayTeamStats.pointsAllowedPerGame.toFixed(1)}
                </span>
                <span style={{ color: homeTeamData.primaryColor }}>
                  {homeTeamStats.pointsAllowedPerGame.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Net Rating</span>
              <div className="flex gap-4">
                <span style={{ color: awayTeamData.primaryColor }}>
                  {(awayTeamStats.pointsPerGame - awayTeamStats.pointsAllowedPerGame).toFixed(1)}
                </span>
                <span style={{ color: homeTeamData.primaryColor }}>
                  {(homeTeamStats.pointsPerGame - homeTeamStats.pointsAllowedPerGame).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

