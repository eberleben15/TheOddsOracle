/**
 * Free Stats Cache
 * 
 * Aggressive caching layer for free API sources to minimize API calls
 * Implements TTL-based caching with different durations per data type
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class FreeStatsCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Cache durations (in milliseconds)
   */
  private readonly TTL = {
    teamStats: 24 * 60 * 60 * 1000,        // 24 hours
    gameResults: 60 * 60 * 1000,            // 1 hour
    schedules: 6 * 60 * 60 * 1000,          // 6 hours
    liveScores: 30 * 1000,                   // 30 seconds
    fourFactors: 24 * 60 * 60 * 1000,       // 24 hours (calculated values)
    teamMetadata: 7 * 24 * 60 * 60 * 1000,  // 7 days
    headToHead: 24 * 60 * 60 * 1000,        // 24 hours
  };

  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cached data with appropriate TTL based on data type
   */
  set<T>(key: string, data: T, dataType: keyof typeof FreeStatsCache.prototype.TTL = "teamStats"): void {
    const ttl = this.TTL[dataType];
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Set cached data with custom TTL
   */
  setWithTTL<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete cached entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    entries: Array<{ key: string; age: number; ttl: number; expired: boolean }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl,
      expired: now - entry.timestamp > entry.ttl,
    }));
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      entries,
    };
  }

  /**
   * Get cache hit rate (requires external tracking)
   */
  getHitRate(hits: number, misses: number): number {
    const total = hits + misses;
    if (total === 0) return 0;
    return (hits / total) * 100;
  }
}

// Export singleton instance
export const freeStatsCache = new FreeStatsCache();

// Clean expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    freeStatsCache.cleanExpired();
  }, 5 * 60 * 1000);
}
