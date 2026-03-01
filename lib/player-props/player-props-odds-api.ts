/**
 * Player Props Odds API
 * 
 * Fetches player props from The Odds API event-odds endpoint.
 * Uses the /v4/sports/{sport}/events/{eventId}/odds endpoint.
 */

import { fetchWithRetry } from "@/lib/retry-utils";
import type {
  PlayerPropOdds,
  PlayerPropLine,
  PlayerPropType,
  AggregatedPlayerProp,
  OddsApiEventOddsResponse,
  OddsApiPlayerPropMarket,
  OddsApiPlayerPropOutcome,
} from "./player-types";
import { MARKET_KEY_TO_PROP_TYPE, PLAYER_PROP_MARKET_KEYS } from "./player-types";

const THE_ODDS_API_BASE_URL = "https://api.the-odds-api.com/v4";

// Default markets to fetch (high priority)
const DEFAULT_PROP_MARKETS = [
  "player_points",
  "player_rebounds",
  "player_assists",
  "player_threes",
];

// Extended markets (medium priority)
const EXTENDED_PROP_MARKETS = [
  ...DEFAULT_PROP_MARKETS,
  "player_points_rebounds_assists",
  "player_steals",
  "player_blocks",
  "player_blocks_steals",
];

// All supported markets
const ALL_PROP_MARKETS = [
  ...EXTENDED_PROP_MARKETS,
  "player_turnovers",
  "player_points_rebounds",
  "player_points_assists",
  "player_rebounds_assists",
  "player_double_double",
  "player_triple_double",
];

export type PropMarketSet = "default" | "extended" | "all";

function getMarketsForSet(set: PropMarketSet): string[] {
  switch (set) {
    case "default":
      return DEFAULT_PROP_MARKETS;
    case "extended":
      return EXTENDED_PROP_MARKETS;
    case "all":
      return ALL_PROP_MARKETS;
    default:
      return DEFAULT_PROP_MARKETS;
  }
}

function parseOutcomeToLine(
  outcomes: OddsApiPlayerPropOutcome[],
  propType: PlayerPropType,
  bookmaker: string,
  lastUpdate: string
): PlayerPropLine[] {
  const lines: PlayerPropLine[] = [];
  const playerOutcomes = new Map<string, { over?: OddsApiPlayerPropOutcome; under?: OddsApiPlayerPropOutcome }>();
  
  for (const outcome of outcomes) {
    const playerName = outcome.description;
    if (!playerName) continue;
    
    const existing = playerOutcomes.get(playerName) || {};
    if (outcome.name === "Over") {
      existing.over = outcome;
    } else if (outcome.name === "Under") {
      existing.under = outcome;
    }
    playerOutcomes.set(playerName, existing);
  }
  
  for (const [playerName, { over, under }] of playerOutcomes) {
    if (!over && !under) continue;
    
    // Use the line from whichever outcome is available (they should be the same)
    const line = over?.point ?? under?.point ?? 0;
    
    lines.push({
      playerName,
      propType,
      line,
      overOdds: over?.price ?? 0,
      underOdds: under?.price ?? 0,
      bookmaker,
      lastUpdate,
    });
  }
  
  return lines;
}

export async function getEventPlayerProps(
  sportKey: string,
  eventId: string,
  marketSet: PropMarketSet = "default",
  regions: string = "us"
): Promise<PlayerPropOdds | null> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  
  if (!apiKey) {
    console.error("THE_ODDS_API_KEY is not set");
    return null;
  }
  
  const markets = getMarketsForSet(marketSet);
  const marketsParam = markets.join(",");
  
  const url = `${THE_ODDS_API_BASE_URL}/sports/${sportKey}/events/${eventId}/odds?apiKey=${apiKey}&regions=${regions}&markets=${marketsParam}&oddsFormat=american`;
  
  try {
    const response = await fetchWithRetry(
      url,
      { next: { revalidate: 300 } }, // 5 minute cache
      {
        maxAttempts: 2,
        initialDelay: 1000,
        retryable: (error) => {
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (message.includes("401") || message.includes("404") || message.includes("403")) {
              return false;
            }
          }
          return true;
        },
      }
    );
    
    if (!response.ok) {
      console.error(`Player props fetch failed: ${response.status}`);
      return null;
    }
    
    const data = await response.json() as OddsApiEventOddsResponse;
    const allProps: PlayerPropLine[] = [];
    
    for (const bookmaker of data.bookmakers || []) {
      for (const market of bookmaker.markets || []) {
        const propType = MARKET_KEY_TO_PROP_TYPE[market.key];
        if (!propType) continue;
        
        const lines = parseOutcomeToLine(
          market.outcomes,
          propType,
          bookmaker.title,
          market.last_update
        );
        allProps.push(...lines);
      }
    }
    
    return {
      gameId: data.id,
      sport: data.sport_key,
      homeTeam: data.home_team,
      awayTeam: data.away_team,
      commenceTime: data.commence_time,
      props: allProps,
    };
  } catch (error) {
    console.error("Error fetching player props:", error);
    return null;
  }
}

