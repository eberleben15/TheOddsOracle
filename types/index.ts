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

// Types for Stats API (SportsData.io)
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
  
  // Basic stats
  fieldGoalPercentage?: number;
  threePointPercentage?: number;
  freeThrowPercentage?: number;
  reboundsPerGame?: number;
  assistsPerGame?: number;
  turnoversPerGame?: number;
  stealsPerGame?: number;
  blocksPerGame?: number;
  foulsPerGame?: number;
  
  // Four Factors (from SportsData.io)
  effectiveFieldGoalPercentage?: number;  // eFG%
  turnoverRate?: number;                   // TOV%
  offensiveReboundRate?: number;           // ORB%
  freeThrowRate?: number;                  // FTR (FTA/FGA)
  
  // Advanced metrics
  offensiveEfficiency?: number;            // Points per 100 possessions
  defensiveEfficiency?: number;            // Opp points per 100 possessions
  pace?: number;                           // Possessions per game
  assistTurnoverRatio?: number;            // AST/TO
}

export interface GameResult {
  id: number;
  date: string;
  homeTeam: string;        // Full team name (e.g., "Wisconsin")
  awayTeam: string;        // Full team name (e.g., "Duke")
  homeTeamKey: string;     // Team key (e.g., "WIS")
  awayTeamKey: string;     // Team key (e.g., "DUKE")
  homeScore: number;
  awayScore: number;
  winner: string;          // Full team name of winner
  winnerKey: string;       // Team key of winner
  homeTeamLogo?: string;
  awayTeamLogo?: string;
}

export interface HeadToHead {
  games: GameResult[];
  team1Wins: number;
  team2Wins: number;
  awayTeamWins: number;    // Alias for clarity in matchup context
  homeTeamWins: number;    // Alias for clarity in matchup context
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

// Recommended bet (used by lib and components)
export interface RecommendedBet {
  id: string;
  gameId: string;
  gameTitle: string;
  gameTime: string;
  type: "moneyline" | "spread" | "total";
  recommendation: string;
  bookmaker: string;
  bookmakers?: string[];
  team?: "away" | "home";
  currentOdds: {
    decimal: number;
    american: number;
    impliedProbability: number;
  };
  ourPrediction: {
    probability: number;
    expectedValue: number;
  };
  edge: number;
  confidence: number;
  reason: string;
  valueRating: "high" | "medium" | "low";
}

