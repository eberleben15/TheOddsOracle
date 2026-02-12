/**
 * EntitySports API Tester
 * 
 * Tests EntitySports API endpoints
 * Documentation: https://www.entitysport.com/
 * 
 * Note: May require paid plan - test free tier availability
 */

import { BaseSourceTester, SourceTestResult, SourceConfig } from "./base-tester";
import { testEndpoint, validateDataQuality, sleep } from "@/scripts/test-helpers";

export class EntitySportsTester extends BaseSourceTester {
  constructor() {
    super({
      name: "EntitySports",
      baseUrl: "https://rest.entitysport.com/v2",
      apiKeyEnv: "ENTITYSPORTS_API_KEY",
    });
  }

  async testTeamStats(teamName: string): Promise<SourceTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    if (!this.isConfigured()) {
      return this.createNotConfiguredResult("teamStats", `Fetch team stats for ${teamName}`, timestamp);
    }
    
    try {
      // EntitySports API structure needs verification
      const url = `${this.config.baseUrl}/teams?token=${this.getApiKey()}&q=${encodeURIComponent(teamName)}`;
      const result = await testEndpoint(url);
      
      await sleep(1000);
      
      const quality = result.data ? validateDataQuality(result.data, ["response"]).score : 0;
      const completeness = result.data?.response?.items?.length > 0 ? 7 : 0;
      const reliability = result.success ? 7 : 3;
      
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
        notes: "EntitySports API structure needs verification - may require paid plan",
        timestamp,
      };
      
      this.recordResult(testResult);
      return testResult;
    } catch (error) {
      return this.createErrorResult("teamStats", `Fetch team stats for ${teamName}`, error, startTime, timestamp);
    }
  }

  async testRecentGames(teamName: string, limit: number = 5): Promise<SourceTestResult> {
    return this.createNotImplementedResult("recentGames", `Fetch recent games for ${teamName}`);
  }

  async testHeadToHead(team1: string, team2: string): Promise<SourceTestResult> {
    return this.createNotImplementedResult("headToHead", `Fetch H2H for ${team1} vs ${team2}`);
  }

  async testSchedules(date?: string): Promise<SourceTestResult> {
    return this.createNotImplementedResult("schedules", `Fetch schedule for ${date || "today"}`);
  }

  async testLiveScores(): Promise<SourceTestResult> {
    return this.createNotImplementedResult("liveScores", "Fetch live scores");
  }

  async testTeamMetadata(): Promise<SourceTestResult> {
    return this.createNotImplementedResult("teamMetadata", "Fetch team list");
  }

  async testFourFactorsData(teamName: string): Promise<SourceTestResult> {
    return this.createNotImplementedResult("fourFactors", `Check Four Factors data for ${teamName}`);
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

  private createNotImplementedResult(dataPoint: string, testCase: string): SourceTestResult {
    const result: SourceTestResult = {
      source: this.config.name,
      dataPoint,
      testCase,
      success: false,
      responseTime: 0,
      dataQuality: 0,
      completeness: 0,
      reliability: 0,
      errors: ["Not implemented - API structure needs verification"],
      sampleData: null,
      notes: "EntitySports API endpoints need to be verified and implemented",
      timestamp: new Date().toISOString(),
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
