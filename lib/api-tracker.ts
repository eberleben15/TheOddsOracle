/**
 * API Call Tracking & Monitoring
 * 
 * Tracks API calls for performance monitoring and debugging.
 * Logs call counts, response times, and cache hit rates.
 */

interface APICallLog {
  endpoint: string;
  duration: number;
  timestamp: number;
  cached: boolean;
  status?: number;
}

class APITracker {
  private calls: APICallLog[] = [];
  private readonly MAX_LOGS = 100; // Keep last 100 calls

  /**
   * Log an API call
   */
  log(endpoint: string, duration: number, cached: boolean = false, status?: number): void {
    this.calls.push({
      endpoint,
      duration,
      timestamp: Date.now(),
      cached,
      status,
    });

    // Keep only recent logs
    if (this.calls.length > this.MAX_LOGS) {
      this.calls.shift();
    }

    // Console log for development
    const cacheStatus = cached ? '⚡ CACHED' : '🌐 API CALL';
    console.log(
      `[${cacheStatus}] ${endpoint.split('?')[0]} - ${duration}ms` +
      (status ? ` (${status})` : '')
    );
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalCalls: number;
    cachedCalls: number;
    cacheHitRate: number;
    avgDuration: number;
    callsByEndpoint: Record<string, number>;
  } {
    const totalCalls = this.calls.length;
    const cachedCalls = this.calls.filter(c => c.cached).length;
    const cacheHitRate = totalCalls > 0 ? (cachedCalls / totalCalls) * 100 : 0;
    
    const totalDuration = this.calls.reduce((sum, call) => sum + call.duration, 0);
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

    const callsByEndpoint: Record<string, number> = {};
    this.calls.forEach(call => {
      const endpoint = call.endpoint.split('?')[0];
      callsByEndpoint[endpoint] = (callsByEndpoint[endpoint] || 0) + 1;
    });

    return {
      totalCalls,
      cachedCalls,
      cacheHitRate: parseFloat(cacheHitRate.toFixed(2)),
      avgDuration: parseFloat(avgDuration.toFixed(2)),
      callsByEndpoint,
    };
  }

  /**
   * Print statistics to console
   */
  printStats(): void {
    const stats = this.getStats();
    console.log('\n📊 API Call Statistics:');
    console.log(`  Total Calls: ${stats.totalCalls}`);
    console.log(`  Cached: ${stats.cachedCalls} (${stats.cacheHitRate}% hit rate)`);
    console.log(`  Avg Duration: ${stats.avgDuration}ms`);
    console.log(`  By Endpoint:`);
    Object.entries(stats.callsByEndpoint).forEach(([endpoint, count]) => {
      console.log(`    ${endpoint}: ${count} calls`);
    });
    console.log('');
  }

  /**
   * Clear all logged calls
   */
  clear(): void {
    this.calls = [];
  }
}

// Export singleton instance
export const apiTracker = new APITracker();

/**
 * Simple tracking function for API calls
 */
export function trackApiCall(
  api: string,
  endpoint: string,
  cached: boolean,
  status?: number,
  error?: string,
  duration?: number
): void {
  const statusEmoji = cached ? "⚡ CACHED" : "🌐 API CALL";
  const durationMsg = duration ? ` (${duration}ms)` : "";
  const errorMsg = error ? ` ❌ ${error}` : "";
  const statusMsg = status ? ` [${status}]` : "";
  
  console.log(`[${statusEmoji}] ${api} - ${endpoint}${durationMsg}${statusMsg}${errorMsg}`);
  
  // Also log to tracker instance
  if (duration !== undefined) {
    apiTracker.log(`${api}/${endpoint}`, duration, cached, status);
  }
}

/**
 * Wrapper function for tracked fetch calls
 */
export async function trackedFetch(
  url: string,
  options?: RequestInit,
  cached: boolean = false
): Promise<Response> {
  const startTime = Date.now();
  const endpoint = url.replace(process.env.THE_ODDS_API_KEY || '', '[API_KEY]')
                     .replace(process.env.STATS_API_KEY || '', '[API_KEY]');
  
  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    apiTracker.log(endpoint, duration, cached, response.status);
    
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    apiTracker.log(endpoint, duration, cached);
    throw error;
  }
}

