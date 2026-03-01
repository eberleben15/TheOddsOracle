/**
 * Player Props Types
 * Types for NBA player statistics, props, and predictions
 */

// ============================================================================
// Player Data Types
// ============================================================================

export interface NBAPlayer {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  team: string;
  teamId: string;
  position: string;
  jersey: number;
  height?: string;
  weight?: number;
  status: PlayerStatus;
  headshotUrl?: string;
}

export type PlayerStatus = "active" | "day-to-day" | "out" | "injured";

export interface PlayerSeasonStats {
  playerId: string;
  playerName: string;
  team: string;
  season: string;
  gamesPlayed: number;
  gamesStarted: number;
  minutesPerGame: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  offensiveReboundsPerGame: number;
  defensiveReboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  turnoversPerGame: number;
  foulsPerGame: number;
  threesPerGame: number;
  threeAttemptsPerGame: number;
  fieldGoalsPerGame: number;
  fieldGoalAttemptsPerGame: number;
  freeThrowsPerGame: number;
  freeThrowAttemptsPerGame: number;
  fieldGoalPct: number;
  threePointPct: number;
  freeThrowPct: number;
  plusMinusPerGame?: number;
}

export interface PlayerGameLog {
  gameId: string;
  date: string;
  opponent: string;
  opponentId?: string;
  isHome: boolean;
  result: "W" | "L";
  minutes: number;
  points: number;
  rebounds: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  threes: number;
  threeAttempts: number;
  fieldGoals: number;
  fieldGoalAttempts: number;
  freeThrows: number;
  freeThrowAttempts: number;
  plusMinus?: number;
}

// ============================================================================
// Player Prop Odds Types
// ============================================================================

export type PlayerPropType =
  | "points"
  | "rebounds"
  | "assists"
  | "threes"
  | "steals"
  | "blocks"
  | "turnovers"
  | "pra" // Points + Rebounds + Assists
  | "points_rebounds"
  | "points_assists"
  | "rebounds_assists"
  | "blocks_steals"
  | "double_double"
  | "triple_double";

export const PLAYER_PROP_MARKET_KEYS: Record<PlayerPropType, string> = {
  points: "player_points",
  rebounds: "player_rebounds",
  assists: "player_assists",
  threes: "player_threes",
  steals: "player_steals",
  blocks: "player_blocks",
  turnovers: "player_turnovers",
  pra: "player_points_rebounds_assists",
  points_rebounds: "player_points_rebounds",
  points_assists: "player_points_assists",
  rebounds_assists: "player_rebounds_assists",
  blocks_steals: "player_blocks_steals",
  double_double: "player_double_double",
  triple_double: "player_triple_double",
};

export const MARKET_KEY_TO_PROP_TYPE: Record<string, PlayerPropType> = {
  player_points: "points",
  player_rebounds: "rebounds",
  player_assists: "assists",
  player_threes: "threes",
  player_steals: "steals",
  player_blocks: "blocks",
  player_turnovers: "turnovers",
  player_points_rebounds_assists: "pra",
  player_points_rebounds: "points_rebounds",
  player_points_assists: "points_assists",
  player_rebounds_assists: "rebounds_assists",
  player_blocks_steals: "blocks_steals",
  player_double_double: "double_double",
  player_triple_double: "triple_double",
};

export const PROP_TYPE_LABELS: Record<PlayerPropType, string> = {
  points: "Points",
  rebounds: "Rebounds",
  assists: "Assists",
  threes: "3-Pointers",
  steals: "Steals",
  blocks: "Blocks",
  turnovers: "Turnovers",
  pra: "Pts + Reb + Ast",
  points_rebounds: "Pts + Reb",
  points_assists: "Pts + Ast",
  rebounds_assists: "Reb + Ast",
  blocks_steals: "Blk + Stl",
  double_double: "Double-Double",
  triple_double: "Triple-Double",
};

export interface PlayerPropLine {
  playerName: string;
  playerId?: string;
  propType: PlayerPropType;
  line: number;
  overOdds: number;
  underOdds: number;
  bookmaker: string;
  lastUpdate: string;
}

export interface PlayerPropOdds {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  props: PlayerPropLine[];
}

