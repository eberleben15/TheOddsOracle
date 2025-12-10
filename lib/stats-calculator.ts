/**
 * Manual stats calculator from game data
 * 
 * The /statistics endpoint has incomplete data, so we calculate everything
 * ourselves from individual game results for maximum accuracy.
 */

import { TeamStats, GameResult } from "@/types";

export interface GameStats {
  points: number;
  pointsAllowed: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointsMade: number;
  threePointsAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  rebounds: number;
  assists: number;
  turnovers: number;
  steals: number;
  blocks: number;
  fouls: number;
}

/**
 * Calculate team stats from game results
 * This gives us bulletproof accuracy by using actual game data
 */
export function calculateTeamStatsFromGames(
  teamId: number,
  teamName: string,
  games: any[], // Raw API game objects
  teamLogo?: string
): TeamStats {
  if (games.length === 0) {
    return {
      id: teamId,
      name: teamName,
      code: teamName.slice(0, 4).toUpperCase(),
      logo: teamLogo,
      wins: 0,
      losses: 0,
      pointsPerGame: 0,
      pointsAllowedPerGame: 0,
      recentGames: [],
    };
  }

  let wins = 0;
  let losses = 0;
  let totalPoints = 0;
  let totalPointsAllowed = 0;
  let totalFGM = 0;
  let totalFGA = 0;
  let total3PM = 0;
  let total3PA = 0;
  let totalFTM = 0;
  let totalFTA = 0;
  let totalReb = 0;
  let totalAst = 0;
  let totalTO = 0;
  let totalStl = 0;
  let totalBlk = 0;
  let totalFouls = 0;

  const recentGames: GameResult[] = [];

  games.forEach((game) => {
    const isHome = game.teams.home.id === teamId;
    const teamScore = isHome ? game.scores.home.total : game.scores.away.total;
    const oppScore = isHome ? game.scores.away.total : game.scores.home.total;
    const teamStats = isHome ? game.statistics?.[0] : game.statistics?.[1];
    
    // Win/Loss
    if (teamScore > oppScore) wins++;
    else losses++;

    // Points
    totalPoints += teamScore;
    totalPointsAllowed += oppScore;

    // Advanced stats (if available in game data)
    if (teamStats) {
      totalFGM += teamStats.fieldGoalsMade || 0;
      totalFGA += teamStats.fieldGoalsAttempted || 0;
      total3PM += teamStats.threePointsMade || 0;
      total3PA += teamStats.threePointsAttempted || 0;
      totalFTM += teamStats.freeThrowsMade || 0;
      totalFTA += teamStats.freeThrowsAttempted || 0;
      totalReb += teamStats.totalRebounds || 0;
      totalAst += teamStats.assists || 0;
      totalTO += teamStats.turnovers || 0;
      totalStl += teamStats.steals || 0;
      totalBlk += teamStats.blocks || 0;
      totalFouls += teamStats.fouls || 0;
    }

    // Add to recent games
    recentGames.push({
      id: game.id,
      date: game.date,
      homeTeam: game.teams.home.name,
      awayTeam: game.teams.away.name,
      homeScore: game.scores.home.total,
      awayScore: game.scores.away.total,
      winner: teamScore > oppScore ? (isHome ? game.teams.home.name : game.teams.away.name) : (isHome ? game.teams.away.name : game.teams.home.name),
      homeTeamLogo: game.teams.home.logo,
      awayTeamLogo: game.teams.away.logo,
    });
  });

  const gamesPlayed = games.length;

  return {
    id: teamId,
    name: teamName,
    code: teamName.slice(0, 4).toUpperCase(),
    logo: teamLogo,
    wins,
    losses,
    pointsPerGame: totalPoints / gamesPlayed,
    pointsAllowedPerGame: totalPointsAllowed / gamesPlayed,
    recentGames: recentGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    
    // Advanced stats (percentages)
    fieldGoalPercentage: totalFGA > 0 ? (totalFGM / totalFGA) * 100 : 0,
    threePointPercentage: total3PA > 0 ? (total3PM / total3PA) * 100 : 0,
    freeThrowPercentage: totalFTA > 0 ? (totalFTM / totalFTA) * 100 : 0,
    reboundsPerGame: totalReb / gamesPlayed,
    assistsPerGame: totalAst / gamesPlayed,
    turnoversPerGame: totalTO / gamesPlayed,
    stealsPerGame: totalStl / gamesPlayed,
    blocksPerGame: totalBlk / gamesPlayed,
    foulsPerGame: totalFouls / gamesPlayed,
  };
}

/**
 * Filter games to only current season (excludes historical/future data)
 */
export function filterToCurrentSeason(games: any[]): any[] {
  // Define current season start (NCAA typically starts in November)
  const currentSeasonStart = new Date('2024-11-01');
  const today = new Date();
  
  return games.filter((game) => {
    const gameDate = new Date(game.date);
    return gameDate >= currentSeasonStart && gameDate <= today;
  });
}

