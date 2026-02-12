/**
 * Free Stats Aggregator
 *
 * Main aggregation layer that combines multiple free/low-cost API sources.
 * Replaces SportsData.IO with free alternatives.
 *
 * Strategy:
 * 1. Check cache first
 * 2. For CBB: try ESPN first (free, no key), then API-Sports.io
 * 3. For schedules/live: SportSRC, then ESPN scoreboard
 * 4. Calculate Four Factors from raw stats when available
 */

import { TeamStats, GameResult, HeadToHead } from "@/types";
import { SportSRCClient } from "./api-clients/sportsrc-client";
import { APISportsClient } from "./api-clients/api-sports-client";
import { espnClient } from "./api-clients/espn-client";
import { freeStatsCache } from "./free-stats-cache";
import { apiUsageTracker } from "./api-usage-tracker";
import { calculateFourFactors, calculateAdvancedMetrics } from "./stats-calculator";

export class FreeStatsAggregator {
  private sportsrcClient: SportSRCClient;
  private apisportsClient: APISportsClient;

  constructor() {
    this.sportsrcClient = new SportSRCClient();
    this.apisportsClient = new APISportsClient();
  }

  /**
   * Get head-to-head by team keys (ESPN team IDs). Used when CBB uses free/ESPN path.
   */
  async getHeadToHeadByKey(team1Key: string, team2Key: string, limit: number = 5): Promise<HeadToHead | null> {
    const cacheKey = `h2h-key-${team1Key}-${team2Key}`;
    const cached = freeStatsCache.get<HeadToHead>(cacheKey);
    if (cached) {
      apiUsageTracker.record("cache", "getHeadToHeadByKey", true, true);
      return cached;
    }
    if (espnClient.isConfigured()) {
      const h2h = await espnClient.getHeadToHeadByKey(team1Key, team2Key, limit);
      apiUsageTracker.record("ESPN", "getHeadToHeadByKey", !!h2h, false);
      if (h2h) {
        freeStatsCache.set(cacheKey, h2h, "headToHead");
        return h2h;
      }
    }
    return null;
  }