export interface AggregatedPlayerProp {
  playerName: string;
  playerId?: string;
  propType: PlayerPropType;
  consensusLine: number;
  lines: {
    bookmaker: string;
    line: number;
    overOdds: number;
    underOdds: number;
  }[];
  bestOverOdds: { bookmaker: string; odds: number };
  bestUnderOdds: { bookmaker: string; odds: number };
}

// ============================================================================
// Player Prop Prediction Types
// ============================================================================

export interface PlayerAnalytics {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  
  // Season averages
  seasonAvg: {
    points: number;
    rebounds: number;
    assists: number;
    threes: number;
    steals: number;
    blocks: number;
    turnovers: number;
    minutes: number;
    gamesPlayed: number;
  };
  
  // Recent form (last 5 games)
  last5Avg: {
    points: number;
    rebounds: number;
    assists: number;
    threes: number;
    steals: number;
    blocks: number;
    turnovers: number;
    minutes: number;
  };
  
  // Last 10 games
  last10Avg: {
    points: number;
    rebounds: number;
    assists: number;
    threes: number;
    steals: number;
    blocks: number;
    turnovers: number;
    minutes: number;
  };
  
  // Home/Away splits
  homeSplit: {
    points: number;
    rebounds: number;
    assists: number;
    threes: number;
    gamesPlayed: number;
  };
  awaySplit: {
    points: number;
    rebounds: number;
    assists: number;
    threes: number;
    gamesPlayed: number;
  };
  
  // Trends
  trends: {
    pointsTrend: "up" | "down" | "stable";
    reboundsTrend: "up" | "down" | "stable";
    assistsTrend: "up" | "down" | "stable";
    threesTrend: "up" | "down" | "stable";
  };
  
  // Consistency metrics
  consistency: {
    pointsStdDev: number;
    reboundsStdDev: number;
    assistsStdDev: number;
    minutesStdDev: number;
  };
  
  // Usage proxy
  usageMetrics: {
    fieldGoalAttempts: number;
    freeThrowAttempts: number;
    threeAttempts: number;
    estimatedUsage: number;
  };
}

export interface PropPrediction {
  playerId: string;
  playerName: string;
  team: string;
  propType: PlayerPropType;
  line: number;
  predictedValue: number;
  confidence: number;
  edge: number;
  recommendation: "over" | "under" | "pass";
  factors: string[];
  
  // Odds info
  overOdds?: number;
  underOdds?: number;
  bestBookmaker?: string;
  
  // Supporting data
  seasonAvg: number;
  last5Avg: number;
  last10Avg: number;
}

export interface PropValueBet {
  prediction: PropPrediction;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  valueScore: number;
  tier: "high" | "medium" | "low";
}

// ============================================================================
// API Response Types (from The Odds API)
// ============================================================================

export interface OddsApiPlayerPropOutcome {
  name: "Over" | "Under";
  description: string; // Player name
  price: number;
  point: number;
}

export interface OddsApiPlayerPropMarket {
  key: string;
  last_update: string;
  outcomes: OddsApiPlayerPropOutcome[];
}

export interface OddsApiPlayerPropBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsApiPlayerPropMarket[];
}

export interface OddsApiEventOddsResponse {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsApiPlayerPropBookmaker[];
}

// ============================================================================
// ESPN API Response Types
// ============================================================================

export interface ESPNPlayerResponse {
  id: string;
  uid: string;
  guid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  displayName: string;
  shortName: string;
  jersey?: string;
  position?: {
    id: string;
    name: string;
    displayName: string;
    abbreviation: string;
  };
  headshot?: {
    href: string;
    alt: string;
  };
  injuries?: {
    status: string;
    date: string;
  }[];
}

export interface ESPNRosterResponse {
  team: {
    id: string;
    name: string;
    abbreviation: string;
  };
  athletes: ESPNPlayerResponse[];
}

export interface ESPNPlayerStatsCategory {
  name: string;
  displayName: string;
  stats: {
    name: string;
    displayName: string;
    value: number;
    displayValue: string;
  }[];
}

export interface ESPNPlayerStatsResponse {
  athlete: ESPNPlayerResponse;
  statistics: {
    season: {
      year: number;
      type: number;
      displayName: string;
    };
    categories: ESPNPlayerStatsCategory[];
  }[];
}

export interface ESPNGameLogEntry {
  eventId: string;
  eventDate: string;
  opponent: {
    id: string;
    name: string;
    abbreviation: string;
  };
  homeAway: "home" | "away";
  stats: Record<string, number>;
}
