/**
 * Per-Request API Cache
 * 
 * Simple in-memory cache that lives for the duration of a single request.
 * This eliminates redundant API calls when multiple functions need the same data
 * within a single page load.
 * 
 * Usage:
 * - Cache is automatically cleared at the start of each new request
 * - Cache keys are specific to the data being fetched (team games, stats, h2h)
 * - Cache stores both successful responses and null results to avoid retrying failed calls
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Get cached data by key
   * Returns null if not found or expired
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    
    // Cache entries are valid for the duration of the request
    // No expiration needed since we clear on each new request
    return entry.data;
  }

  /**
   * Store data in cache
   */
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear all cached data
   * Should be called at the start of each new request
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const apiCache = new RequestCache();

/**
 * Generate cache key for team games
 */
export function getCacheKey(type: 'games' | 'stats' | 'h2h', ...params: (string | number)[]): string {
  return `${type}-${params.join('-')}`;
}

