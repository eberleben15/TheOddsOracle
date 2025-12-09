"use client";

import { Card, CardBody, CardHeader, Button } from "@nextui-org/react";
import Link from "next/link";
import { OddsGame } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";

interface MatchupHeaderProps {
  game: OddsGame;
}

export function MatchupHeader({ game }: MatchupHeaderProps) {
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
            <div className="flex justify-between items-center py-4">
              <div className="text-center flex-1">
                <h2 className="text-2xl font-semibold mb-2">
                  {game.away_team}
                </h2>
                <p className="text-sm text-gray-500">Away</p>
              </div>
              <div className="text-3xl font-bold mx-8">@</div>
              <div className="text-center flex-1">
                <h2 className="text-2xl font-semibold mb-2">
                  {game.home_team}
                </h2>
                <p className="text-sm text-gray-500">Home</p>
              </div>
            </div>

            {game.bookmakers && game.bookmakers.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Betting Odds</h3>
                <div className="space-y-2">
                  {game.bookmakers.slice(0, 3).map((bookmaker, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-medium">{bookmaker.title}</span>
                      <div className="flex gap-4">
                        {bookmaker.markets[0]?.outcomes.map(
                          (outcome, outcomeIdx) => (
                            <span
                              key={outcomeIdx}
                              className="text-sm bg-gray-100 px-3 py-1 rounded"
                            >
                              {outcome.name}:{" "}
                              {outcome.price > 0 ? "+" : ""}
                              {outcome.price}
                            </span>
                          )
                        )}
                      </div>
                    </div>
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

