"use client";

import { Card, CardBody, CardHeader, Chip } from "@nextui-org/react";
import Link from "next/link";
import { LiveGame } from "@/types";
import { TeamLogo } from "./TeamLogo";
import { getTeamData } from "@/lib/team-data";
import { useEffect, useState } from "react";

interface LiveGameCardProps {
  game: LiveGame;
}

export function LiveGameCard({ game }: LiveGameCardProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  // Calculate time since last update
  useEffect(() => {
    const calculateTimeAgo = () => {
      if (!game.last_update) return "";
      
      const lastUpdate = new Date(game.last_update).getTime();
      const now = Date.now();
      const diffSeconds = Math.floor((now - lastUpdate) / 1000);
      
      if (diffSeconds < 60) return "Just now";
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
      if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
      return "Live";
    };

    setTimeAgo(calculateTimeAgo());
    
    // Update every 30 seconds
    const interval = setInterval(() => {
      setTimeAgo(calculateTimeAgo());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [game.last_update]);
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
    <Link href={`/live/${game.id}`}>
      <Card className="
        bg-white
        border-2 border-live
        hover:shadow-lg hover:shadow-live/20
        transition-all duration-200
        cursor-pointer
        relative
      ">
        {/* Live indicator with update time */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
          <Chip 
            size="sm" 
            className="bg-live text-white font-bold animate-pulse"
            startContent={
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </div>
            }
          >
            LIVE
          </Chip>
          {timeAgo && (
            <span className="text-xs text-text-body bg-white/90 px-2 py-0.5 rounded">
              {timeAgo}
            </span>
          )}
        </div>

        <CardHeader className="flex flex-col items-start gap-2 border-b border-border-gray pb-3">
          <div className="flex justify-between items-center w-full pr-16">
            <span className="text-xs font-medium text-text-body uppercase tracking-wider">
              {game.sport_title}
            </span>
          </div>
        </CardHeader>

        <CardBody className="p-4">
          <div className="space-y-4">
            {/* Away Team */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <TeamLogo teamName={game.away_team} size={40} />
                <div>
                  <p className="font-semibold text-text-dark">{game.away_team}</p>
                  <p className="text-xs text-text-body">Away</p>
                </div>
              </div>
              <div className={`text-3xl font-bold ${awayWinning ? 'text-gray-900' : 'text-gray-500'}`}>
                {awayScore}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200"></div>

            {/* Home Team */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <TeamLogo teamName={game.home_team} size={40} />
                <div>
                  <p className="font-semibold text-text-dark">{game.home_team}</p>
                  <p className="text-xs text-text-body">Home</p>
                </div>
              </div>
              <div className={`text-3xl font-bold ${homeWinning ? 'text-gray-900' : 'text-gray-500'}`}>
                {homeScore}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
