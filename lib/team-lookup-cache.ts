/**
 * Team Lookup Cache
 * 
 * Caches team name to SportsData.io team mapping to avoid redundant lookups.
 * Teams don't change frequently, so this can be cached longer.
 */

import { SportsDataTeam } from "./sports/base-sportsdata-client";
import { Sport } from "./sports/sport-config";

interface CacheEntry {
  team: SportsDataTeam;
  expiresAt: number;
}

class TeamLookupCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 60 * 60 * 1000; // 1 hour (teams don't change often)

  /**
   * Generate cache key for a team lookup
   */
  private getKey(sport: Sport, teamName: string): string {
    return `${sport}:${teamName.toLowerCase().trim()}`;
  }

  /**
   * Get cached team lookup
   */
  get(sport: Sport, teamName: string): SportsDataTeam | null {
    const key = this.getKey(sport, teamName);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.team;
  }

  /**
   * Store team lookup in cache
   */
  set(sport: Sport, teamName: string, team: SportsDataTeam): void {
    const key = this.getKey(sport, teamName);
    this.cache.set(key, {
      team,
      expiresAt: Date.now() + this.TTL,
    });
  }

  /**
   * Clear cache for a specific team or all teams
   */
  clear(sport?: Sport, teamName?: string): void {
    if (sport && teamName) {
      const key = this.getKey(sport, teamName);
      this.cache.delete(key);
    } else if (sport) {
      // Clear all entries for a sport
      const prefix = `${sport}:`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[TEAM LOOKUP CACHE] Cleaned up ${removed} expired entries`);
    }
  }
}

// Export singleton instance
export const teamLookupCache = new TeamLookupCache();

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => teamLookupCache.cleanup(), 60 * 60 * 1000);
}

