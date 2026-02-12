/**
 * API Usage Tracker
 * 
 * Tracks API call usage per source to monitor free tier limits
 * Provides alerts and automatic fallback when limits are reached
 */

interface UsageRecord {
  source: string;
  timestamp: number;
  endpoint: string;
  success: boolean;
  cached: boolean;
}

interface DailyUsage {
  source: string;
  date: string;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  cachedCalls: number;
}

class ApiUsageTracker {
  private records: UsageRecord[] = [];
  private readonly MAX_RECORDS = 10000; // Keep last 10K records

  /**
   * Record an API call
   */
  record(
    source: string,
    endpoint: string,
    success: boolean,
    cached: boolean = false
  ): void {
    this.records.push({
      source,
      timestamp: Date.now(),
      endpoint,
      success,
      cached,
    });
    
    // Keep only recent records
    if (this.records.length > this.MAX_RECORDS) {
      this.records = this.records.slice(-this.MAX_RECORDS);
    }
  }

  /**
   * Get daily usage for a source
   */
  getDailyUsage(source: string, date?: string): DailyUsage {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(targetDate).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    
    const dayRecords = this.records.filter(
      r => r.source === source && r.timestamp >= startOfDay && r.timestamp < endOfDay
    );
    
    return {
      source,
      date: targetDate,
      totalCalls: dayRecords.length,
      successfulCalls: dayRecords.filter(r => r.success).length,
      failedCalls: dayRecords.filter(r => !r.success).length,
      cachedCalls: dayRecords.filter(r => r.cached).length,
    };
  }

  /**
   * Get usage for today
   */
  getTodayUsage(source: string): DailyUsage {
    return this.getDailyUsage(source);
  }

  /**
   * Check if source is approaching limit
   */
  isApproachingLimit(
    source: string,
    limit: number,
    threshold: number = 0.8
  ): boolean {
    const todayUsage = this.getTodayUsage(source);
    return todayUsage.totalCalls >= limit * threshold;
  }

  /**
   * Check if source has exceeded limit
   */
  hasExceededLimit(source: string, limit: number): boolean {
    const todayUsage = this.getTodayUsage(source);
    return todayUsage.totalCalls >= limit;
  }

  /**
   * Get all sources usage for today
   */
  getAllTodayUsage(): DailyUsage[] {
    const sources = [...new Set(this.records.map(r => r.source))];
    return sources.map(s => this.getTodayUsage(s));
  }

  /**
   * Get cache hit rate for a source
   */
  getCacheHitRate(source: string, date?: string): number {
    const usage = this.getDailyUsage(source, date);
    if (usage.totalCalls === 0) return 0;
    return (usage.cachedCalls / usage.totalCalls) * 100;
  }

  /**
   * Get success rate for a source
   */
  getSuccessRate(source: string, date?: string): number {
    const usage = this.getDailyUsage(source, date);
    if (usage.totalCalls === 0) return 0;
    return (usage.successfulCalls / usage.totalCalls) * 100;
  }

  /**
   * Clear old records (older than N days)
   */
  clearOldRecords(daysToKeep: number = 30): void {
    const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    this.records = this.records.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Get usage summary
   */
  getSummary(): {
    totalCalls: number;
    sources: Record<string, DailyUsage>;
    cacheHitRate: number;
    successRate: number;
  } {
    const todayUsage = this.getAllTodayUsage();
    const totalCalls = todayUsage.reduce((sum, u) => sum + u.totalCalls, 0);
    const totalCached = todayUsage.reduce((sum, u) => sum + u.cachedCalls, 0);
    const totalSuccessful = todayUsage.reduce((sum, u) => sum + u.successfulCalls, 0);
    
    const sources: Record<string, DailyUsage> = {};
    for (const usage of todayUsage) {
      sources[usage.source] = usage;
    }
    
    return {
      totalCalls,
      sources,
      cacheHitRate: totalCalls > 0 ? (totalCached / totalCalls) * 100 : 0,
      successRate: totalCalls > 0 ? (totalSuccessful / totalCalls) * 100 : 0,
    };
  }
}

// Export singleton instance
export const apiUsageTracker = new ApiUsageTracker();

// Clean old records daily
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    apiUsageTracker.clearOldRecords(30);
  }, 24 * 60 * 60 * 1000); // Once per day
}
