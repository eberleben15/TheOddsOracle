/**
 * Sportmonks API Tester
 * 
 * Tests Sportmonks Basketball API endpoints
 * Documentation: https://www.sportmonks.com/
 * 
 * Free Plan: ~180 calls/hour per endpoint
 */

import { BaseSourceTester, SourceTestResult, SourceConfig } from "./base-tester";
import { testEndpoint, validateDataQuality, sleep } from "@/scripts/test-helpers";

export class SportmonksTester extends BaseSourceTester {
  constructor() {
    super({
      name: "Sportmonks",
      baseUrl: "https://api.sportmonks.com/v3/core",
      apiKeyEnv: "SPORTMONKS_API_KEY",
      rateLimit: {
        perHour: 180,
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
        notes: "Set SPORTMONKS_API_KEY in environment variables",
        timestamp,
      };
      this.recordResult(testResult);
      return testResult;
    }
    
    try {
      // Sportmonks API structure needs to be verified
      // Try searching for team
      const url = `${this.config.baseUrl}/teams/search/${encodeURIComponent(teamName)}?api_token=${this.getApiKey()}`;
      
      const result = await testEndpoint(url);
      
      await sleep(2000); // Rate limit protection
      
      const quality = result.data ? validateDataQuality(result.data, ["data"]).score : 0;
      const completeness = result.data?.data?.length > 0 ? 7 : 0;
      const reliability = result.success ? 8 : 3;
      
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
        notes: "Sportmonks API structure needs verification - endpoint may vary",
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
    // Similar structure to teamStats
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      return this.createNotConfiguredResult("recentGames", `Fetch recent games for ${teamName}`, timestamp);
    }
    
    try {
      // Sportmonks endpoint structure needs verification
      const url = `${this.config.baseUrl}/fixtures/team/${teamName}?api_token=${this.getApiKey()}`;
      const result = await testEndpoint(url);
      
      await sleep(2000);
      
      const quality = result.data ? validateDataQuality(result.data, ["data"]).score : 0;
      const completeness = result.data?.data?.length > 0 ? 7 : 0;
      const reliability = result.success ? 7 : 3;
      
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
        notes: "Sportmonks API structure needs verification",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      return this.createErrorResult("recentGames", `Fetch recent games for ${teamName}`, error, startTime, timestamp);
    }
  }

  async testHeadToHead(team1: string, team2: string): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      return this.createNotConfiguredResult("headToHead", `Fetch H2H for ${team1} vs ${team2}`, timestamp);
    }
    
    try {
      // Sportmonks H2H endpoint needs verification
      const url = `${this.config.baseUrl}/fixtures/head-to-head/${team1}/${team2}?api_token=${this.getApiKey()}`;
      const result = await testEndpoint(url);
      
      await sleep(2000);
      
      const quality = result.data ? validateDataQuality(result.data, ["data"]).score : 0;
      const completeness = result.data?.data?.length > 0 ? 6 : 0;
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
        notes: "Sportmonks H2H endpoint needs verification",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      return this.createErrorResult("headToHead", `Fetch H2H for ${team1} vs ${team2}`, error, startTime, timestamp);
    }
  }

  async testSchedules(date?: string): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      return this.createNotConfiguredResult("schedules", `Fetch schedule for ${date || "today"}`, timestamp);
    }
    
    try {
      const dateStr = date || new Date().toISOString().split('T')[0];
      const url = `${this.config.baseUrl}/fixtures/date/${dateStr}?api_token=${this.getApiKey()}`;
      const result = await testEndpoint(url);
      
      await sleep(2000);
      
      const quality = result.data ? validateDataQuality(result.data, ["data"]).score : 0;
      const completeness = result.data?.data?.length > 0 ? 7 : 0;
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
        sampleData: result.data,
        notes: "Sportmonks schedule endpoint needs verification",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      return this.createErrorResult("schedules", `Fetch schedule for ${date || "today"}`, error, startTime, timestamp);
    }
  }

  async testLiveScores(): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      return this.createNotConfiguredResult("liveScores", "Fetch live scores", timestamp);
    }
    
    try {
      const url = `${this.config.baseUrl}/livescores?api_token=${this.getApiKey()}`;
      const result = await testEndpoint(url);
      
      await sleep(2000);
      
      const quality = result.data ? validateDataQuality(result.data, ["data"]).score : 0;
      const completeness = result.data?.data?.length >= 0 ? 7 : 0;
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
        sampleData: result.data,
        notes: "Sportmonks live scores endpoint needs verification",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      return this.createErrorResult("liveScores", "Fetch live scores", error, startTime, timestamp);
    }
  }

  async testTeamMetadata(): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      return this.createNotConfiguredResult("teamMetadata", "Fetch team list", timestamp);
    }
    
    try {
      const url = `${this.config.baseUrl}/teams?api_token=${this.getApiKey()}`;
      const result = await testEndpoint(url);
      
      await sleep(2000);
      
      const quality = result.data ? validateDataQuality(result.data, ["data"]).score : 0;
      const completeness = result.data?.data?.length > 0 ? 7 : 0;
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
          teams: result.data?.data?.slice(0, 10) || [],
          totalTeams: result.data?.data?.length || 0,
        },
        notes: "Sportmonks team list endpoint needs verification",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      return this.createErrorResult("teamMetadata", "Fetch team list", error, startTime, timestamp);
    }
  }

  async testFourFactorsData(teamName: string): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      return this.createNotConfiguredResult("fourFactors", `Check Four Factors data for ${teamName}`, timestamp);
    }
    
    try {
      // Sportmonks may have stats endpoints
      const url = `${this.config.baseUrl}/teams/${teamName}/statistics?api_token=${this.getApiKey()}`;
      const result = await testEndpoint(url);
      
      await sleep(2000);
      
      const requiredFields = ["fieldGoalsMade", "fieldGoalsAttempted", "threePointersMade", "turnovers"];
      const quality = result.data ? validateDataQuality(result.data, requiredFields).score : 0;
      const completeness = result.data && quality > 5 ? 5 : 0;
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
        notes: "Sportmonks stats endpoint needs verification - may not have CBB coverage",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      return this.createErrorResult("fourFactors", `Check Four Factors data for ${teamName}`, error, startTime, timestamp);
    }
  }

  private createNotConfiguredResult(dataPoint: string, testCase: string, timestamp: string): SourceTestResult {
    const result: SourceTestResult = {
      source: this.config.name,
      dataPoint,
      testCase,
      success: false,
      responseTime: 0,
      dataQuality: 0,
      completeness: 0,
      reliability: 0,
      errors: ["API key not configured"],
      sampleData: null,
      notes: `Set ${this.config.apiKeyEnv} in environment variables`,
      timestamp,
    };
    this.recordResult(result);
    return result;
  }

  private createErrorResult(
    dataPoint: string,
    testCase: string,
    error: unknown,
    startTime: number,
    timestamp: string
  ): SourceTestResult {
    const result: SourceTestResult = {
      source: this.config.name,
      dataPoint,
      testCase,
      success: false,
      responseTime: Date.now() - startTime,
      dataQuality: 0,
      completeness: 0,
      reliability: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      sampleData: null,
      notes: "Error during test",
      timestamp,
    };
    this.recordResult(result);
    return result;
  }
}
