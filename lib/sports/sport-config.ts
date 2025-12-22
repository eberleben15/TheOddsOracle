/**
 * Sport Configuration
 * 
 * Central configuration for all supported sports
 */

export type Sport = "nba" | "nfl" | "nhl" | "mlb" | "cbb";

export interface SportConfig {
  key: Sport;
  name: string;
  displayName: string;
  baseUrl: string;
  oddsApiKey: string; // The Odds API sport key
  seasonType: "year" | "season"; // How seasons are identified
  currentSeason: () => string; // Function to get current season
}

export const SPORT_CONFIGS: Record<Sport, SportConfig> = {
  cbb: {
    key: "cbb",
    name: "College Basketball",
    displayName: "NCAA Basketball",
    baseUrl: "https://api.sportsdata.io/v3/cbb",
    oddsApiKey: "basketball_ncaab",
    seasonType: "year",
    currentSeason: () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      // NCAA basketball: Nov-Apr season, use ending year
      if (month >= 10) return String(year + 1);
      return String(year);
    },
  },
  nba: {
    key: "nba",
    name: "NBA",
    displayName: "NBA",
    baseUrl: "https://api.sportsdata.io/v3/nba",
    oddsApiKey: "basketball_nba",
    seasonType: "year",
    currentSeason: () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      // NBA: Oct-Jun season, use ending year
      if (month >= 9) return String(year + 1);
      return String(year);
    },
  },
  nfl: {
    key: "nfl",
    name: "NFL",
    displayName: "NFL",
    baseUrl: "https://api.sportsdata.io/v3/nfl",
    oddsApiKey: "americanfootball_nfl",
    seasonType: "year",
    currentSeason: () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      // NFL: Sep-Feb season, use starting year
      if (month >= 8) return String(year);
      return String(year - 1);
    },
  },
  nhl: {
    key: "nhl",
    name: "NHL",
    displayName: "NHL",
    baseUrl: "https://api.sportsdata.io/v3/nhl",
    oddsApiKey: "icehockey_nhl",
    seasonType: "year",
    currentSeason: () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      // NHL: Oct-Jun season, use ending year
      if (month >= 9) return String(year + 1);
      return String(year);
    },
  },
  mlb: {
    key: "mlb",
    name: "MLB",
    displayName: "MLB",
    baseUrl: "https://api.sportsdata.io/v3/mlb",
    oddsApiKey: "baseball_mlb",
    seasonType: "year",
    currentSeason: () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      // MLB: Mar-Oct season, use starting year
      if (month >= 2) return String(year);
      return String(year - 1);
    },
  },
};

export function getSportConfig(sport: Sport): SportConfig {
  return SPORT_CONFIGS[sport];
}

export function getAllSports(): Sport[] {
  return Object.keys(SPORT_CONFIGS) as Sport[];
}

