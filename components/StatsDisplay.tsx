"use client";

import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from "@nextui-org/react";
import { TeamStats, GameResult, HeadToHead } from "@/types";
import { formatDate } from "@/lib/utils";
import { getTeamData } from "@/lib/team-data";
import { TeamLogo } from "./TeamLogo";
import { LastUpdated } from "./LastUpdated";

interface StatsDisplayProps {
  homeTeamStats: TeamStats;
  awayTeamStats: TeamStats;
  recentGames: {
    home: GameResult[];
    away: GameResult[];
  };
  headToHead?: HeadToHead;
}

export function StatsDisplay({
  homeTeamStats,
  awayTeamStats,
  recentGames,
  headToHead,
}: StatsDisplayProps) {
  const awayTeamData = getTeamData(awayTeamStats.name);
  const homeTeamData = getTeamData(homeTeamStats.name);

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

  // Get the most recent update time from recent games
  const getLastUpdateTime = (): Date | null => {
    const allGames = [...recentGames.home, ...recentGames.away];
    if (allGames.length === 0) return null;
    
    const dates = allGames
      .map(g => g.date ? new Date(g.date) : null)
      .filter((d): d is Date => d !== null);
    
    if (dates.length === 0) return new Date(); // Fallback to now
    
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  const lastUpdateTime = getLastUpdateTime();

  return (
    <div className="space-y-6">
      {/* Last Updated Timestamp */}
      {lastUpdateTime && (
        <div className="flex justify-end">
          <LastUpdated timestamp={lastUpdateTime} />
        </div>
      )}

      {/* Team Records & Advanced Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white border border-border-gray">
          <CardHeader className="border-b border-border-gray">
            <h3 className="text-lg font-semibold text-text-dark">Team Records</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TeamLogo teamName={awayTeamStats.name} size={32} />
                  <span
                    className="font-medium"
                    style={{ color: awayTeamData.primaryColor }}
                  >
                    {awayTeamStats.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold">
                    {awayTeamStats.wins} - {awayTeamStats.losses}
                  </span>
                  <div className="text-xs text-gray-500">
                    {safeNumber((awayTeamStats.wins / (awayTeamStats.wins + awayTeamStats.losses)) * 100, 1)}% Win Rate
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TeamLogo teamName={homeTeamStats.name} size={32} />
                  <span
                    className="font-medium"
                    style={{ color: homeTeamData.primaryColor }}
                  >
                    {homeTeamStats.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold">
                    {homeTeamStats.wins} - {homeTeamStats.losses}
                  </span>
                  <div className="text-xs text-gray-500">
                    {safeNumber((homeTeamStats.wins / (homeTeamStats.wins + homeTeamStats.losses)) * 100, 1)}% Win Rate
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Scoring Stats */}
        <Card className="bg-white border border-border-gray">
          <CardHeader className="border-b border-border-gray">
            <h3 className="text-lg font-semibold text-text-dark">Scoring Stats</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Points Scored (Offense)</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={awayTeamStats.name} size={24} />
                    <span className="text-sm font-medium">{awayTeamStats.name.split(" ")[0]}</span>
                  </div>
                  <span className="font-bold" style={{ color: awayTeamData.primaryColor }}>
                    {safeNumber(awayTeamStats?.pointsPerGame, 1)} PPG
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={homeTeamStats.name} size={24} />
                    <span className="text-sm font-medium">{homeTeamStats.name.split(" ")[0]}</span>
                  </div>
                  <span className="font-bold" style={{ color: homeTeamData.primaryColor }}>
                    {safeNumber(homeTeamStats?.pointsPerGame, 1)} PPG
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Points Allowed (Defense)</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={awayTeamStats.name} size={24} />
                    <span className="text-sm font-medium">{awayTeamStats.name.split(" ")[0]}</span>
                  </div>
                  <span className="font-bold" style={{ color: awayTeamData.primaryColor }}>
                    {safeNumber(awayTeamStats?.pointsAllowedPerGame, 1)} PAPG
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={homeTeamStats.name} size={24} />
                    <span className="text-sm font-medium">{homeTeamStats.name.split(" ")[0]}</span>
                  </div>
                  <span className="font-bold" style={{ color: homeTeamData.primaryColor }}>
                    {safeNumber(homeTeamStats?.pointsAllowedPerGame, 1)} PAPG
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Net Rating</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={awayTeamStats.name} size={24} />
                    <span className="text-sm font-medium">{awayTeamStats.name.split(" ")[0]}</span>
                  </div>
                  <Chip
                    size="sm"
                    className={
                      getStat(awayTeamStats?.pointsPerGame) - getStat(awayTeamStats?.pointsAllowedPerGame) > 0
                        ? "bg-gray-100 text-gray-700"
                        : "bg-gray-200 text-gray-600"
                    }
                    variant="flat"
                  >
                    {safeNumber(getStat(awayTeamStats?.pointsPerGame) - getStat(awayTeamStats?.pointsAllowedPerGame), 1)}
                  </Chip>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={homeTeamStats.name} size={24} />
                    <span className="text-sm font-medium">{homeTeamStats.name.split(" ")[0]}</span>
                  </div>
                  <Chip
                    size="sm"
                    className={
                      getStat(homeTeamStats?.pointsPerGame) - getStat(homeTeamStats?.pointsAllowedPerGame) > 0
                        ? "bg-gray-100 text-gray-700"
                        : "bg-gray-200 text-gray-600"
                    }
                    variant="flat"
                  >
                    {safeNumber(getStat(homeTeamStats?.pointsPerGame) - getStat(homeTeamStats?.pointsAllowedPerGame), 1)}
                  </Chip>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Advanced Stats - NEW in Phase 1 */}
        <Card className="bg-white border border-border-gray">
          <CardHeader className="border-b border-border-gray">
            <h3 className="text-lg font-semibold text-text-dark">
              Shooting & Efficiency
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {/* Shooting Percentages */}
              <div>
                <div className="text-xs font-medium text-text-body uppercase tracking-wide mb-3">
                  Shooting %
                </div>
                <div className="space-y-2">
                  {/* Field Goal % */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-text-body mb-1">
                      <span>FG%</span>
                      <span>{awayTeamStats.fieldGoalPercentage?.toFixed(1)}%</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 h-2 bg-body-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gray-600 transition-all"
                          style={{ width: `${awayTeamStats.fieldGoalPercentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 h-2 bg-body-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gray-500 transition-all"
                          style={{ width: `${homeTeamStats.fieldGoalPercentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-body mt-1">
                      <span>{homeTeamStats.fieldGoalPercentage?.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* 3-Point % */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-text-body mb-1">
                      <span>3P%</span>
                      <span>{awayTeamStats.threePointPercentage?.toFixed(1)}%</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 h-2 bg-body-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gray-600 transition-all"
                          style={{ width: `${awayTeamStats.threePointPercentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 h-2 bg-body-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gray-500 transition-all"
                          style={{ width: `${homeTeamStats.threePointPercentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-body mt-1">
                      <span>{homeTeamStats.threePointPercentage?.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Free Throw % */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-text-body mb-1">
                      <span>FT%</span>
                      <span>{awayTeamStats.freeThrowPercentage?.toFixed(1)}%</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 h-2 bg-body-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gray-600 transition-all"
                          style={{ width: `${awayTeamStats.freeThrowPercentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 h-2 bg-body-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gray-500 transition-all"
                          style={{ width: `${homeTeamStats.freeThrowPercentage || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-body mt-1">
                      <span>{homeTeamStats.freeThrowPercentage?.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Per-Game Stats */}
              <div className="pt-3 border-t border-border-gray">
                <div className="text-xs font-medium text-text-body uppercase tracking-wide mb-3">
                  Per Game Averages
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-text-body mb-1">REB</div>
                    <div className="text-sm font-bold text-gray-700">
                      {awayTeamStats.reboundsPerGame?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm font-bold text-gray-600 mt-1">
                      {homeTeamStats.reboundsPerGame?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-body mb-1">AST</div>
                    <div className="text-sm font-bold text-gray-700">
                      {awayTeamStats.assistsPerGame?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm font-bold text-gray-600 mt-1">
                      {homeTeamStats.assistsPerGame?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-body mb-1">TO</div>
                    <div className="text-sm font-bold text-gray-500">
                      {awayTeamStats.turnoversPerGame?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm font-bold text-gray-500 mt-1">
                      {homeTeamStats.turnoversPerGame?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Four Factors & Advanced Metrics - Industry-Standard Analysis */}
      {(awayTeamStats.effectiveFieldGoalPercentage || homeTeamStats.effectiveFieldGoalPercentage) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Four Factors */}
          <Card className="bg-gradient-to-br from-gray-50 to-transparent border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-text-dark">Four Factors Analysis</h3>
                <p className="text-xs text-text-body mt-1">
                  Dean Oliver's Four Factors - Industry standard for predicting wins
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* eFG% - Most Important (40% weight) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-sm font-semibold text-text-dark">Effective FG%</span>
                      <span className="ml-2 text-xs text-text-body">(40% weight)</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="font-medium text-gray-700">
                        {awayTeamStats.effectiveFieldGoalPercentage?.toFixed(1)}%
                      </span>
                      <span className="font-medium text-gray-600">
                        {homeTeamStats.effectiveFieldGoalPercentage?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-3 bg-body-bg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gray-600 to-gray-500"
                        style={{ width: `${(awayTeamStats.effectiveFieldGoalPercentage || 0)}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 h-3 bg-body-bg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gray-500 to-gray-400"
                        style={{ width: `${(homeTeamStats.effectiveFieldGoalPercentage || 0)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-text-body mt-1">
                    Adjusts for 3-point value. Higher is better.
                  </p>
                </div>

                {/* TOV% - Second Most Important (25% weight) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-sm font-semibold text-text-dark">Turnover Rate</span>
                      <span className="ml-2 text-xs text-text-body">(25% weight)</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="font-medium text-gray-700">
                        {awayTeamStats.turnoverRate?.toFixed(1)}%
                      </span>
                      <span className="font-medium text-gray-600">
                        {homeTeamStats.turnoverRate?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-3 bg-body-bg rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          (awayTeamStats.turnoverRate || 0) < 18 
                            ? 'bg-gradient-to-r from-gray-500 to-gray-400' 
                            : 'bg-gradient-to-r from-gray-600 to-gray-500'
                        }`}
                        style={{ width: `${Math.min((awayTeamStats.turnoverRate || 0) * 3, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 h-3 bg-body-bg rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          (homeTeamStats.turnoverRate || 0) < 18 
                            ? 'bg-gradient-to-r from-gray-500 to-gray-400' 
                            : 'bg-gradient-to-r from-gray-600 to-gray-500'
                        }`}
                        style={{ width: `${Math.min((homeTeamStats.turnoverRate || 0) * 3, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-text-body mt-1">
                    Turnovers per 100 possessions. Lower is better.
                  </p>
                </div>

                {/* ORB% - Third (20% weight) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-sm font-semibold text-text-dark">Off. Rebound Rate</span>
                      <span className="ml-2 text-xs text-text-body">(20% weight)</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="font-medium text-gray-700">
                        {awayTeamStats.offensiveReboundRate?.toFixed(1)}%
                      </span>
                      <span className="font-medium text-gray-600">
                        {homeTeamStats.offensiveReboundRate?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-3 bg-body-bg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gray-600 to-gray-500"
                        style={{ width: `${(awayTeamStats.offensiveReboundRate || 0) * 2}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 h-3 bg-body-bg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gray-500 to-gray-400"
                        style={{ width: `${(homeTeamStats.offensiveReboundRate || 0) * 2}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-text-body mt-1">
                    Second-chance opportunities. Higher is better.
                  </p>
                </div>

                {/* FTR - Fourth (15% weight) */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <span className="text-sm font-semibold text-text-dark">Free Throw Rate</span>
                      <span className="ml-2 text-xs text-text-body">(15% weight)</span>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <span className="font-medium text-gray-700">
                        {awayTeamStats.freeThrowRate?.toFixed(1)}%
                      </span>
                      <span className="font-medium text-gray-600">
                        {homeTeamStats.freeThrowRate?.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-3 bg-body-bg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gray-600 to-gray-500"
                        style={{ width: `${(awayTeamStats.freeThrowRate || 0) * 2}%` }}
                      ></div>
                    </div>
                    <div className="flex-1 h-3 bg-body-bg rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-gray-500 to-gray-400"
                        style={{ width: `${(homeTeamStats.freeThrowRate || 0) * 2}%` }}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-text-body mt-1">
                    FTA/FGA ratio. Measures ability to get to the line.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Advanced Metrics */}
          <Card className="bg-gradient-to-br from-gray-50 to-transparent border border-gray-200">
            <CardHeader className="border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-text-dark">Advanced Metrics</h3>
                <p className="text-xs text-text-body mt-1">
                  Tempo-free efficiency and pace analysis
                </p>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-5">
                {/* Offensive Efficiency */}
                {(awayTeamStats.offensiveEfficiency || homeTeamStats.offensiveEfficiency) && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-text-dark">Offensive Rating</span>
                      <span className="text-xs text-text-body">Points per 100 possessions</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-gray-700">
                          {awayTeamStats.offensiveEfficiency?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-xs text-text-body mt-1">{awayTeamStats.name.split(" ")[0]}</div>
                      </div>
                      <div className="text-center px-4">
                        <span className="text-xs text-text-body">vs</span>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-gray-600">
                          {homeTeamStats.offensiveEfficiency?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-xs text-text-body mt-1">{homeTeamStats.name.split(" ")[0]}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Defensive Efficiency */}
                {(awayTeamStats.defensiveEfficiency || homeTeamStats.defensiveEfficiency) && (
                  <div className="pt-4 border-t border-border-gray">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-text-dark">Defensive Rating</span>
                      <span className="text-xs text-text-body">Opp points per 100 poss</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-gray-700">
                          {awayTeamStats.defensiveEfficiency?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-xs text-text-body mt-1">{awayTeamStats.name.split(" ")[0]}</div>
                      </div>
                      <div className="text-center px-4">
                        <span className="text-xs text-text-body">vs</span>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-gray-600">
                          {homeTeamStats.defensiveEfficiency?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-xs text-text-body mt-1">{homeTeamStats.name.split(" ")[0]}</div>
                      </div>
                    </div>
                    <p className="text-xs text-text-body text-center mt-2">
                      Lower is better (fewer points allowed)
                    </p>
                  </div>
                )}

                {/* Pace */}
                {(awayTeamStats.pace || homeTeamStats.pace) && (
                  <div className="pt-4 border-t border-border-gray">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold text-text-dark">Pace</span>
                      <span className="text-xs text-text-body">Possessions per game</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-gray-700">
                          {awayTeamStats.pace?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-xs text-text-body mt-1">{awayTeamStats.name.split(" ")[0]}</div>
                      </div>
                      <div className="text-center px-4">
                        <div className="text-xs text-text-body">Expected</div>
                        <div className="text-lg font-bold text-text-dark">
                          {((awayTeamStats.pace || 0) + (homeTeamStats.pace || 0)) / 2 > 0
                            ? (((awayTeamStats.pace || 0) + (homeTeamStats.pace || 0)) / 2).toFixed(1)
                            : 'N/A'}
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-2xl font-bold text-gray-600">
                          {homeTeamStats.pace?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="text-xs text-text-body mt-1">{homeTeamStats.name.split(" ")[0]}</div>
                      </div>
                    </div>
                    <p className="text-xs text-text-body text-center mt-2">
                      Game tempo: {
                        ((awayTeamStats.pace || 0) + (homeTeamStats.pace || 0)) / 2 > 72 
                          ? 'Fast-paced' 
                          : ((awayTeamStats.pace || 0) + (homeTeamStats.pace || 0)) / 2 > 68
                          ? 'Average'
                          : 'Slow-paced'
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Recent Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">
              {awayTeamStats.name} - Recent Games
            </h3>
          </CardHeader>
          <CardBody>
            <Table aria-label="Recent games table" removeWrapper>
              <TableHeader>
                <TableColumn>Date</TableColumn>
                <TableColumn>Opponent</TableColumn>
                <TableColumn>Score</TableColumn>
                <TableColumn>Result</TableColumn>
              </TableHeader>
              <TableBody>
                {recentGames.away.slice(0, 5).map((game) => {
                  // Use team code (key) for reliable matching
                  const teamCode = awayTeamStats.code;
                  const isHome = game.homeTeamKey === teamCode || 
                                 game.homeTeam?.toLowerCase() === awayTeamStats.name.toLowerCase();
                  const opponent = isHome ? game.awayTeam : game.homeTeam;
                  const opponentData = getTeamData(opponent || "Unknown");
                  const teamScore = isHome ? game.homeScore : game.awayScore;
                  const oppScore = isHome ? game.awayScore : game.homeScore;
                  const won = game.winnerKey === teamCode ||
                              game.winner?.toLowerCase() === awayTeamStats.name.toLowerCase();
                  const margin = Math.abs(teamScore - oppScore);

                  return (
                    <TableRow key={game.id}>
                      <TableCell className="text-sm">
                        {formatDate(game.date).split(",")[0]}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TeamLogo 
                            teamName={opponent || "Unknown"} 
                            size={20}
                            logo={isHome ? game.awayTeamLogo : game.homeTeamLogo}
                          />
                          <span className="text-sm">{(opponent || "Unknown").split(" ")[0]}</span>
                          {isHome && (
                            <Chip size="sm" variant="flat" color="default">
                              H
                            </Chip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              won ? "text-win" : "text-loss"
                            }`}
                          >
                            {teamScore}
                          </span>
                          <span className="text-gray-400">-</span>
                          <span className="text-gray-600">{oppScore}</span>
                          <span className="text-xs text-gray-500">
                            ({won ? "+" : "-"}
                            {margin})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          className={won ? "bg-win-light text-win" : "bg-loss-light text-loss"}
                          variant="flat"
                        >
                          {won ? "W" : "L"}
                        </Chip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">
              {homeTeamStats.name} - Recent Games
            </h3>
          </CardHeader>
          <CardBody>
            <Table aria-label="Recent games table" removeWrapper>
              <TableHeader>
                <TableColumn>Date</TableColumn>
                <TableColumn>Opponent</TableColumn>
                <TableColumn>Score</TableColumn>
                <TableColumn>Result</TableColumn>
              </TableHeader>
              <TableBody>
                {recentGames.home.slice(0, 5).map((game) => {
                  // Use team code (key) for reliable matching
                  const teamCode = homeTeamStats.code;
                  const isHome = game.homeTeamKey === teamCode ||
                                 game.homeTeam?.toLowerCase() === homeTeamStats.name.toLowerCase();
                  const opponent = isHome ? game.awayTeam : game.homeTeam;
                  const opponentData = getTeamData(opponent || "Unknown");
                  const teamScore = isHome ? game.homeScore : game.awayScore;
                  const oppScore = isHome ? game.awayScore : game.homeScore;
                  const won = game.winnerKey === teamCode ||
                              game.winner?.toLowerCase() === homeTeamStats.name.toLowerCase();
                  const margin = Math.abs(teamScore - oppScore);

                  return (
                    <TableRow key={game.id}>
                      <TableCell className="text-sm">
                        {formatDate(game.date).split(",")[0]}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TeamLogo 
                            teamName={opponent || "Unknown"} 
                            size={20}
                            logo={isHome ? game.awayTeamLogo : game.homeTeamLogo}
                          />
                          <span className="text-sm">{(opponent || "Unknown").split(" ")[0]}</span>
                          {isHome && (
                            <Chip size="sm" variant="flat" className="bg-gray-100 text-gray-600">
                              H
                            </Chip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              won ? "text-win" : "text-loss"
                            }`}
                          >
                            {teamScore}
                          </span>
                          <span className="text-gray-400">-</span>
                          <span className="text-gray-600">{oppScore}</span>
                          <span className="text-xs text-gray-500">
                            ({won ? "+" : "-"}
                            {margin})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          className={won ? "bg-win-light text-win" : "bg-loss-light text-loss"}
                          variant="flat"
                        >
                          {won ? "W" : "L"}
                        </Chip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </div>

      {/* Head-to-Head */}
      {headToHead && headToHead.games.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Head-to-Head History</h3>
          </CardHeader>
          <CardBody>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TeamLogo teamName={awayTeamStats.name} size={32} />
                  <span
                    className="font-medium"
                    style={{ color: awayTeamData.primaryColor }}
                  >
                    {awayTeamStats.name.split(" ")[0]}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-bold">
                    {headToHead.awayTeamWins} - {headToHead.homeTeamWins}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">All-Time Record</div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="font-medium"
                    style={{ color: homeTeamData.primaryColor }}
                  >
                    {homeTeamStats.name.split(" ")[0]}
                  </span>
                  <TeamLogo teamName={homeTeamStats.name} size={32} />
                </div>
              </div>
            </div>
            <Table aria-label="Head-to-head table" removeWrapper>
              <TableHeader>
                <TableColumn>Date</TableColumn>
                <TableColumn>Matchup</TableColumn>
                <TableColumn>Score</TableColumn>
                <TableColumn>Winner</TableColumn>
              </TableHeader>
              <TableBody>
                {headToHead.games.slice(0, 5).map((game) => {
                  const homeTeamData = getTeamData(game.homeTeam || "Unknown");
                  const awayTeamData = getTeamData(game.awayTeam || "Unknown");
                  // Use key-based comparison for reliability
                  const homeWon = game.winnerKey === game.homeTeamKey || game.winner === game.homeTeam;
                  const winnerData = homeWon ? homeTeamData : awayTeamData;

                  return (
                    <TableRow key={game.id}>
                      <TableCell className="text-sm">
                        {formatDate(game.date).split(",")[0]}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TeamLogo 
                            teamName={game.awayTeam || "Unknown"} 
                            size={20}
                            logo={game.awayTeamLogo}
                          />
                          <span className="text-sm">{(game.awayTeam || "Unknown").split(" ")[0]}</span>
                          <span className="text-gray-400">@</span>
                          <TeamLogo 
                            teamName={game.homeTeam || "Unknown"} 
                            size={20}
                            logo={game.homeTeamLogo}
                          />
                          <span className="text-sm">{(game.homeTeam || "Unknown").split(" ")[0]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              homeWon ? "text-win" : "text-loss"
                            }`}
                          >
                            {game.homeScore}
                          </span>
                          <span className="text-gray-400">-</span>
                          <span
                            className={`font-semibold ${
                              !homeWon ? "text-win" : "text-loss"
                            }`}
                          >
                            {game.awayScore}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TeamLogo teamName={game.winner} size={20} />
                          <span
                            className="text-sm font-medium"
                            style={{ color: winnerData.primaryColor }}
                          >
                            {(game.winner || "Unknown").split(" ")[0]}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

