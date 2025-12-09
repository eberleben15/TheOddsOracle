"use client";

import { Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@nextui-org/react";
import { TeamStats, GameResult, HeadToHead } from "@/types";
import { formatDate } from "@/lib/utils";

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
  return (
    <div className="space-y-6">
      {/* Team Records */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Team Records</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">{awayTeamStats.name}</span>
                <span className="text-lg">
                  {awayTeamStats.wins} - {awayTeamStats.losses}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">{homeTeamStats.name}</span>
                <span className="text-lg">
                  {homeTeamStats.wins} - {homeTeamStats.losses}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Points Per Game */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Points Per Game</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Offense</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{awayTeamStats.name}</span>
                  <span>{awayTeamStats.pointsPerGame.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{homeTeamStats.name}</span>
                  <span>{homeTeamStats.pointsPerGame.toFixed(1)}</span>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Defense</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{awayTeamStats.name}</span>
                  <span>{awayTeamStats.pointsAllowedPerGame.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{homeTeamStats.name}</span>
                  <span>{homeTeamStats.pointsAllowedPerGame.toFixed(1)}</span>
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
                {recentGames.away.slice(0, 5).map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>{formatDate(game.date).split(",")[0]}</TableCell>
                    <TableCell>
                      {game.homeTeam === awayTeamStats.name
                        ? game.awayTeam
                        : game.homeTeam}
                    </TableCell>
                    <TableCell>
                      {game.homeTeam === awayTeamStats.name
                        ? `${game.homeScore} - ${game.awayScore}`
                        : `${game.awayScore} - ${game.homeScore}`}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          game.winner === awayTeamStats.name
                            ? "text-green-600 font-semibold"
                            : "text-red-600"
                        }
                      >
                        {game.winner === awayTeamStats.name ? "W" : "L"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
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
                {recentGames.home.slice(0, 5).map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>{formatDate(game.date).split(",")[0]}</TableCell>
                    <TableCell>
                      {game.homeTeam === homeTeamStats.name
                        ? game.awayTeam
                        : game.homeTeam}
                    </TableCell>
                    <TableCell>
                      {game.homeTeam === homeTeamStats.name
                        ? `${game.homeScore} - ${game.awayScore}`
                        : `${game.awayScore} - ${game.homeScore}`}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          game.winner === homeTeamStats.name
                            ? "text-green-600 font-semibold"
                            : "text-red-600"
                        }
                      >
                        {game.winner === homeTeamStats.name ? "W" : "L"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
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
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">{awayTeamStats.name}</span>
                <span className="text-lg font-semibold">
                  {headToHead.homeTeamWins} - {headToHead.awayTeamWins}
                </span>
                <span className="font-medium">{homeTeamStats.name}</span>
              </div>
            </div>
            <Table aria-label="Head-to-head table" removeWrapper>
              <TableHeader>
                <TableColumn>Date</TableColumn>
                <TableColumn>Home</TableColumn>
                <TableColumn>Score</TableColumn>
                <TableColumn>Away</TableColumn>
              </TableHeader>
              <TableBody>
                {headToHead.games.slice(0, 5).map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>{formatDate(game.date).split(",")[0]}</TableCell>
                    <TableCell>{game.homeTeam}</TableCell>
                    <TableCell>
                      {game.homeScore} - {game.awayScore}
                    </TableCell>
                    <TableCell>{game.awayTeam}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

