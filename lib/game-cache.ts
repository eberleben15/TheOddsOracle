/**
 * Server-Side Game Cache
 * 
 * Caches game odds data to prevent duplicate API calls when:
 * 1. User views dashboard (fetches all games)
 * 2. User clicks a game (fetches same game again)
 * 
 * Cache is shared across requests with TTL-based expiration.
 */

import { OddsGame } from "@/types";

interface CacheEntry {
  data: OddsGame;
  expiresAt: number;
}

class GameOddsCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 60 * 1000; // 60 seconds

  /**
   * Store a game in cache
   */
  set(gameId: string, game: OddsGame): void {
    this.cache.set(gameId, {
      data: game,
      expiresAt: Date.now() + this.TTL,
    });
  }

  /**
   * Store multiple games in cache
   */
  setMany(games: OddsGame[]): void {
    const expiresAt = Date.now() + this.TTL;
    games.forEach((game) => {
      this.cache.set(game.id, {
        data: game,
        expiresAt,
      });
    });
    console.log(`[GAME CACHE] Stored ${games.length} games`);
  }

  /**
   * Get a game from cache
   * Returns null if not found or expired
   */
  get(gameId: string): OddsGame | null {
    const entry = this.cache.get(gameId);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(gameId);
      console.log(`[GAME CACHE] Expired: ${gameId}`);
      return null;
    }

    console.log(`[GAME CACHE] Hit: ${gameId}`);
    return entry.data;
  }

  /**
   * Clear expired entries
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
      console.log(`[GAME CACHE] Cleaned up ${removed} expired entries`);
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
export const gameOddsCache = new GameOddsCache();

// Run cleanup every 2 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => gameOddsCache.cleanup(), 2 * 60 * 1000);
}