  /**
   * Get team stats by name.
   * Tries ESPN first (CBB, free), then API-Sports.io.
   */
  async getTeamStats(teamName: string): Promise<TeamStats | null> {
    const cacheKey = `team-stats-${teamName.toLowerCase()}`;

    const cached = freeStatsCache.get<TeamStats>(cacheKey);
    if (cached) {
      apiUsageTracker.record("cache", "getTeamStats", true, true);
      return cached;
    }

    try {
      // Try ESPN first (free, no key, CBB)
      if (espnClient.isConfigured()) {
        const stats = await espnClient.getTeamStats(teamName);
        apiUsageTracker.record("ESPN", "getTeamStats", !!stats, false);
        if (stats) {
          freeStatsCache.set(cacheKey, stats, "teamStats");
          return stats;
        }
      }

      // Fallback: API-Sports.io
      if (this.apisportsClient.isConfigured()) {
        const searchResult = await this.apisportsClient.searchTeams(teamName);
        apiUsageTracker.record("API-Sports.io", "searchTeams", searchResult.success, false);
        
        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          const team = searchResult.data[0];
          
          // Get team games to calculate stats
          const gamesResult = await this.apisportsClient.getTeamGames(team.id, 2024);
          apiUsageTracker.record("API-Sports.io", "getTeamGames", gamesResult.success, false);
          
          if (gamesResult.success && gamesResult.data) {
            const games = gamesResult.data;
            
            // Calculate stats from games
            const completedGames = games.filter(g => 
              g.status.short === "FT" && g.scores.home?.total !== undefined && g.scores.away?.total !== undefined
            );
            
            if (completedGames.length > 0) {
              let totalPoints = 0;
              let totalOppPoints = 0;
              let wins = 0;
              let losses = 0;
              
              for (const game of completedGames) {
                const isHome = game.teams.home.id === team.id;
                const teamScore = isHome ? game.scores.home?.total || 0 : game.scores.away?.total || 0;
                const oppScore = isHome ? game.scores.away?.total || 0 : game.scores.home?.total || 0;
                
                totalPoints += teamScore;
                totalOppPoints += oppScore;
                
                if (teamScore > oppScore) wins++;
                else losses++;
              }
              
              const gamesCount = completedGames.length;
              const pointsPerGame = totalPoints / gamesCount;
              const pointsAllowedPerGame = totalOppPoints / gamesCount;
              
              // Get recent games
              const recentGames = completedGames.slice(0, 10).map(g => this.mapAPISportsGameToGameResult(g, team.id));
              
              const teamStats: TeamStats = {
                id: team.id,
                name: team.name,
                code: team.code || team.name.substring(0, 3).toUpperCase(),
                logo: team.logo,
                wins,
                losses,
                pointsPerGame: Math.round(pointsPerGame * 100) / 100,
                pointsAllowedPerGame: Math.round(pointsAllowedPerGame * 100) / 100,
                recentGames,
                
                // Note: Four Factors would need detailed box score data
                // For now, we'll need to fetch from another source or calculate if available
              };
              
              // Cache the result
              freeStatsCache.set(cacheKey, teamStats, "teamStats");
              
              return teamStats;
            }
          }
        }
      }
      
      // Fallback: Try SportSRC (may have limited stats)
      // Note: SportSRC may not have detailed stats, so this is a last resort
      
      return null;
    } catch (error) {
      console.error(`Error fetching team stats for ${teamName}:`, error);
      return null;
    }
  }

  /**
   * Get recent games for a team. ESPN first, then API-Sports.io.
   */
  async getRecentGames(teamName: string, limit: number = 10): Promise<GameResult[]> {
    const cacheKey = `recent-games-${teamName.toLowerCase()}-${limit}`;

    const cached = freeStatsCache.get<GameResult[]>(cacheKey);
    if (cached) {
      apiUsageTracker.record("cache", "getRecentGames", true, true);
      return cached;
    }

    try {
      if (espnClient.isConfigured()) {
        const games = await espnClient.getRecentGames(teamName, limit);
        apiUsageTracker.record("ESPN", "getRecentGames", true, false);
        if (games.length > 0) {
          freeStatsCache.set(cacheKey, games, "gameResults");
          return games;
        }
      }

      if (this.apisportsClient.isConfigured()) {
        const searchResult = await this.apisportsClient.searchTeams(teamName);
        apiUsageTracker.record("API-Sports.io", "searchTeams", searchResult.success, false);
        
        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          const team = searchResult.data[0];
          const gamesResult = await this.apisportsClient.getTeamGames(team.id, 2024);
          apiUsageTracker.record("API-Sports.io", "getTeamGames", gamesResult.success, false);
          
          if (gamesResult.success && gamesResult.data) {
            const completedGames = gamesResult.data
              .filter(g => g.status.short === "FT" && g.scores.home?.total !== undefined)
              .slice(0, limit)
              .map(g => this.mapAPISportsGameToGameResult(g, team.id));
            
            freeStatsCache.set(cacheKey, completedGames, "gameResults");
            return completedGames;
          }
        }
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching recent games for ${teamName}:`, error);
      return [];
    }
  }

  /**
   * Get head-to-head history. ESPN first, then API-Sports.io.
   */
  async getHeadToHead(team1: string, team2: string, limit: number = 5): Promise<HeadToHead | null> {
    const cacheKey = `h2h-${team1.toLowerCase()}-${team2.toLowerCase()}`;

    const cached = freeStatsCache.get<HeadToHead>(cacheKey);
    if (cached) {
      apiUsageTracker.record("cache", "getHeadToHead", true, true);
      return cached;
    }

    try {
      if (espnClient.isConfigured()) {
        const h2h = await espnClient.getHeadToHead(team1, team2, limit);
        apiUsageTracker.record("ESPN", "getHeadToHead", !!h2h, false);
        if (h2h) {
          freeStatsCache.set(cacheKey, h2h, "headToHead");
          return h2h;
        }
      }

      if (this.apisportsClient.isConfigured()) {
        const [team1Search, team2Search] = await Promise.all([
          this.apisportsClient.searchTeams(team1),
          this.apisportsClient.searchTeams(team2),
        ]);
        
        apiUsageTracker.record("API-Sports.io", "searchTeams", team1Search.success, false);
        apiUsageTracker.record("API-Sports.io", "searchTeams", team2Search.success, false);
        
        if (team1Search.success && team1Search.data?.[0] && 
            team2Search.success && team2Search.data?.[0]) {
          
          const team1Id = team1Search.data[0].id;
          const team2Id = team2Search.data[0].id;
          
          const h2hResult = await this.apisportsClient.getHeadToHead(team1Id, team2Id, 2024);
          apiUsageTracker.record("API-Sports.io", "getHeadToHead", h2hResult.success, false);
          
          if (h2hResult.success && h2hResult.data) {
            const games = h2hResult.data
              .filter(g => g.status.short === "FT")
              .slice(0, limit)
              .map(g => this.mapAPISportsGameToGameResult(g, team1Id));
            
            let team1Wins = 0;
            let team2Wins = 0;
            
            for (const game of games) {
              if (game.winner === team1Search.data![0].name) {
                team1Wins++;
              } else if (game.winner === team2Search.data![0].name) {
                team2Wins++;
              }
            }
            
            const h2h: HeadToHead = {
              games,
              team1Wins,
              team2Wins,
              awayTeamWins: team1Wins, // Simplified
              homeTeamWins: team2Wins, // Simplified
            };
            
            freeStatsCache.set(cacheKey, h2h, "headToHead");
            return h2h;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error fetching H2H for ${team1} vs ${team2}:`, error);
      return null;
    }
  }

  /**
   * Get schedule for a date. SportSRC first, then ESPN scoreboard.
   */
  async getSchedule(date?: string): Promise<any[]> {
    const dateStr = date || new Date().toISOString().split("T")[0];
    const cacheKey = `schedule-${dateStr}`;

    const cached = freeStatsCache.get<any[]>(cacheKey);
    if (cached) {
      apiUsageTracker.record("cache", "getSchedule", true, true);
      return cached;
    }

    try {
      const scheduleResult = await this.sportsrcClient.getSchedule(dateStr);
      apiUsageTracker.record("SportSRC", "getSchedule", scheduleResult.success, false);
      
      if (scheduleResult.success && scheduleResult.data) {
        const games = scheduleResult.data.games || [];
        freeStatsCache.set(cacheKey, games, "schedules");
        return games;
      }

      if (espnClient.isConfigured()) {
        const espnDate = dateStr.replace(/-/g, "");
        const events = await espnClient.getScoreboard(espnDate);
        apiUsageTracker.record("ESPN", "getSchedule", true, false);
        if (events.length > 0) {
          freeStatsCache.set(cacheKey, events, "schedules");
          return events;
        }
      }

      // Fallback to API-Sports.io
      if (this.apisportsClient.isConfigured()) {
        const gamesResult = await this.apisportsClient.getGamesByDate(dateStr, 12); // League 12 = NCAA
        apiUsageTracker.record("API-Sports.io", "getGamesByDate", gamesResult.success, false);
        
        if (gamesResult.success && gamesResult.data) {
          freeStatsCache.set(cacheKey, gamesResult.data, "schedules");
          return gamesResult.data;
        }
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching schedule for ${dateStr}:`, error);
      return [];
    }
  }

  /**
   * Get live scores. SportSRC first, then ESPN today's scoreboard.
   */
  async getLiveScores(): Promise<any[]> {
    const cacheKey = "live-scores";

    const cached = freeStatsCache.get<any[]>(cacheKey);
    if (cached) {
      apiUsageTracker.record("cache", "getLiveScores", true, true);
      return cached;
    }

    try {
      const liveResult = await this.sportsrcClient.getLiveScores();
      apiUsageTracker.record("SportSRC", "getLiveScores", liveResult.success, false);
      
      if (liveResult.success && liveResult.data) {
        freeStatsCache.set(cacheKey, liveResult.data, "liveScores");
        return liveResult.data;
      }

      if (espnClient.isConfigured()) {
        const events = await espnClient.getLiveScores();
        apiUsageTracker.record("ESPN", "getLiveScores", true, false);
        if (events.length > 0) {
          freeStatsCache.set(cacheKey, events, "liveScores");
          return events;
        }
      }

      if (this.apisportsClient.isConfigured()) {
        const gamesResult = await this.apisportsClient.getLiveGames(12);
        apiUsageTracker.record("API-Sports.io", "getLiveGames", gamesResult.success, false);
        
        if (gamesResult.success && gamesResult.data) {
          freeStatsCache.set(cacheKey, gamesResult.data, "liveScores");
          return gamesResult.data;
        }
      }
      
      return [];
    } catch (error) {
      console.error("Error fetching live scores:", error);
      return [];
    }
  }

  /**
   * Map API-Sports.io game to GameResult format
   */
  private mapAPISportsGameToGameResult(game: any, teamId: number): GameResult {
    const isHome = game.teams.home.id === teamId;
    const homeTeam = game.teams.home.name;
    const awayTeam = game.teams.away.name;
    const homeScore = game.scores.home?.total || 0;
    const awayScore = game.scores.away?.total || 0;
    const winner = homeScore > awayScore ? homeTeam : awayTeam;
    
    return {
      id: game.id,
      date: game.date,
      homeTeam,
      awayTeam,
      homeTeamKey: game.teams.home.code || homeTeam.substring(0, 3).toUpperCase(),
      awayTeamKey: game.teams.away.code || awayTeam.substring(0, 3).toUpperCase(),
      homeScore,
      awayScore,
      winner,
      winnerKey: winner === homeTeam 
        ? (game.teams.home.code || homeTeam.substring(0, 3).toUpperCase())
        : (game.teams.away.code || awayTeam.substring(0, 3).toUpperCase()),
    };
  }
}

// Export singleton instance
export const freeStatsAggregator = new FreeStatsAggregator();
