/**
 * API-Sports.io Tester
 * 
 * Tests API-Sports.io Basketball API endpoints
 * Documentation: https://api-sports.io/documentation/basketball
 * 
 * Free Tier: 100 requests/day
 */

import { BaseSourceTester, SourceTestResult, SourceConfig } from "./base-tester";
import { testEndpoint, validateDataQuality, sleep } from "@/scripts/test-helpers";

export class APISportsTester extends BaseSourceTester {
  constructor() {
    super({
      name: "API-Sports.io",
      baseUrl: "https://v1.basketball.api-sports.io",
      apiKeyEnv: "STATS_API_KEY", // Use existing env var name
      rateLimit: {
        perDay: 100, // Free tier limit
      },
    });
  }

  async testTeamStats(teamName: string): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "teamStats",
        testCase: `Fetch team stats for ${teamName}`,
        success: false,
        responseTime: 0,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: ["API key not configured"],
        sampleData: null,
        notes: "Set STATS_API_KEY in environment variables",
        timestamp,
      };
      this.recordResult(testResult);
      return testResult;
    }
    
    try {
      // Calculate current season (NCAA season runs Nov-Apr, season = ending year)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const season = month >= 10 ? year + 1 : year; // Nov/Dec = next year's season
      
      // Search WITHOUT league parameter (like existing code does)
      // API-Sports.io requires season when using league, but we search broadly first
      const searchUrl = `${this.config.baseUrl}/teams?search=${encodeURIComponent(teamName)}`;
      const searchResult = await testEndpoint(searchUrl, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      
      await sleep(1000);
      
      let teamId: number | null = null;
      
      if (searchResult.success && searchResult.data?.response) {
        // Filter to USA men's teams only (like existing code does)
        const usaTeams = searchResult.data.response.filter((t: any) => {
          const country = t.country?.code || t.country?.name || "";
          const apiName = (t.name || "").toLowerCase();
          return (country === "US" || country === "USA") && !apiName.endsWith(" w");
        });
        
        if (usaTeams.length > 0) {
          // Try exact match first
          const teamNameLower = teamName.toLowerCase();
          const exactMatch = usaTeams.find((t: any) => 
            t.name.toLowerCase() === teamNameLower
          );
          
          teamId = exactMatch?.id || usaTeams[0].id;
        }
      }
      
      if (!teamId) {
        const testResult: SourceTestResult = {
          source: this.config.name,
          dataPoint: "teamStats",
          testCase: `Fetch team stats for ${teamName}`,
          success: false,
          responseTime: searchResult.responseTime,
          dataQuality: 0,
          completeness: 0,
          reliability: 3,
          errors: searchResult.error ? [searchResult.error] : ["Team not found"],
          sampleData: searchResult.data,
          notes: `Team search failed. API returned: ${JSON.stringify(searchResult.data).substring(0, 200)}`,
          timestamp,
        };
        this.recordResult(testResult);
        return testResult;
      }
      
      // Get team stats (may need to fetch games and calculate)
      // API-Sports.io may not have direct team stats endpoint for CBB
      // Try fetching games and calculating stats
      const gamesUrl = `${this.config.baseUrl}/games?team=${teamId}&season=${season}`;
      const gamesResult = await testEndpoint(gamesUrl, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      
      const quality = gamesResult.data ? validateDataQuality(gamesResult.data, ["response"]).score : 0;
      const completeness = gamesResult.data?.response?.length > 0 ? 7 : 0;
      const reliability = gamesResult.success ? 8 : 3;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "teamStats",
        testCase: `Fetch team stats for ${teamName}`,
        success: gamesResult.success && completeness > 0,
        responseTime: searchResult.responseTime + gamesResult.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: gamesResult.error ? [gamesResult.error] : [],
        sampleData: {
          team: searchResult.data.response[0],
          games: gamesResult.data?.response || [],
        },
        notes: "API-Sports.io provides games data - stats need to be calculated from games",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "teamStats",
        testCase: `Fetch team stats for ${teamName}`,
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        sampleData: null,
        notes: "Error testing team stats",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    }
  }

  async testRecentGames(teamName: string, limit: number = 5): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "recentGames",
        testCase: `Fetch recent games for ${teamName}`,
        success: false,
        responseTime: 0,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: ["API key not configured"],
        sampleData: null,
        notes: "Set STATS_API_KEY in environment variables",
        timestamp,
      };
      this.recordResult(testResult);
      return testResult;
    }
    
    try {
      // Calculate current season
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const season = month >= 10 ? year + 1 : year;
      
      // Search WITHOUT league parameter (like existing code)
      const searchUrl = `${this.config.baseUrl}/teams?search=${encodeURIComponent(teamName)}`;
      const searchResult = await testEndpoint(searchUrl, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      await sleep(1000);
      
      let teamId: number | null = null;
      
      if (searchResult.success && searchResult.data?.response) {
        // Filter to USA men's teams only
        const usaTeams = searchResult.data.response.filter((t: any) => {
          const country = t.country?.code || t.country?.name || "";
          const apiName = (t.name || "").toLowerCase();
          return (country === "US" || country === "USA") && !apiName.endsWith(" w");
        });
        
        if (usaTeams.length > 0) {
          const teamNameLower = teamName.toLowerCase();
          const exactMatch = usaTeams.find((t: any) => 
            t.name.toLowerCase() === teamNameLower
          );
          teamId = exactMatch?.id || usaTeams[0].id;
        }
      }
      
      if (!teamId) {
        const testResult: SourceTestResult = {
          source: this.config.name,
          dataPoint: "recentGames",
          testCase: `Fetch recent games for ${teamName}`,
          success: false,
          responseTime: searchResult.responseTime,
          dataQuality: 0,
          completeness: 0,
          reliability: 3,
          errors: ["Team not found"],
          sampleData: searchResult.data,
          notes: `Team search failed. Response: ${JSON.stringify(searchResult.data || {}).substring(0, 200)}`,
          timestamp,
        };
        this.recordResult(testResult);
        return testResult;
      }
      
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 90);
      const dateStr = dateFrom.toISOString().split('T')[0];
      
      const gamesUrl = `${this.config.baseUrl}/games?team=${teamId}&season=${season}&league=12`;
      const gamesResult = await testEndpoint(gamesUrl, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      
      const games = gamesResult.data?.response || [];
      const recentGames = games.slice(0, limit);
      
      const quality = gamesResult.data ? validateDataQuality(gamesResult.data, ["response"]).score : 0;
      const completeness = recentGames.length > 0 ? 8 : 0;
      const reliability = gamesResult.success ? 8 : 3;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "recentGames",
        testCase: `Fetch recent games for ${teamName}`,
        success: gamesResult.success && completeness > 0,
        responseTime: searchResult.responseTime + gamesResult.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: gamesResult.error ? [gamesResult.error] : [],
        sampleData: {
          team: searchResult.data?.response?.find((t: any) => t.id === teamId) || null,
          games: recentGames,
        },
        notes: `Found ${games.length} total games, returning ${recentGames.length} recent`,
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "recentGames",
        testCase: `Fetch recent games for ${teamName}`,
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        sampleData: null,
        notes: "Error testing recent games",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    }
  }

  async testHeadToHead(team1: string, team2: string): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "headToHead",
        testCase: `Fetch H2H for ${team1} vs ${team2}`,
        success: false,
        responseTime: 0,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: ["API key not configured"],
        sampleData: null,
        notes: "Set STATS_API_KEY in environment variables",
        timestamp,
      };
      this.recordResult(testResult);
      return testResult;
    }
    
    try {
      // Calculate current season
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const season = month >= 10 ? year + 1 : year;
      
      // Search for both teams WITHOUT league parameter
      const [team1Search, team2Search] = await Promise.all([
        testEndpoint(`${this.config.baseUrl}/teams?search=${encodeURIComponent(team1)}`, {
          headers: { "x-apisports-key": this.getApiKey()! },
        }),
        testEndpoint(`${this.config.baseUrl}/teams?search=${encodeURIComponent(team2)}`, {
          headers: { "x-apisports-key": this.getApiKey()! },
        }),
      ]);
      
      await sleep(1000);
      
      let team1Id: number | null = null;
      let team2Id: number | null = null;
      
      // Filter to USA men's teams
      if (team1Search.success && team1Search.data?.response) {
        const usaTeams = team1Search.data.response.filter((t: any) => {
          const country = t.country?.code || t.country?.name || "";
          const apiName = (t.name || "").toLowerCase();
          return (country === "US" || country === "USA") && !apiName.endsWith(" w");
        });
        if (usaTeams.length > 0) {
          const team1Lower = team1.toLowerCase();
          const exactMatch = usaTeams.find((t: any) => t.name.toLowerCase() === team1Lower);
          team1Id = exactMatch?.id || usaTeams[0].id;
        }
      }
      
      if (team2Search.success && team2Search.data?.response) {
        const usaTeams = team2Search.data.response.filter((t: any) => {
          const country = t.country?.code || t.country?.name || "";
          const apiName = (t.name || "").toLowerCase();
          return (country === "US" || country === "USA") && !apiName.endsWith(" w");
        });
        if (usaTeams.length > 0) {
          const team2Lower = team2.toLowerCase();
          const exactMatch = usaTeams.find((t: any) => t.name.toLowerCase() === team2Lower);
          team2Id = exactMatch?.id || usaTeams[0].id;
        }
      }
      
      if (!team1Id || !team2Id) {
        const testResult: SourceTestResult = {
          source: this.config.name,
          dataPoint: "headToHead",
          testCase: `Fetch H2H for ${team1} vs ${team2}`,
          success: false,
          responseTime: team1Search.responseTime + team2Search.responseTime,
          dataQuality: 0,
          completeness: 0,
          reliability: 3,
          errors: [!team1Id ? `${team1} not found` : "", !team2Id ? `${team2} not found` : ""].filter(Boolean),
          sampleData: {
            team1Search: team1Search.data,
            team2Search: team2Search.data,
          },
          notes: `One or both teams not found. Team1 results: ${JSON.stringify(team1Search.data || {}).substring(0, 200)}`,
          timestamp,
        };
        this.recordResult(testResult);
        return testResult;
      }
      
      // Season already calculated above, reuse it
      // Use league=12 for games query (not for team search)
      const h2hUrl = `${this.config.baseUrl}/games?h2h=${team1Id}-${team2Id}&season=${season}&league=12`;
      const h2hResult = await testEndpoint(h2hUrl, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      
      const games = h2hResult.data?.response || [];
      const quality = h2hResult.data ? validateDataQuality(h2hResult.data, ["response"]).score : 0;
      const completeness = games.length > 0 ? 8 : 0;
      const reliability = h2hResult.success ? 8 : 3;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "headToHead",
        testCase: `Fetch H2H for ${team1} vs ${team2}`,
        success: h2hResult.success && completeness > 0,
        responseTime: team1Search.responseTime + team2Search.responseTime + h2hResult.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: h2hResult.error ? [h2hResult.error] : [],
        sampleData: {
          team1: team1Search.data?.response?.find((t: any) => t.id === team1Id) || null,
          team2: team2Search.data?.response?.find((t: any) => t.id === team2Id) || null,
          games,
        },
        notes: `Found ${games.length} H2H games`,
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "headToHead",
        testCase: `Fetch H2H for ${team1} vs ${team2}`,
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        sampleData: null,
        notes: "Error testing H2H",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    }
  }

  async testSchedules(date?: string): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "schedules",
        testCase: `Fetch schedule for ${date || "today"}`,
        success: false,
        responseTime: 0,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: ["API key not configured"],
        sampleData: null,
        notes: "Set STATS_API_KEY in environment variables",
        timestamp,
      };
      this.recordResult(testResult);
      return testResult;
    }
    
    try {
      const dateStr = date || new Date().toISOString().split('T')[0];
      const url = `${this.config.baseUrl}/games?date=${dateStr}&league=12`; // League 12 = NCAA
      
      const result = await testEndpoint(url, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      
      const games = result.data?.response || [];
      const quality = result.data ? validateDataQuality(result.data, ["response"]).score : 0;
      const completeness = games.length > 0 ? 7 : 0;
      const reliability = result.success ? 8 : 3;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "schedules",
        testCase: `Fetch schedule for ${dateStr}`,
        success: result.success && completeness > 0,
        responseTime: result.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: result.error ? [result.error] : [],
        sampleData: {
          date: dateStr,
          games,
        },
        notes: `Found ${games.length} games for ${dateStr}`,
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "schedules",
        testCase: `Fetch schedule for ${date || "today"}`,
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        sampleData: null,
        notes: "Error testing schedules",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    }
  }

  async testLiveScores(): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "liveScores",
        testCase: "Fetch live scores",
        success: false,
        responseTime: 0,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: ["API key not configured"],
        sampleData: null,
        notes: "Set STATS_API_KEY in environment variables",
        timestamp,
      };
      this.recordResult(testResult);
      return testResult;
    }
    
    try {
      const url = `${this.config.baseUrl}/games?live=all&league=12`;
      
      const result = await testEndpoint(url, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      
      const games = result.data?.response || [];
      const quality = result.data ? validateDataQuality(result.data, ["response"]).score : 0;
      const completeness = games.length >= 0 ? 7 : 0; // 0 games is still valid
      const reliability = result.success ? 7 : 3;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "liveScores",
        testCase: "Fetch live scores",
        success: result.success,
        responseTime: result.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: result.error ? [result.error] : [],
        sampleData: {
          liveGames: games,
        },
        notes: `Found ${games.length} live games`,
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "liveScores",
        testCase: "Fetch live scores",
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        sampleData: null,
        notes: "Error testing live scores",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    }
  }

  async testTeamMetadata(): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "teamMetadata",
        testCase: "Fetch team list",
        success: false,
        responseTime: 0,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: ["API key not configured"],
        sampleData: null,
        notes: "Set STATS_API_KEY in environment variables",
        timestamp,
      };
      this.recordResult(testResult);
      return testResult;
    }
    
    try {
      const url = `${this.config.baseUrl}/teams?league=12`; // League 12 = NCAA
      
      const result = await testEndpoint(url, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      
      const teams = result.data?.response || [];
      const quality = result.data ? validateDataQuality(result.data, ["response"]).score : 0;
      const completeness = teams.length > 0 ? 8 : 0;
      const reliability = result.success ? 8 : 3;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "teamMetadata",
        testCase: "Fetch team list",
        success: result.success && completeness > 0,
        responseTime: result.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: result.error ? [result.error] : [],
        sampleData: {
          teams: teams.slice(0, 10), // Sample first 10 teams
          totalTeams: teams.length,
        },
        notes: `Found ${teams.length} teams`,
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "teamMetadata",
        testCase: "Fetch team list",
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        sampleData: null,
        notes: "Error testing team metadata",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    }
  }

  async testFourFactorsData(teamName: string): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "fourFactors",
        testCase: `Check Four Factors data for ${teamName}`,
        success: false,
        responseTime: 0,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: ["API key not configured"],
        sampleData: null,
        notes: "Set STATS_API_KEY in environment variables",
        timestamp,
      };
      this.recordResult(testResult);
      return testResult;
    }
    
    try {
      // API-Sports.io likely doesn't have Four Factors directly
      // Check if they have raw stats in game data
      const searchUrl = `${this.config.baseUrl}/teams?search=${encodeURIComponent(teamName)}`;
      const searchResult = await testEndpoint(searchUrl, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      
      await sleep(1000);
      
      if (!searchResult.success || !searchResult.data?.response?.[0]) {
        const testResult: SourceTestResult = {
          source: this.config.name,
          dataPoint: "fourFactors",
          testCase: `Check Four Factors data for ${teamName}`,
          success: false,
          responseTime: searchResult.responseTime,
          dataQuality: 0,
          completeness: 0,
          reliability: 0,
          errors: ["Team not found"],
          sampleData: null,
          notes: "Team search failed",
          timestamp,
        };
        this.recordResult(testResult);
        return testResult;
      }
      
      // Check if game data has detailed stats
      const teamId = searchResult.data.response[0].id;
      // Calculate current season
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const season = month >= 10 ? year + 1 : year;
      
      const gamesUrl = `${this.config.baseUrl}/games?team=${teamId}&season=${season}&league=12`;
      const gamesResult = await testEndpoint(gamesUrl, {
        headers: {
          "x-apisports-key": this.getApiKey()!,
        },
      });
      
      // Check if game data includes detailed stats needed for Four Factors
      // API-Sports.io may have box score endpoints, but they're likely paid
      const firstGame = gamesResult.data?.response?.[0];
      const hasDetailedStats = firstGame?.scores?.home?.total !== undefined;
      
      // Note: Four Factors require detailed box score stats (FGM, FGA, 3PM, TOV, ORB, FTA)
      // These are typically only available in paid tiers or separate box score endpoints
      
      const quality = hasDetailedStats ? 5 : 0; // Partial - would need box score data
      const completeness = hasDetailedStats ? 4 : 0; // Low - API-Sports.io may not have detailed box scores
      const reliability = gamesResult.success ? 6 : 0;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "fourFactors",
        testCase: `Check Four Factors data for ${teamName}`,
        success: gamesResult.success && hasDetailedStats,
        responseTime: searchResult.responseTime + gamesResult.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: gamesResult.error ? [gamesResult.error] : [],
        sampleData: {
          team: searchResult.data.response[0],
          sampleGame: firstGame,
        },
        notes: "API-Sports.io may not have detailed box score stats needed for Four Factors calculation",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "fourFactors",
        testCase: `Check Four Factors data for ${teamName}`,
        success: false,
        responseTime: Date.now() - startTime,
        dataQuality: 0,
        completeness: 0,
        reliability: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        sampleData: null,
        notes: "Error testing Four Factors data",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    }
  }
}
