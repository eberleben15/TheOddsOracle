"use client";

import { Card, CardBody, CardHeader, Progress, Chip } from "@nextui-org/react";
import { TeamStats, GameResult } from "@/types";
import {
  calculateTeamAnalytics,
  predictMatchup,
  identifyValueBets,
  TeamAnalytics,
  MatchupPrediction,
} from "@/lib/advanced-analytics";
import { TeamLogo } from "./TeamLogo";
import { FaChartLine, FaFire, FaTrophy, FaBullseye, FaLightbulb } from "react-icons/fa";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { OddsGame } from "@/types";
import { ParsedOdds } from "@/lib/odds-utils";
import { useState, useEffect } from "react";
import React from "react";

interface AdvancedAnalyticsProps {
  awayTeamStats: TeamStats;
  homeTeamStats: TeamStats;
  awayRecentGames: GameResult[];
  homeRecentGames: GameResult[];
  odds?: {
    moneyline?: { away: number; home: number };
    spread?: number;
  };
  game?: OddsGame;
  parsedOdds?: ParsedOdds[];
}

export function AdvancedAnalytics({
  awayTeamStats,
  homeTeamStats,
  awayRecentGames,
  homeRecentGames,
  odds,
  game,
  parsedOdds,
}: AdvancedAnalyticsProps) {
  // Calculate analytics for both teams
  const awayAnalytics = calculateTeamAnalytics(awayTeamStats, awayRecentGames, false);
  const homeAnalytics = calculateTeamAnalytics(homeTeamStats, homeRecentGames, true);
  
  // Get prediction
  let prediction = predictMatchup(awayAnalytics, homeAnalytics, awayTeamStats, homeTeamStats);
  
  // Identify value bets if odds available
  if (odds) {
    prediction = identifyValueBets(prediction, odds);
  }

  // Analyze favorable bets using the new engine (client-side only)
  const [favorableBetAnalysis, setFavorableBetAnalysis] = useState<any>(null);
  const [FavorableBetsComponent, setFavorableBetsComponent] = useState<React.ComponentType<{ analysis: any }> | null>(null);

  useEffect(() => {
    if (game && parsedOdds && parsedOdds.length > 0) {
      // Dynamic import to ensure it only runs on client
      Promise.all([
        import("@/lib/favorable-bet-engine"),
        import("./FavorableBets")
      ]).then(([{ analyzeFavorableBets }, { FavorableBets }]) => {
        try {
          const analysis = analyzeFavorableBets(
            game,
            parsedOdds,
            prediction,
            awayTeamStats,
            homeTeamStats
          );
          setFavorableBetAnalysis(analysis);
          setFavorableBetsComponent(() => FavorableBets);
        } catch (error) {
          console.warn("Error analyzing favorable bets:", error);
        }
      });
    }
  }, [game, parsedOdds, prediction, awayTeamStats, homeTeamStats]);

  // Helper function to safely display numbers
  const safeNumber = (value: number, decimals: number = 1): string => {
    if (isNaN(value) || !isFinite(value)) {
      return "--";
    }
    return value.toFixed(decimals);
  };

  // Check if we have valid prediction data
  const hasValidPrediction = 
    !isNaN(prediction.predictedScore.away) && 
    !isNaN(prediction.predictedScore.home) &&
    !isNaN(prediction.winProbability.away) &&
    !isNaN(prediction.winProbability.home);

  return (
    <div className="space-y-6">
      {/* Win Probability & Prediction */}
      <Card className="bg-white border border-gray-200 shadow-lg">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FaTrophy className="text-gray-600" size={20} />
            <h3 className="text-xl font-semibold text-text-dark">AI-Powered Prediction</h3>
            {hasValidPrediction && (
              <Chip size="sm" className="bg-gray-100 text-gray-700" variant="flat">
                {safeNumber(prediction.confidence, 0)}% Confidence
              </Chip>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="space-y-6">
            {/* Win Probability */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <TeamLogo teamName={awayTeamStats.name} size={32} />
                  <span className="font-semibold text-text-dark">{awayTeamStats.name}</span>
                </div>
                <span className="text-2xl font-bold text-gray-700">
                  {safeNumber(prediction.winProbability.away, 1)}%
                </span>
              </div>
              
              <Progress
                value={prediction.winProbability.away}
                className="mb-4"
                classNames={{
                  indicator: "bg-gray-600"
                }}
                size="lg"
              />
              
              <Progress
                value={prediction.winProbability.home}
                className="mb-3"
                classNames={{
                  indicator: "bg-gray-600"
                }}
                size="lg"
              />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TeamLogo teamName={homeTeamStats.name} size={32} />
                  <span className="font-semibold text-text-dark">{homeTeamStats.name}</span>
                </div>
                <span className="text-2xl font-bold text-gray-700">
                  {safeNumber(prediction.winProbability.home, 1)}%
                </span>
              </div>
            </div>

            {/* Predicted Score */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Predicted Final Score
              </h4>
              {hasValidPrediction ? (
                <>
                  <div className="flex justify-center items-center gap-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-700 mb-1">
                        {safeNumber(prediction.predictedScore.away, 0)}
                      </div>
                      <div className="text-sm text-gray-500">{awayTeamStats.name.split(' ')[0]}</div>
                    </div>
                    <div className="text-2xl font-bold text-gray-400">-</div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-700 mb-1">
                        {safeNumber(prediction.predictedScore.home, 0)}
                      </div>
                      <div className="text-sm text-gray-500">{homeTeamStats.name.split(' ')[0]}</div>
                    </div>
                  </div>
                  <div className="text-center mt-3">
                    <span className="text-sm text-text-body">
                      Predicted Spread: <span className="font-semibold">{homeTeamStats.name.split(' ')[0]} {prediction.predictedSpread > 0 ? '-' : '+'}{safeNumber(Math.abs(prediction.predictedSpread), 1)}</span>
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-text-body">
                    <ExclamationTriangleIcon className="h-4 w-4 text-gray-500" />
                    <span>Predictions unavailable - Configure SportsData.io API key to enable predictions</span>
                  </div>
                </div>
              )}
            </div>

            {/* Key Factors */}
            {prediction.keyFactors.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Key Factors
                </h4>
                <div className="space-y-2">
                  {prediction.keyFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <FaBullseye className="text-gray-600 mt-0.5 flex-shrink-0" size={14} />
                      <span className="text-sm text-text-dark">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Favorable Bet Engine Results */}
      {favorableBetAnalysis && favorableBetAnalysis.totalValueBets > 0 && FavorableBetsComponent && (
        <FavorableBetsComponent analysis={favorableBetAnalysis} />
      )}

      {/* Legacy Value Bets (fallback) */}
      {prediction.valueBets.length > 0 && !favorableBetAnalysis && (
        <Card className="bg-value-light border-2 border-value/30">
          <CardHeader className="border-b border-value/20">
            <div className="flex items-center gap-2">
              <FaLightbulb className="text-value" size={20} />
              <h3 className="text-xl font-semibold text-text-dark">Value Bet Opportunities</h3>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="space-y-4">
              {prediction.valueBets.map((bet, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-lg border border-value/30"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-text-dark mb-1">
                        {bet.recommendation}
                      </div>
                      <div className="text-xs text-value uppercase tracking-wide font-medium">
                        {bet.type}
                      </div>
                    </div>
                    <Chip size="sm" className="bg-value text-white" variant="solid">
                      {safeNumber(bet.confidence, 0)}% Confidence
                    </Chip>
                  </div>
                  <p className="text-sm text-text-body">{bet.reason}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Team Analytics Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Momentum & Form */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FaFire className="text-gray-600" size={18} />
              <h3 className="text-lg font-semibold text-text-dark">Momentum & Form</h3>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="space-y-6">
              {/* Away Team */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={awayTeamStats.name} size={24} />
                    <span className="font-medium text-text-dark">{awayTeamStats.name.split(' ')[0]}</span>
                  </div>
                  <Chip
                    size="sm"
                    className={awayAnalytics.momentum > 0 ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-600"}
                    variant="flat"
                  >
                    {awayAnalytics.momentum > 0 ? '+' : ''}{safeNumber(awayAnalytics.momentum, 0)}
                  </Chip>
                </div>
                <div className="text-sm text-text-body mb-2">
                  <span className="font-medium">Form:</span> {awayAnalytics.recentForm}
                  <span className="ml-3">
                    ({awayAnalytics.last5Record.wins}-{awayAnalytics.last5Record.losses} L5)
                  </span>
                </div>
                <div className="text-sm text-text-body">
                  <span className="font-medium">Streak:</span>{' '}
                  {awayAnalytics.winStreak > 0 ? `${awayAnalytics.winStreak}W` : `${Math.abs(awayAnalytics.winStreak)}L`}
                </div>
              </div>

              {/* Home Team */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={homeTeamStats.name} size={24} logo={homeTeamStats.logo} />
                    <span className="font-medium text-text-dark">{homeTeamStats.name.split(' ')[0]}</span>
                  </div>
                  <Chip
                    size="sm"
                    className={homeAnalytics.momentum > 0 ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-600"}
                    variant="flat"
                  >
                    {homeAnalytics.momentum > 0 ? '+' : ''}{safeNumber(homeAnalytics.momentum, 0)}
                  </Chip>
                </div>
                <div className="text-sm text-text-body mb-2">
                  <span className="font-medium">Form:</span> {homeAnalytics.recentForm}
                  <span className="ml-3">
                    ({homeAnalytics.last5Record.wins}-{homeAnalytics.last5Record.losses} L5)
                  </span>
                </div>
                <div className="text-sm text-text-body">
                  <span className="font-medium">Streak:</span>{' '}
                  {homeAnalytics.winStreak > 0 ? `${homeAnalytics.winStreak}W` : `${Math.abs(homeAnalytics.winStreak)}L`}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Advanced Metrics */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FaChartLine className="text-gray-600" size={18} />
              <h3 className="text-lg font-semibold text-text-dark">Advanced Metrics</h3>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="space-y-4">
              {/* Net Rating */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Net Rating
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-gray-700">{safeNumber(awayAnalytics.netRating, 1)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-gray-500">vs</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-700">{safeNumber(homeAnalytics.netRating, 1)}</span>
                  </div>
                </div>
              </div>

              {/* Offensive Efficiency */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Offensive Rating
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-gray-700">{safeNumber(awayAnalytics.offensiveRating, 1)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-gray-500">O-Rating</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-700">{safeNumber(homeAnalytics.offensiveRating, 1)}</span>
                  </div>
                </div>
              </div>

              {/* Defensive Efficiency */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Defensive Rating
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-gray-700">{safeNumber(awayAnalytics.defensiveRating, 1)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-gray-500">D-Rating</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-700">{safeNumber(homeAnalytics.defensiveRating, 1)}</span>
                  </div>
                </div>
              </div>

              {/* Assist/TO Ratio */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Assist/Turnover Ratio
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-gray-700">{safeNumber(awayAnalytics.assistToTurnoverRatio, 2)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-gray-500">AST/TO</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-700">{safeNumber(homeAnalytics.assistToTurnoverRatio, 2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

