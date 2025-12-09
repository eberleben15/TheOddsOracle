"use client";

import { Card, CardBody, CardHeader, Button } from "@nextui-org/react";
import Link from "next/link";
import { OddsGame } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { TeamLogo } from "./TeamLogo";
import { getTeamData } from "@/lib/team-data";
import { parseOdds, formatDecimalOdds, formatSpread } from "@/lib/odds-utils";

interface MatchupHeaderProps {
  game: OddsGame;
}

export function MatchupHeader({ game }: MatchupHeaderProps) {
  const awayTeamData = getTeamData(game.away_team);
  const homeTeamData = getTeamData(game.home_team);
  const parsedOdds = parseOdds(game);

  return (
    <>
      <div className="mb-6">
        <Link href="/">
          <Button variant="light" size="sm">
            ← Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <div className="w-full">
              <h1 className="text-3xl font-bold mb-2">Matchup Details</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{formatDate(game.commence_time)}</span>
                <span>•</span>
                <span>{formatTime(game.commence_time)}</span>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex justify-between items-center py-6">
              <div className="text-center flex-1 flex flex-col items-center gap-3">
                <TeamLogo teamName={game.away_team} size={80} />
                <div>
                  <h2
                    className="text-2xl font-semibold mb-1"
                    style={{ color: awayTeamData.primaryColor }}
                  >
                    {game.away_team}
                  </h2>
                  <p className="text-sm text-gray-500">Away</p>
                </div>
              </div>
              <div className="text-4xl font-bold mx-8 text-gray-400">@</div>
              <div className="text-center flex-1 flex flex-col items-center gap-3">
                <TeamLogo teamName={game.home_team} size={80} />
                <div>
                  <h2
                    className="text-2xl font-semibold mb-1"
                    style={{ color: homeTeamData.primaryColor }}
                  >
                    {game.home_team}
                  </h2>
                  <p className="text-sm text-gray-500">Home</p>
                </div>
              </div>
            </div>

            {parsedOdds.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Betting Odds</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parsedOdds.slice(0, 6).map((odds, idx) => (
                    <Card key={idx} className="border border-gray-200">
                      <CardHeader className="pb-2">
                        <h4 className="font-semibold text-base">{odds.bookmaker}</h4>
                      </CardHeader>
                      <CardBody className="pt-0 space-y-3">
                        {odds.moneyline && (odds.moneyline.away || odds.moneyline.home) && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Moneyline
                            </p>
                            <div className="flex flex-col gap-2">
                              {odds.moneyline.away && (
                                <div className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded border border-blue-200">
                                  <span className="text-sm font-medium text-gray-700">
                                    {game.away_team.split(" ")[0]}
                                  </span>
                                  <span className="text-sm font-bold text-blue-700">
                                    {formatDecimalOdds(odds.moneyline.away.price)}
                                  </span>
                                </div>
                              )}
                              {odds.moneyline.home && (
                                <div className="flex justify-between items-center bg-red-50 px-3 py-2 rounded border border-red-200">
                                  <span className="text-sm font-medium text-gray-700">
                                    {game.home_team.split(" ")[0]}
                                  </span>
                                  <span className="text-sm font-bold text-red-700">
                                    {formatDecimalOdds(odds.moneyline.home.price)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {odds.spread && (odds.spread.away || odds.spread.home) && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Spread
                            </p>
                            <div className="flex flex-col gap-2">
                              {odds.spread.away && (
                                <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border border-gray-200">
                                  <span className="text-sm font-medium text-gray-700">
                                    {game.away_team.split(" ")[0]}
                                  </span>
                                  <span className="text-sm font-bold text-gray-800">
                                    {formatSpread(odds.spread.away)}
                                  </span>
                                </div>
                              )}
                              {odds.spread.home && (
                                <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border border-gray-200">
                                  <span className="text-sm font-medium text-gray-700">
                                    {game.home_team.split(" ")[0]}
                                  </span>
                                  <span className="text-sm font-bold text-gray-800">
                                    {formatSpread(odds.spread.home)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

