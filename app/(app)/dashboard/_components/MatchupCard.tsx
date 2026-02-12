"use client";

import { Card, CardBody, CardHeader } from "@nextui-org/react";
import Link from "next/link";
import { OddsGame } from "@/types";
import { formatDate, formatTime } from "@/lib/utils";
import { TeamLogo } from "@/components/TeamLogo";
import { getTeamData } from "@/lib/team-data";
import { getBestMoneylineOdds, parseOdds, formatDecimalOdds } from "@/lib/odds-utils";

interface MatchupCardProps {
  game: OddsGame;
  /** Pass sport so matchup page can fetch the correct league (avoids 404 for NHL/NBA). */
  sport?: string;
  /** Resolved logo URLs by team name (from ESPN for CBB/NBA/NHL). */
  teamLogos?: Record<string, string>;
}

export function MatchupCard({ game, sport, teamLogos }: MatchupCardProps) {
  const gameDate = formatDate(game.commence_time);
  const gameTime = formatTime(game.commence_time);

  const parsedOdds = parseOdds(game);
  const bestMoneyline = getBestMoneylineOdds(parsedOdds);

  const awayTeamData = getTeamData(game.away_team);
  const homeTeamData = getTeamData(game.home_team);

  const matchupHref = sport ? `/matchup/${game.id}?sport=${sport}` : `/matchup/${game.id}`;

  return (
    <Link href={matchupHref}>
      <Card className="
        bg-white
        border border-border-gray
        hover:border-gray-400
        hover:shadow-lg
        transition-all duration-200
        cursor-pointer
      ">
        <CardHeader className="flex flex-col items-start gap-2 border-b border-border-gray pb-3">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-medium text-text-body uppercase tracking-wider">
              {game.sport_title}
            </span>
            <span className="text-sm text-gray-600 font-semibold">{gameTime}</span>
          </div>
        </CardHeader>
        <CardBody className="p-4">
          <div className="space-y-4">
            {/* Teams */}
            <div className="space-y-3">
              {/* Away Team */}
              <div className="flex items-center gap-3">
                <TeamLogo teamName={game.away_team} size={40} logo={teamLogos?.[game.away_team]} />
                <div className="flex-1">
                  <p className="font-semibold text-text-dark">{game.away_team}</p>
                  <p className="text-xs text-text-body">Away</p>
                </div>
                {bestMoneyline?.away && (
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">
                      {formatDecimalOdds(bestMoneyline.away.price)}
                    </p>
                    <p className="text-xs text-text-body">{bestMoneyline.awayBookmaker}</p>
                  </div>
                )}
              </div>

              {/* VS Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border-gray"></div>
                <span className="text-xs text-text-body font-medium">VS</span>
                <div className="flex-1 h-px bg-border-gray"></div>
              </div>

              {/* Home Team */}
              <div className="flex items-center gap-3">
                <TeamLogo teamName={game.home_team} size={40} logo={teamLogos?.[game.home_team]} />
                <div className="flex-1">
                  <p className="font-semibold text-text-dark">{game.home_team}</p>
                  <p className="text-xs text-text-body">Home</p>
                </div>
                {bestMoneyline?.home && (
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">
                      {formatDecimalOdds(bestMoneyline.home.price)}
                    </p>
                    <p className="text-xs text-text-body">{bestMoneyline.homeBookmaker}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Date */}
            <div className="pt-2 border-t border-border-gray">
              <p className="text-xs text-text-body text-center">{gameDate}</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
