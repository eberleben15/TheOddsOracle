"use client";

import { Card, CardBody, CardHeader, Button } from "@nextui-org/react";
import Link from "next/link";
import { OddsGame } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { TeamLogo } from "./TeamLogo";
import { getTeamData } from "@/lib/team-data";
import { parseOdds, formatDecimalOdds, formatSpread } from "@/lib/odds-utils";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

interface MatchupHeaderProps {
  game: OddsGame;
}

export function MatchupHeader({ game }: MatchupHeaderProps) {
  const awayTeamData = getTeamData(game.away_team);
  const homeTeamData = getTeamData(game.home_team);
  const parsedOdds = parseOdds(game);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/">
        <Button
          variant="flat"
          startContent={<ArrowLeftIcon className="h-4 w-4" />}
          className="bg-white border border-border-gray text-text-dark hover:bg-body-bg"
        >
          Back to Dashboard
        </Button>
      </Link>

      {/* Matchup Details Card */}
      <Card className="bg-white border border-border-gray shadow-sm">
        <CardHeader className="border-b border-border-gray">
          <div className="w-full">
            <h1 className="text-2xl font-bold mb-2 text-text-dark">Matchup Details</h1>
            <div className="flex items-center gap-4 text-sm text-text-body">
              <span>{formatDate(game.commence_time)}</span>
              <span>•</span>
              <span className="text-primary font-semibold">{formatTime(game.commence_time)}</span>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="flex justify-between items-center">
            {/* Away Team */}
            <div className="text-center flex-1 flex flex-col items-center gap-4">
              <TeamLogo teamName={game.away_team} size={80} />
              <div>
                <h2 className="text-xl font-semibold mb-1 text-text-dark">
                  {game.away_team}
                </h2>
                <p className="text-sm text-text-body">Away</p>
              </div>
            </div>
            
            {/* VS Divider */}
            <div className="text-3xl font-bold mx-8 text-primary">@</div>
            
            {/* Home Team */}
            <div className="text-center flex-1 flex flex-col items-center gap-4">
              <TeamLogo teamName={game.home_team} size={80} />
              <div>
                <h2 className="text-xl font-semibold mb-1 text-text-dark">
                  {game.home_team}
                </h2>
                <p className="text-sm text-text-body">Home</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Betting Odds Card */}
      {parsedOdds.length > 0 && (
        <Card className="bg-white border border-border-gray shadow-sm">
          <CardHeader className="border-b border-border-gray">
            <h3 className="text-xl font-semibold text-text-dark">Betting Odds</h3>
          </CardHeader>
          <CardBody className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parsedOdds.slice(0, 6).map((odds, idx) => (
                <Card key={idx} className="bg-body-bg border border-border-gray">
                  <CardHeader className="pb-2">
                    <h4 className="font-semibold text-base text-text-dark">{odds.bookmaker}</h4>
                  </CardHeader>
                  <CardBody className="pt-0 space-y-3">
                    {odds.moneyline && (odds.moneyline.away || odds.moneyline.home) && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-text-body uppercase tracking-wide">
                          Moneyline
                        </p>
                        <div className="flex flex-col gap-2">
                          {odds.moneyline.away && (
                            <div className="flex justify-between items-center bg-white px-3 py-2 rounded border border-border-gray">
                              <span className="text-sm font-medium text-text-dark">
                                {game.away_team.split(" ")[0]}
                              </span>
                              <span className="text-sm font-bold text-primary">
                                {formatDecimalOdds(odds.moneyline.away.price)}
                              </span>
                            </div>
                          )}
                          {odds.moneyline.home && (
                            <div className="flex justify-between items-center bg-white px-3 py-2 rounded border border-border-gray">
                              <span className="text-sm font-medium text-text-dark">
                                {game.home_team.split(" ")[0]}
                              </span>
                              <span className="text-sm font-bold text-primary">
                                {formatDecimalOdds(odds.moneyline.home.price)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {odds.spread && (odds.spread.away || odds.spread.home) && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-text-body uppercase tracking-wide">
                          Spread
                        </p>
                        <div className="flex flex-col gap-2">
                          {odds.spread.away && (
                            <div className="flex justify-between items-center bg-white px-3 py-2 rounded border border-border-gray">
                              <span className="text-sm font-medium text-text-dark">
                                {game.away_team.split(" ")[0]}
                              </span>
                              <span className="text-sm font-bold text-text-dark">
                                {formatSpread(odds.spread.away)}
                              </span>
                            </div>
                          )}
                          {odds.spread.home && (
                            <div className="flex justify-between items-center bg-white px-3 py-2 rounded border border-border-gray">
                              <span className="text-sm font-medium text-text-dark">
                                {game.home_team.split(" ")[0]}
                              </span>
                              <span className="text-sm font-bold text-text-dark">
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
          </CardBody>
        </Card>
      )}
    </div>
  );
}