export function aggregatePlayerProps(props: PlayerPropLine[]): AggregatedPlayerProp[] {
  const grouped = new Map<string, PlayerPropLine[]>();
  
  // Group by player + prop type
  for (const prop of props) {
    const key = `${prop.playerName}:${prop.propType}`;
    const existing = grouped.get(key) || [];
    existing.push(prop);
    grouped.set(key, existing);
  }
  
  const aggregated: AggregatedPlayerProp[] = [];
  
  for (const [, lines] of grouped) {
    if (lines.length === 0) continue;
    
    const first = lines[0];
    
    // Calculate consensus line (median)
    const sortedLines = [...lines].sort((a, b) => a.line - b.line);
    const consensusLine = sortedLines[Math.floor(sortedLines.length / 2)].line;
    
    // Find best odds
    let bestOverOdds = { bookmaker: "", odds: -Infinity };
    let bestUnderOdds = { bookmaker: "", odds: -Infinity };
    
    for (const line of lines) {
      if (line.overOdds > bestOverOdds.odds) {
        bestOverOdds = { bookmaker: line.bookmaker, odds: line.overOdds };
      }
      if (line.underOdds > bestUnderOdds.odds) {
        bestUnderOdds = { bookmaker: line.bookmaker, odds: line.underOdds };
      }
    }
    
    aggregated.push({
      playerName: first.playerName,
      playerId: first.playerId,
      propType: first.propType,
      consensusLine,
      lines: lines.map((l) => ({
        bookmaker: l.bookmaker,
        line: l.line,
        overOdds: l.overOdds,
        underOdds: l.underOdds,
      })),
      bestOverOdds,
      bestUnderOdds,
    });
  }
  
  return aggregated;
}

export async function getUpcomingEventsWithProps(
  sportKey: string,
  limit: number = 10
): Promise<{ id: string; home_team: string; away_team: string; commence_time: string }[]> {
  const apiKey = process.env.THE_ODDS_API_KEY;
  
  if (!apiKey) {
    console.error("THE_ODDS_API_KEY is not set");
    return [];
  }
  
  // Use the events endpoint to get event IDs
  const url = `${THE_ODDS_API_BASE_URL}/sports/${sportKey}/events?apiKey=${apiKey}`;
  
  try {
    const response = await fetchWithRetry(
      url,
      { next: { revalidate: 300 } },
      { maxAttempts: 2, initialDelay: 1000 }
    );
    
    if (!response.ok) {
      console.error(`Events fetch failed: ${response.status}`);
      return [];
    }
    
    interface EventsResponse {
      id: string;
      sport_key: string;
      commence_time: string;
      home_team: string;
      away_team: string;
    }
    
    const data = await response.json() as EventsResponse[];
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Filter to events starting within 24 hours
    const upcoming = data
      .filter((event) => {
        const commence = new Date(event.commence_time);
        return commence > now && commence < in24Hours;
      })
      .slice(0, limit)
      .map((event) => ({
        id: event.id,
        home_team: event.home_team,
        away_team: event.away_team,
        commence_time: event.commence_time,
      }));
    
    return upcoming;
  } catch (error) {
    console.error("Error fetching upcoming events:", error);
    return [];
  }
}

export async function getAllPlayerPropsForSport(
  sportKey: string,
  marketSet: PropMarketSet = "default",
  limit: number = 10
): Promise<PlayerPropOdds[]> {
  const events = await getUpcomingEventsWithProps(sportKey, limit);
  const results: PlayerPropOdds[] = [];
  
  // Fetch props for each event (with rate limiting)
  for (const event of events) {
    const props = await getEventPlayerProps(sportKey, event.id, marketSet);
    if (props) {
      results.push(props);
    }
    // Small delay between requests
    await new Promise((r) => setTimeout(r, 200));
  }
  
  return results;
}

export function americanToDecimal(american: number): number {
  if (american >= 100) {
    return (american / 100) + 1;
  } else if (american <= -100) {
    return (100 / Math.abs(american)) + 1;
  }
  return 2; // Fallback for invalid odds
}

export function americanToImpliedProbability(american: number): number {
  if (american >= 100) {
    return 100 / (american + 100);
  } else if (american <= -100) {
    return Math.abs(american) / (Math.abs(american) + 100);
  }
  return 0.5;
}
