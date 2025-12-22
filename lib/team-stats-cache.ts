/**
 * Team Stats Cache
 * 
 * Caches team season statistics to avoid redundant API calls.
 * Stats are cached per sport and team name with TTL-based expiration.
 */

import { TeamStats } from "@/types";
import { Sport } from "./sports/sport-config";

interface CacheEntry {
  stats: TeamStats;
  expiresAt: number;
}

class TeamStatsCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 10 * 60 * 1000; // 10 minutes (team stats don't change frequently)

  /**
   * Generate cache key for a team
   */
  private getKey(sport: Sport, teamName: string): string {
    return `${sport}:${teamName.toLowerCase().trim()}`;
  }

  /**
   * Get cached team stats
   */
  get(sport: Sport, teamName: string): TeamStats | null {
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

    return entry.stats;
  }

  /**
   * Store team stats in cache
   */
  set(sport: Sport, teamName: string, stats: TeamStats): void {
    const key = this.getKey(sport, teamName);
    this.cache.set(key, {
      stats,
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
      console.log(`[TEAM STATS CACHE] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const teamStatsCache = new TeamStatsCache();

// Run cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => teamStatsCache.cleanup(), 10 * 60 * 1000);
}

