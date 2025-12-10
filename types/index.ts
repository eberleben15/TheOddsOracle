// Types for The Odds API
export interface OddsBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsMarket[];
}

export interface OddsMarket {
  key: string;
  last_update: string;
  outcomes: OddsOutcome[];
}

export interface OddsOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers?: OddsBookmaker[];
}

export interface LiveGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{
    name: string;
    score: string;
  }> | null;
  last_update: string | null;
}

// Types for Stats API (API Basketball)
export interface TeamStats {
  id: number;
  name: string;
  code: string;
  logo?: string;
  wins: number;
  losses: number;
  pointsPerGame: number;
  pointsAllowedPerGame: number;
  recentGames: GameResult[];
  
  // Advanced stats (Phase 1 additions)
  fieldGoalPercentage?: number;
  threePointPercentage?: number;
  freeThrowPercentage?: number;
  reboundsPerGame?: number;
  assistsPerGame?: number;
  turnoversPerGame?: number;
  stealsPerGame?: number;
  blocksPerGame?: number;
  foulsPerGame?: number;
}

export interface GameResult {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

export interface HeadToHead {
  games: GameResult[];
  team1Wins: number;
  team2Wins: number;
}

// Combined matchup type
export interface Matchup {
  id: string;
  sportKey: string;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamStats?: TeamStats;
  awayTeamStats?: TeamStats;
  odds?: OddsBookmaker[];
  headToHead?: HeadToHead;
}

