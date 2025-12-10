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

interface AdvancedAnalyticsProps {
  awayTeamStats: TeamStats;
  homeTeamStats: TeamStats;
  awayRecentGames: GameResult[];
  homeRecentGames: GameResult[];
  odds?: {
    moneyline?: { away: number; home: number };
    spread?: number;
  };
}

export function AdvancedAnalytics({
  awayTeamStats,
  homeTeamStats,
  awayRecentGames,
  homeRecentGames,
  odds,
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

  return (
    <div className="space-y-6">
      {/* Win Probability & Prediction */}
      <Card className="bg-white border border-border-gray shadow-lg">
        <CardHeader className="border-b border-border-gray">
          <div className="flex items-center gap-2">
            <FaTrophy className="text-primary" size={20} />
            <h3 className="text-xl font-semibold text-text-dark">AI-Powered Prediction</h3>
            <Chip size="sm" color="success" variant="flat">
              {prediction.confidence.toFixed(0)}% Confidence
            </Chip>
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
                <span className="text-2xl font-bold text-primary">
                  {prediction.winProbability.away.toFixed(1)}%
                </span>
              </div>
              
              <Progress
                value={prediction.winProbability.away}
                color="primary"
                size="lg"
                className="mb-4"
              />
              
              <Progress
                value={prediction.winProbability.home}
                color="success"
                size="lg"
                className="mb-3"
              />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TeamLogo teamName={homeTeamStats.name} size={32} />
                  <span className="font-semibold text-text-dark">{homeTeamStats.name}</span>
                </div>
                <span className="text-2xl font-bold text-success">
                  {prediction.winProbability.home.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Predicted Score */}
            <div className="pt-4 border-t border-border-gray">
              <h4 className="text-sm font-medium text-text-body uppercase tracking-wide mb-3">
                Predicted Final Score
              </h4>
              <div className="flex justify-center items-center gap-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {prediction.predictedScore.away}
                  </div>
                  <div className="text-sm text-text-body">{awayTeamStats.name.split(' ')[0]}</div>
                </div>
                <div className="text-2xl font-bold text-text-body">-</div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-success mb-1">
                    {prediction.predictedScore.home}
                  </div>
                  <div className="text-sm text-text-body">{homeTeamStats.name.split(' ')[0]}</div>
                </div>
              </div>
              <div className="text-center mt-3">
                <span className="text-sm text-text-body">
                  Predicted Spread: <span className="font-semibold">{homeTeamStats.name.split(' ')[0]} {prediction.predictedSpread > 0 ? '-' : '+'}{Math.abs(prediction.predictedSpread).toFixed(1)}</span>
                </span>
              </div>
            </div>

            {/* Key Factors */}
            {prediction.keyFactors.length > 0 && (
              <div className="pt-4 border-t border-border-gray">
                <h4 className="text-sm font-medium text-text-body uppercase tracking-wide mb-3">
                  Key Factors
                </h4>
                <div className="space-y-2">
                  {prediction.keyFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <FaBullseye className="text-primary mt-0.5 flex-shrink-0" size={14} />
                      <span className="text-sm text-text-dark">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Value Bets */}
      {prediction.valueBets.length > 0 && (
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning">
          <CardHeader className="border-b border-warning/30">
            <div className="flex items-center gap-2">
              <FaLightbulb className="text-warning" size={20} />
              <h3 className="text-xl font-semibold text-text-dark">Value Bet Opportunities</h3>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="space-y-4">
              {prediction.valueBets.map((bet, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-lg border border-warning/30"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-text-dark mb-1">
                        {bet.recommendation}
                      </div>
                      <div className="text-xs text-text-body uppercase tracking-wide">
                        {bet.type}
                      </div>
                    </div>
                    <Chip size="sm" color="warning" variant="solid">
                      {bet.confidence.toFixed(0)}% Confidence
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
        <Card className="bg-white border border-border-gray">
          <CardHeader className="border-b border-border-gray">
            <div className="flex items-center gap-2">
              <FaFire className="text-danger" size={18} />
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
                    color={awayAnalytics.momentum > 0 ? "success" : "danger"}
                    variant="flat"
                  >
                    {awayAnalytics.momentum > 0 ? '+' : ''}{awayAnalytics.momentum.toFixed(0)}
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
                    <TeamLogo teamName={homeTeamStats.name} size={24} />
                    <span className="font-medium text-text-dark">{homeTeamStats.name.split(' ')[0]}</span>
                  </div>
                  <Chip
                    size="sm"
                    color={homeAnalytics.momentum > 0 ? "success" : "danger"}
                    variant="flat"
                  >
                    {homeAnalytics.momentum > 0 ? '+' : ''}{homeAnalytics.momentum.toFixed(0)}
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
        <Card className="bg-white border border-border-gray">
          <CardHeader className="border-b border-border-gray">
            <div className="flex items-center gap-2">
              <FaChartLine className="text-primary" size={18} />
              <h3 className="text-lg font-semibold text-text-dark">Advanced Metrics</h3>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="space-y-4">
              {/* Net Rating */}
              <div>
                <div className="text-xs text-text-body uppercase tracking-wide mb-2">
                  Net Rating
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-primary">{awayAnalytics.netRating.toFixed(1)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-text-body">vs</div>
                  <div className="flex-1">
                    <span className="font-bold text-success">{homeAnalytics.netRating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Offensive Efficiency */}
              <div>
                <div className="text-xs text-text-body uppercase tracking-wide mb-2">
                  Offensive Rating
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-primary">{awayAnalytics.offensiveRating.toFixed(1)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-text-body">O-Rating</div>
                  <div className="flex-1">
                    <span className="font-bold text-success">{homeAnalytics.offensiveRating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Defensive Efficiency */}
              <div>
                <div className="text-xs text-text-body uppercase tracking-wide mb-2">
                  Defensive Rating
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-primary">{awayAnalytics.defensiveRating.toFixed(1)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-text-body">D-Rating</div>
                  <div className="flex-1">
                    <span className="font-bold text-success">{homeAnalytics.defensiveRating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Assist/TO Ratio */}
              <div>
                <div className="text-xs text-text-body uppercase tracking-wide mb-2">
                  Assist/Turnover Ratio
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-primary">{awayAnalytics.assistToTurnoverRatio.toFixed(2)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-text-body">AST/TO</div>
                  <div className="flex-1">
                    <span className="font-bold text-success">{homeAnalytics.assistToTurnoverRatio.toFixed(2)}</span>
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

