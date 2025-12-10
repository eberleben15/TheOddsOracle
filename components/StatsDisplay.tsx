"use client";

import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from "@nextui-org/react";
import { TeamStats, GameResult, HeadToHead } from "@/types";
import { formatDate } from "@/lib/utils";
import { getTeamData } from "@/lib/team-data";
import { TeamLogo } from "./TeamLogo";

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

  return (
    <div className="space-y-6">
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
                    {((awayTeamStats.wins / (awayTeamStats.wins + awayTeamStats.losses)) * 100).toFixed(1)}% Win Rate
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
                    {((homeTeamStats.wins / (homeTeamStats.wins + homeTeamStats.losses)) * 100).toFixed(1)}% Win Rate
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
                    {awayTeamStats.pointsPerGame.toFixed(1)} PPG
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={homeTeamStats.name} size={24} />
                    <span className="text-sm font-medium">{homeTeamStats.name.split(" ")[0]}</span>
                  </div>
                  <span className="font-bold" style={{ color: homeTeamData.primaryColor }}>
                    {homeTeamStats.pointsPerGame.toFixed(1)} PPG
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
                    {awayTeamStats.pointsAllowedPerGame.toFixed(1)} PAPG
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={homeTeamStats.name} size={24} />
                    <span className="text-sm font-medium">{homeTeamStats.name.split(" ")[0]}</span>
                  </div>
                  <span className="font-bold" style={{ color: homeTeamData.primaryColor }}>
                    {homeTeamStats.pointsAllowedPerGame.toFixed(1)} PAPG
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
                    color={
                      awayTeamStats.pointsPerGame - awayTeamStats.pointsAllowedPerGame > 0
                        ? "success"
                        : "danger"
                    }
                    variant="flat"
                  >
                    {(awayTeamStats.pointsPerGame - awayTeamStats.pointsAllowedPerGame).toFixed(1)}
                  </Chip>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={homeTeamStats.name} size={24} />
                    <span className="text-sm font-medium">{homeTeamStats.name.split(" ")[0]}</span>
                  </div>
                  <Chip
                    size="sm"
                    color={
                      homeTeamStats.pointsPerGame - homeTeamStats.pointsAllowedPerGame > 0
                        ? "success"
                        : "danger"
                    }
                    variant="flat"
                  >
                    {(homeTeamStats.pointsPerGame - homeTeamStats.pointsAllowedPerGame).toFixed(1)}
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
                          className="h-full bg-primary transition-all"
                          style={{ width: `${awayTeamStats.fieldGoalPercentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 h-2 bg-body-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success transition-all"
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
                          className="h-full bg-primary transition-all"
                          style={{ width: `${awayTeamStats.threePointPercentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 h-2 bg-body-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success transition-all"
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
                          className="h-full bg-primary transition-all"
                          style={{ width: `${awayTeamStats.freeThrowPercentage || 0}%` }}
                        ></div>
                      </div>
                      <div className="flex-1 h-2 bg-body-bg rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success transition-all"
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
                    <div className="text-sm font-bold text-primary">
                      {awayTeamStats.reboundsPerGame?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm font-bold text-success mt-1">
                      {homeTeamStats.reboundsPerGame?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-body mb-1">AST</div>
                    <div className="text-sm font-bold text-primary">
                      {awayTeamStats.assistsPerGame?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm font-bold text-success mt-1">
                      {homeTeamStats.assistsPerGame?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-body mb-1">TO</div>
                    <div className="text-sm font-bold text-danger">
                      {awayTeamStats.turnoversPerGame?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-sm font-bold text-danger mt-1">
                      {homeTeamStats.turnoversPerGame?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

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
                  // Match team names (API returns short names like "Michigan", we have "Michigan Wolverines")
                  const teamNameShort = awayTeamStats.name.split(' ')[0].toLowerCase();
                  const isHome = game.homeTeam?.toLowerCase().includes(teamNameShort);
                  const opponent = isHome ? game.awayTeam : game.homeTeam;
                  const opponentData = getTeamData(opponent || "Unknown");
                  const teamScore = isHome ? game.homeScore : game.awayScore;
                  const oppScore = isHome ? game.awayScore : game.homeScore;
                  const won = game.winner?.toLowerCase().includes(teamNameShort);
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
                              won ? "text-green-600" : "text-red-600"
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
                          color={won ? "success" : "danger"}
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
                  // Match team names (API returns short names like "Michigan", we have "Michigan Wolverines")
                  const teamNameShort = homeTeamStats.name.split(' ')[0].toLowerCase();
                  const isHome = game.homeTeam?.toLowerCase().includes(teamNameShort);
                  const opponent = isHome ? game.awayTeam : game.homeTeam;
                  const opponentData = getTeamData(opponent || "Unknown");
                  const teamScore = isHome ? game.homeScore : game.awayScore;
                  const oppScore = isHome ? game.awayScore : game.homeScore;
                  const won = game.winner?.toLowerCase().includes(teamNameShort);
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
                              won ? "text-green-600" : "text-red-600"
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
                          color={won ? "success" : "danger"}
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
                  const winnerData =
                    game.winner === game.homeTeam ? homeTeamData : awayTeamData;

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
                              game.winner === game.homeTeam
                                ? "text-green-600"
                                : "text-gray-600"
                            }`}
                          >
                            {game.homeScore}
                          </span>
                          <span className="text-gray-400">-</span>
                          <span
                            className={`font-semibold ${
                              game.winner === game.awayTeam
                                ? "text-green-600"
                                : "text-gray-600"
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

