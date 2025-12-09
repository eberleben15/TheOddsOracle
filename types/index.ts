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
}

export interface GameResult {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
}

export interface HeadToHead {
  games: GameResult[];
  homeTeamWins: number;
  awayTeamWins: number;
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

