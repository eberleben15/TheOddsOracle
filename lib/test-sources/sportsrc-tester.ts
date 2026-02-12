/**
 * SportSRC API Tester
 * 
 * Tests SportSRC API endpoints for college basketball data
 * Documentation: https://www.sportsrc.org/
 * 
 * Note: SportSRC is free forever, no API key required
 */

import { BaseSourceTester, SourceTestResult, SourceConfig } from "./base-tester";
import { testEndpoint, validateDataQuality, sleep } from "@/scripts/test-helpers";

export class SportSRCTester extends BaseSourceTester {
  constructor() {
    super({
      name: "SportSRC",
      baseUrl: "https://www.sportsrc.org/api",
      // No API key needed
    });
  }

  async testTeamStats(teamName: string): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    try {
      // SportSRC API structure is unknown - try common patterns
      // Note: SportSRC may not have a public API or may require different endpoints
      // Try multiple endpoint patterns
      const endpoints = [
        `${this.config.baseUrl}/basketball/teams?name=${encodeURIComponent(teamName)}`,
        `${this.config.baseUrl}/api/basketball/teams?name=${encodeURIComponent(teamName)}`,
        `${this.config.baseUrl}/teams?sport=basketball&name=${encodeURIComponent(teamName)}`,
      ];
      
      let result;
      let lastError;
      
      for (const url of endpoints) {
        result = await testEndpoint(url);
        if (result.success && result.data) {
          break;
        }
        lastError = result.error;
        await sleep(500);
      }
      
      if (!result) {
        result = { success: false, responseTime: 0, error: "All endpoints failed" };
      }
      
      const quality = result.data ? validateDataQuality(result.data, ["name", "id"]).score : 0;
      const completeness = result.data ? (result.data.teams?.length > 0 ? 8 : 0) : 0;
      const reliability = result.success ? 9 : 3;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "teamStats",
        testCase: `Fetch team stats for ${teamName}`,
        success: result.success && completeness > 0,
        responseTime: result.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: result.error ? [result.error] : [],
        sampleData: result.data,
        notes: `SportSRC API endpoints may not exist or require different structure. Response: ${JSON.stringify(result.data || result.error).substring(0, 200)}`,
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
    
    try {
      // Try to fetch recent games
      // Note: Actual endpoint structure needs to be verified
      const url = `${this.config.baseUrl}/basketball/games?team=${encodeURIComponent(teamName)}&limit=${limit}`;
      
      const result = await testEndpoint(url);
      
      const quality = result.data ? validateDataQuality(result.data, ["games", "date", "score"]).score : 0;
      const completeness = result.data?.games?.length > 0 ? 7 : 0;
      const reliability = result.success ? 8 : 3;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "recentGames",
        testCase: `Fetch recent games for ${teamName}`,
        success: result.success && completeness > 0,
        responseTime: result.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: result.error ? [result.error] : [],
        sampleData: result.data,
        notes: "SportSRC should have game data - verify endpoint structure",
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
    
    try {
      const url = `${this.config.baseUrl}/basketball/games?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`;
      
      const result = await testEndpoint(url);
      
      const quality = result.data ? validateDataQuality(result.data, ["games"]).score : 0;
      const completeness = result.data?.games?.length > 0 ? 6 : 0;
      const reliability = result.success ? 7 : 3;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "headToHead",
        testCase: `Fetch H2H for ${team1} vs ${team2}`,
        success: result.success && completeness > 0,
        responseTime: result.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: result.error ? [result.error] : [],
        sampleData: result.data,
        notes: "SportSRC may not have H2H endpoint - verify availability",
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
    
    try {
      const dateStr = date || new Date().toISOString().split('T')[0];
      const url = `${this.config.baseUrl}/basketball/schedule?date=${dateStr}`;
      
      const result = await testEndpoint(url);
      
      const quality = result.data ? validateDataQuality(result.data, ["games", "date"]).score : 0;
      const completeness = result.data?.games?.length > 0 ? 9 : 0;
      const reliability = result.success ? 9 : 3;
      
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
        sampleData: result.data,
        notes: "SportSRC should excel at schedules - this is their strength",
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
    
    try {
      const url = `${this.config.baseUrl}/basketball/live`;
      
      const result = await testEndpoint(url);
      
      const quality = result.data ? validateDataQuality(result.data, ["games", "scores"]).score : 0;
      const completeness = result.data?.games?.length >= 0 ? 8 : 0; // 0 games is still valid
      const reliability = result.success ? 8 : 3;
      
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
        sampleData: result.data,
        notes: "SportSRC should excel at live scores - this is their strength",
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
    
    try {
      const url = `${this.config.baseUrl}/basketball/teams`;
      
      const result = await testEndpoint(url);
      
      const quality = result.data ? validateDataQuality(result.data, ["teams"]).score : 0;
      const completeness = result.data?.teams?.length > 0 ? 7 : 0;
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
        sampleData: result.data,
        notes: "SportSRC should have team metadata",
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
    
    try {
      // SportSRC likely doesn't have Four Factors directly
      // Check if they have raw stats needed to calculate
      const url = `${this.config.baseUrl}/basketball/teams/${encodeURIComponent(teamName)}/stats`;
      
      const result = await testEndpoint(url);
      
      // Check for raw stats needed: FGM, FGA, 3PM, TOV, ORB, FTA
      const requiredFields = ["fieldGoalsMade", "fieldGoalsAttempted", "threePointersMade", "turnovers", "offensiveRebounds", "freeThrowsAttempted"];
      const quality = result.data ? validateDataQuality(result.data, requiredFields).score : 0;
      const completeness = result.data && quality > 5 ? 5 : 0; // Low completeness - SportSRC likely doesn't have this
      const reliability = result.success ? 6 : 0;
      
      const testResult: SourceTestResult = {
        source: this.config.name,
        dataPoint: "fourFactors",
        testCase: `Check Four Factors data for ${teamName}`,
        success: result.success && completeness > 0,
        responseTime: result.responseTime,
        dataQuality: quality,
        completeness,
        reliability,
        errors: result.error ? [result.error] : [],
        sampleData: result.data,
        notes: "SportSRC likely doesn't have Four Factors or raw stats - this is expected",
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
        notes: "SportSRC likely doesn't have Four Factors data",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    }
  }
}
