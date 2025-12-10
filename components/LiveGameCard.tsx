"use client";

import { Card, CardBody, CardHeader, Chip } from "@nextui-org/react";
import Link from "next/link";
import { LiveGame } from "@/types";
import { TeamLogo } from "./TeamLogo";
import { getTeamData } from "@/lib/team-data";

interface LiveGameCardProps {
  game: LiveGame;
}

export function LiveGameCard({ game }: LiveGameCardProps) {
  const awayTeamData = getTeamData(game.away_team);
  const homeTeamData = getTeamData(game.home_team);

  // Find scores for each team
  const awayScore = game.scores?.find(s => s.name === game.away_team)?.score || "0";
  const homeScore = game.scores?.find(s => s.name === game.home_team)?.score || "0";

  // Determine which team is winning
  const awayScoreNum = parseInt(awayScore);
  const homeScoreNum = parseInt(homeScore);
  const awayWinning = awayScoreNum > homeScoreNum;
  const homeWinning = homeScoreNum > awayScoreNum;

  return (
    <Link href={`/matchup/${game.id}`}>
      <Card className="
        bg-baltic-blue/60 backdrop-blur-md
        border-2 border-blaze-orange/60
        hover:bg-baltic-blue/80
        hover:border-blaze-orange/80
        hover:shadow-2xl hover:shadow-blaze-orange/20
        transition-all duration-300 
        cursor-pointer
        relative
      ">
        {/* Live indicator */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div className="relative">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
          <Chip 
            size="sm" 
            className="bg-red-500 text-white font-bold"
          >
            LIVE
          </Chip>
        </div>

        <CardHeader className="flex flex-col items-start gap-2 border-b border-strong-cyan/20 pb-3">
          <div className="flex justify-between items-center w-full pr-20">
            <h3 className="text-lg font-semibold text-white">{game.sport_title}</h3>
          </div>
        </CardHeader>

        <CardBody>
          <div className="space-y-4">
            {/* Away Team */}
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1 flex items-center gap-3">
                <TeamLogo teamName={game.away_team} size={48} />
                <div className="flex-1">
                  <p className="font-medium text-lg text-white">
                    {game.away_team}
                  </p>
                  <p className="text-sm text-gray-300">Away</p>
                </div>
              </div>
              <div className={`text-3xl font-bold ${awayWinning ? 'text-strong-cyan' : 'text-gray-400'}`}>
                {awayScore}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-strong-cyan/20"></div>

            {/* Home Team */}
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1 flex items-center gap-3">
                <TeamLogo teamName={game.home_team} size={48} />
                <div className="flex-1">
                  <p className="font-medium text-lg text-white">
                    {game.home_team}
                  </p>
                  <p className="text-sm text-gray-300">Home</p>
                </div>
              </div>
              <div className={`text-3xl font-bold ${homeWinning ? 'text-strong-cyan' : 'text-gray-400'}`}>
                {homeScore}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
