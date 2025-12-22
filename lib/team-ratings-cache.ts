/**
 * Team Ratings Cache
 * 
 * Maintains a cache of all team efficiency ratings for quick lookups
 * during Strength of Schedule calculations. This allows us to use actual
 * opponent ratings instead of estimating from game scores.
 */

import { getAllTeamSeasonStats, getAllTeams, SportsDataTeamSeason, SportsDataTeam } from "./sportsdata-api";

export interface TeamRatings {
  teamId: number;
  teamKey: string;
  teamName: string;
  offensiveEfficiency: number;
  defensiveEfficiency: number;
  pace: number;
  wins: number;
  losses: number;
  games: number;
  lastUpdated: number; // timestamp
}

// In-memory cache
let ratingsCache: Map<string, TeamRatings> = new Map(); // Key: teamKey or teamId
let cacheExpiry: number = 0;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Get all team ratings from cache or fetch from API
 */
export async function getAllTeamRatings(): Promise<Map<string, TeamRatings>> {
  const now = Date.now();
  
  // Return cache if valid
  if (ratingsCache.size > 0 && now < cacheExpiry) {
    return ratingsCache;
  }
  
  // Fetch fresh data
  try {
    const [allStats, allTeams] = await Promise.all([
      getAllTeamSeasonStats(),
      getAllTeams(),
    ]);
    
    // Create team map for name lookup
    const teamMap = new Map(allTeams.map(t => [t.TeamID, t]));
    
    // Build ratings cache
    const newCache = new Map<string, TeamRatings>();
    
    for (const stat of allStats) {
      const team = teamMap.get(stat.TeamID);
      if (!team) continue;
      
      const pace = stat.Possessions / Math.max(stat.Games, 1);
      
      const rating: TeamRatings = {
        teamId: stat.TeamID,
        teamKey: team.Key,
        teamName: team.School,
        offensiveEfficiency: stat.OffensiveRating,
        defensiveEfficiency: stat.DefensiveRating,
        pace: pace,
        wins: stat.Wins,
        losses: stat.Losses,
        games: stat.Games,
        lastUpdated: now,
      };
      
      // Store by both teamKey and teamId for flexible lookup
      newCache.set(team.Key.toUpperCase(), rating);
      newCache.set(String(stat.TeamID), rating);
      // Also store by team name (normalized) for fallback
      newCache.set(team.School.toUpperCase(), rating);
    }
    
    ratingsCache = newCache;
    cacheExpiry = now + CACHE_TTL;
    
    console.log(`[RATINGS CACHE] Cached ${newCache.size / 3} team ratings`);
    
    return newCache;
  } catch (error) {
    console.error("Error fetching team ratings:", error);
    // Return existing cache if available, even if expired
    return ratingsCache;
  }
}

/**
 * Get team ratings by team key or ID
 */
export async function getTeamRatings(
  teamKeyOrId: string | number
): Promise<TeamRatings | null> {
  const cache = await getAllTeamRatings();
  
  const key = typeof teamKeyOrId === 'string' 
    ? teamKeyOrId.toUpperCase() 
    : String(teamKeyOrId);
  
  return cache.get(key) || null;
}

/**
 * Get team ratings by team name (fuzzy match)
 */
export async function getTeamRatingsByName(teamName: string): Promise<TeamRatings | null> {
  const cache = await getAllTeamRatings();
  
  // Try exact match first
  const exactMatch = cache.get(teamName.toUpperCase());
  if (exactMatch) return exactMatch;
  
  // Try partial match
  const normalizedName = teamName.toUpperCase().trim();
  for (const [key, rating] of cache.entries()) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return rating;
    }
  }
  
  return null;
}

/**
 * Get opponent ratings from game result (synchronous version using existing cache)
 * Attempts to match opponent name to cached ratings
 */
export function getOpponentRatingsFromGameSync(
  opponentName: string,
  opponentKey?: string
): TeamRatings | null {
  // Try by key first (most reliable)
  if (opponentKey) {
    const key = opponentKey.toUpperCase();
    const byKey = ratingsCache.get(key);
    if (byKey) return byKey;
  }
  
  // Try by name
  const normalizedName = opponentName.toUpperCase().trim();
  const byName = ratingsCache.get(normalizedName);
  if (byName) return byName;
  
  // Try partial match
  for (const [key, rating] of ratingsCache.entries()) {
    if (key.includes(normalizedName) || normalizedName.includes(key)) {
      return rating;
    }
  }
  
  return null;
}

/**
 * Get opponent ratings from game result
 * Attempts to match opponent name to cached ratings
 */
export async function getOpponentRatingsFromGame(
  opponentName: string,
  opponentKey?: string
): Promise<TeamRatings | null> {
  // Ensure cache is loaded
  await getAllTeamRatings();
  
  // Use synchronous lookup
  return getOpponentRatingsFromGameSync(opponentName, opponentKey);
}

/**
 * Clear the ratings cache (useful for testing or forced refresh)
 */
export function clearRatingsCache(): void {
  ratingsCache.clear();
  cacheExpiry = 0;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  teamCount: number;
  isExpired: boolean;
  expiresAt: number | null;
} {
  const now = Date.now();
  return {
    size: ratingsCache.size,
    teamCount: Math.floor(ratingsCache.size / 3), // Each team stored 3 ways
    isExpired: now >= cacheExpiry,
    expiresAt: cacheExpiry > 0 ? cacheExpiry : null,
  };
}

