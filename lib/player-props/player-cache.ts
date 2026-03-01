/**
 * Player Stats Cache
 * 
 * In-memory cache for player rosters, season stats, and game logs
 * to reduce API calls to ESPN.
 */

import type {
  NBAPlayer,
  PlayerSeasonStats,
  PlayerGameLog,
} from "./player-types";
import {
  getNBATeamRoster,
  getNBAPlayerSeasonStats,
  getNBAPlayerGameLog,
  findNBATeamId,
} from "./espn-player-api";

// Cache TTLs
const ROSTER_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SEASON_STATS_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const GAME_LOG_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TEAM_ID_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class PlayerCache {
  private rosterCache = new Map<string, CacheEntry<NBAPlayer[]>>();
  private seasonStatsCache = new Map<string, CacheEntry<PlayerSeasonStats>>();
  private gameLogCache = new Map<string, CacheEntry<PlayerGameLog[]>>();
  private teamIdCache = new Map<string, CacheEntry<string | null>>();
  
  private isValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
    if (!entry) return false;
    return Date.now() - entry.timestamp < entry.ttl;
  }
  
  // ============================================================================
  // Team ID Cache
  // ============================================================================
  
  async getTeamId(teamName: string): Promise<string | null> {
    const cacheKey = teamName.toLowerCase().trim();
    const cached = this.teamIdCache.get(cacheKey);
    
    if (this.isValid(cached)) {
      return cached.data;
    }
    
    const teamId = await findNBATeamId(teamName);
    this.teamIdCache.set(cacheKey, {
      data: teamId,
      timestamp: Date.now(),
      ttl: TEAM_ID_TTL_MS,
    });
    
    return teamId;
  }
  
  // ============================================================================
  // Roster Cache
  // ============================================================================
  
  async getRoster(teamId: string): Promise<NBAPlayer[]> {
    const cached = this.rosterCache.get(teamId);
    
    if (this.isValid(cached)) {
      return cached.data;
    }
    
    const roster = await getNBATeamRoster(teamId);
    this.rosterCache.set(teamId, {
      data: roster,
      timestamp: Date.now(),
      ttl: ROSTER_TTL_MS,
    });
    
    return roster;
  }
  
  async getRosterByTeamName(teamName: string): Promise<NBAPlayer[]> {
    const teamId = await this.getTeamId(teamName);
    if (!teamId) return [];
    return this.getRoster(teamId);
  }
  
  // ============================================================================
  // Season Stats Cache
  // ============================================================================
  
  async getSeasonStats(playerId: string): Promise<PlayerSeasonStats | null> {
    const cached = this.seasonStatsCache.get(playerId);
    
    if (this.isValid(cached)) {
      return cached.data;
    }
    
    const stats = await getNBAPlayerSeasonStats(playerId);
    if (stats) {
      this.seasonStatsCache.set(playerId, {
        data: stats,
        timestamp: Date.now(),
        ttl: SEASON_STATS_TTL_MS,
      });
    }
    
    return stats;
  }
  
  async getBatchSeasonStats(playerIds: string[]): Promise<Map<string, PlayerSeasonStats>> {
    const result = new Map<string, PlayerSeasonStats>();
    const toFetch: string[] = [];
    
    // Check cache first
    for (const playerId of playerIds) {
      const cached = this.seasonStatsCache.get(playerId);
      if (this.isValid(cached)) {
        result.set(playerId, cached.data);
      } else {
        toFetch.push(playerId);
      }
    }
    
    // Fetch missing in batches
    const batchSize = 5;
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      const stats = await Promise.all(
        batch.map((id) => getNBAPlayerSeasonStats(id))
      );
      
      for (let j = 0; j < batch.length; j++) {
        const stat = stats[j];
        if (stat) {
          this.seasonStatsCache.set(batch[j], {
            data: stat,
            timestamp: Date.now(),
            ttl: SEASON_STATS_TTL_MS,
          });
          result.set(batch[j], stat);
        }
      }
    }
    
    return result;
  }
  
  // ============================================================================
  // Game Log Cache
  // ============================================================================
  
  async getGameLog(playerId: string, limit: number = 10): Promise<PlayerGameLog[]> {
    const cacheKey = `${playerId}:${limit}`;
    const cached = this.gameLogCache.get(cacheKey);
    
    if (this.isValid(cached)) {
      return cached.data;
    }
    
    const gameLog = await getNBAPlayerGameLog(playerId, limit);
    this.gameLogCache.set(cacheKey, {
      data: gameLog,
      timestamp: Date.now(),
      ttl: GAME_LOG_TTL_MS,
    });
    
    return gameLog;
  }
  
  async getBatchGameLogs(
    playerIds: string[],
    limit: number = 10
  ): Promise<Map<string, PlayerGameLog[]>> {
    const result = new Map<string, PlayerGameLog[]>();
    const toFetch: string[] = [];
    
    // Check cache first
    for (const playerId of playerIds) {
      const cacheKey = `${playerId}:${limit}`;
      const cached = this.gameLogCache.get(cacheKey);
      if (this.isValid(cached)) {
        result.set(playerId, cached.data);
      } else {
        toFetch.push(playerId);
      }
    }
    
    // Fetch missing in batches
    const batchSize = 5;
    for (let i = 0; i < toFetch.length; i += batchSize) {
      const batch = toFetch.slice(i, i + batchSize);
      const logs = await Promise.all(
        batch.map((id) => getNBAPlayerGameLog(id, limit))
      );
      
      for (let j = 0; j < batch.length; j++) {
        const log = logs[j];
        const cacheKey = `${batch[j]}:${limit}`;
        this.gameLogCache.set(cacheKey, {
          data: log,
          timestamp: Date.now(),
          ttl: GAME_LOG_TTL_MS,
        });
        result.set(batch[j], log);
      }
    }
    
    return result;
  }
  
  // ============================================================================
  // Cache Management
  // ============================================================================
  
  clearAll(): void {
    this.rosterCache.clear();
    this.seasonStatsCache.clear();
    this.gameLogCache.clear();
    this.teamIdCache.clear();
  }
  
  clearExpired(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.rosterCache) {
      if (now - entry.timestamp >= entry.ttl) {
        this.rosterCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.seasonStatsCache) {
      if (now - entry.timestamp >= entry.ttl) {
        this.seasonStatsCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.gameLogCache) {
      if (now - entry.timestamp >= entry.ttl) {
        this.gameLogCache.delete(key);
      }
    }
    
    for (const [key, entry] of this.teamIdCache) {
      if (now - entry.timestamp >= entry.ttl) {
        this.teamIdCache.delete(key);
      }
    }
  }
  
  getStats(): {
    rosterEntries: number;
    seasonStatsEntries: number;
    gameLogEntries: number;
    teamIdEntries: number;
  } {
    return {
      rosterEntries: this.rosterCache.size,
      seasonStatsEntries: this.seasonStatsCache.size,
      gameLogEntries: this.gameLogCache.size,
      teamIdEntries: this.teamIdCache.size,
    };
  }
}

export const playerCache = new PlayerCache();
