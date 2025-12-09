"use client";

import { Card, CardBody, CardHeader } from "@nextui-org/react";
import Link from "next/link";
import { OddsGame } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { TeamLogo } from "./TeamLogo";
import { getTeamData } from "@/lib/team-data";
import { getBestMoneylineOdds, parseOdds, formatDecimalOdds } from "@/lib/odds-utils";

interface MatchupCardProps {
  game: OddsGame;
}

export function MatchupCard({ game }: MatchupCardProps) {
  const gameDate = formatDate(game.commence_time);
  const gameTime = formatTime(game.commence_time);

  const parsedOdds = parseOdds(game);
  const bestMoneyline = getBestMoneylineOdds(parsedOdds);

  const awayTeamData = getTeamData(game.away_team);
  const homeTeamData = getTeamData(game.home_team);

  return (
    <Link href={`/matchup/${game.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-col items-start gap-2">
          <div className="flex justify-between items-center w-full">
            <h3 className="text-lg font-semibold">{game.sport_title}</h3>
            <span className="text-sm text-gray-500">{gameTime}</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1 flex items-center gap-3">
                <TeamLogo teamName={game.away_team} size={48} />
                <div>
                  <p
                    className="font-medium text-lg"
                    style={{ color: awayTeamData.primaryColor }}
                  >
                    {game.away_team}
                  </p>
                  <p className="text-sm text-gray-500">Away</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 font-bold">@</p>
              </div>
              <div className="flex-1 flex items-center gap-3 justify-end">
                <div className="text-right">
                  <p
                    className="font-medium text-lg"
                    style={{ color: homeTeamData.primaryColor }}
                  >
                    {game.home_team}
                  </p>
                  <p className="text-sm text-gray-500">Home</p>
                </div>
                <TeamLogo teamName={game.home_team} size={48} />
              </div>
            </div>

            {bestMoneyline && (bestMoneyline.away || bestMoneyline.home) && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Best Moneyline:</p>
                <div className="flex gap-2 flex-wrap">
                  {bestMoneyline.away && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {game.away_team.split(" ")[0]}: {formatDecimalOdds(bestMoneyline.away.price)}
                    </span>
                  )}
                  {bestMoneyline.home && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {game.home_team.split(" ")[0]}: {formatDecimalOdds(bestMoneyline.home.price)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="pt-2">
              <p className="text-xs text-gray-400">{gameDate}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

