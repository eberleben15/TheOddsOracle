"use client";

import { Card, CardBody, CardHeader } from "@nextui-org/react";
import Link from "next/link";
import { OddsGame } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";

interface MatchupCardProps {
  game: OddsGame;
}

export function MatchupCard({ game }: MatchupCardProps) {
  const gameDate = formatDate(game.commence_time);
  const gameTime = formatTime(game.commence_time);

  // Get best odds from bookmakers (if available)
  const bestOdds = game.bookmakers?.[0]?.markets?.[0]?.outcomes;

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
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <p className="font-medium text-lg">{game.away_team}</p>
                <p className="text-sm text-gray-500">Away</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">@</p>
              </div>
              <div className="flex-1 text-right">
                <p className="font-medium text-lg">{game.home_team}</p>
                <p className="text-sm text-gray-500">Home</p>
              </div>
            </div>

            {bestOdds && bestOdds.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Best Odds:</p>
                <div className="flex gap-2">
                  {bestOdds.map((outcome, index) => (
                    <span
                      key={index}
                      className="text-xs bg-gray-100 px-2 py-1 rounded"
                    >
                      {outcome.name}: {outcome.price > 0 ? "+" : ""}
                      {outcome.price}
                    </span>
                  ))}
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

