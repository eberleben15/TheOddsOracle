/**
 * Recommended Bets Cache
 * 
 * Caches recommended bets to avoid recalculating on every page load.
 * Bets are cached per sport with TTL-based expiration.
 */

import { RecommendedBet } from "@/components/RecommendedBets";
import { Sport } from "./sports/sport-config";

interface CacheEntry {
  bets: RecommendedBet[];
  expiresAt: number;
  sport: Sport;
}

class RecommendedBetsCache {
  private cache = new Map<Sport, CacheEntry>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached recommended bets for a sport
   */
  get(sport: Sport): RecommendedBet[] | null {
    const entry = this.cache.get(sport);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(sport);
      console.log(`[RECOMMENDED BETS CACHE] Expired: ${sport}`);
      return null;
    }

    console.log(`[RECOMMENDED BETS CACHE] Hit: ${sport} (${entry.bets.length} bets)`);
    return entry.bets;
  }

  /**
   * Store recommended bets in cache
   */
  set(sport: Sport, bets: RecommendedBet[]): void {
    this.cache.set(sport, {
      bets,
      expiresAt: Date.now() + this.TTL,
      sport,
    });
    console.log(`[RECOMMENDED BETS CACHE] Stored: ${sport} (${bets.length} bets)`);
  }

  /**
   * Clear cache for a specific sport or all sports
   */
  clear(sport?: Sport): void {
    if (sport) {
      this.cache.delete(sport);
      console.log(`[RECOMMENDED BETS CACHE] Cleared: ${sport}`);
    } else {
      this.cache.clear();
      console.log(`[RECOMMENDED BETS CACHE] Cleared all`);
    }
  }

  /**
   * Check if cache has valid entry for sport
   */
  has(sport: Sport): boolean {
    const entry = this.cache.get(sport);
    if (!entry) return false;
    return Date.now() <= entry.expiresAt;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [sport, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(sport);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`[RECOMMENDED BETS CACHE] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; sports: Sport[] } {
    return {
      size: this.cache.size,
      sports: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const recommendedBetsCache = new RecommendedBetsCache();

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => recommendedBetsCache.cleanup(), 5 * 60 * 1000);
}

