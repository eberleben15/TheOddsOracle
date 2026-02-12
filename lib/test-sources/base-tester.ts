/**
 * Base Tester Class
 * 
 * Base class for all API source testers
 */

import { TestResult, DataQualityCheck } from "@/scripts/test-helpers";

export interface SourceTestResult {
  source: string;
  dataPoint: string;
  testCase: string;
  success: boolean;
  responseTime: number;
  dataQuality: number; // 0-10
  completeness: number; // 0-10
  reliability: number; // 0-10
  errors: string[];
  sampleData: any;
  notes: string;
  timestamp: string;
}

export interface SourceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  apiKeyEnv?: string;
  rateLimit?: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
}

export abstract class BaseSourceTester {
  protected config: SourceConfig;
  protected testResults: SourceTestResult[] = [];

  constructor(config: SourceConfig) {
    this.config = config;
    
    // Load API key from environment if specified
    if (config.apiKeyEnv && !config.apiKey) {
      this.config.apiKey = process.env[config.apiKeyEnv];
    }
  }

  /**
   * Check if API is configured (has API key if required)
   */
  isConfigured(): boolean {
    if (this.config.apiKeyEnv && !this.config.apiKey) {
      return false;
    }
    return true;
  }

  /**
   * Get API key (with masking for logging)
   */
  protected getApiKey(): string | undefined {
    return this.config.apiKey;
  }

  /**
   * Get masked API key for logging
   */
  protected getMaskedApiKey(): string {
    if (!this.config.apiKey) return "not-set";
    if (this.config.apiKey.length <= 10) return "***";
    return `${this.config.apiKey.substring(0, 4)}...${this.config.apiKey.substring(this.config.apiKey.length - 4)}`;
  }

  /**
   * Test team stats retrieval
   */
  abstract testTeamStats(teamName: string): Promise<SourceTestResult>;

  /**
   * Test recent games retrieval
   */
  abstract testRecentGames(teamName: string, limit?: number): Promise<SourceTestResult>;

  /**
   * Test head-to-head history
   */
  abstract testHeadToHead(team1: string, team2: string): Promise<SourceTestResult>;

  /**
   * Test game schedules
   */
  abstract testSchedules(date?: string): Promise<SourceTestResult>;

  /**
   * Test live scores
   */
  abstract testLiveScores(): Promise<SourceTestResult>;

  /**
   * Test team metadata (team list)
   */
  abstract testTeamMetadata(): Promise<SourceTestResult>;

  /**
   * Test Four Factors availability (or raw data for calculation)
   */
  abstract testFourFactorsData(teamName: string): Promise<SourceTestResult>;

  /**
   * Get all test results
   */
  getTestResults(): SourceTestResult[] {
    return this.testResults;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.testResults = [];
  }

  /**
   * Record a test result
   */
  protected recordResult(result: SourceTestResult): void {
    this.testResults.push(result);
  }

  /**
   * Calculate overall score for this source
   */
  calculateOverallScore(): number {
    if (this.testResults.length === 0) return 0;
    
    const avgQuality = this.testResults.reduce((sum, r) => sum + r.dataQuality, 0) / this.testResults.length;
    const avgCompleteness = this.testResults.reduce((sum, r) => sum + r.completeness, 0) / this.testResults.length;
    const avgReliability = this.testResults.reduce((sum, r) => sum + r.reliability, 0) / this.testResults.length;
    
    // Weighted average: Quality 40%, Completeness 40%, Reliability 20%
    return (avgQuality * 0.4 + avgCompleteness * 0.4 + avgReliability * 0.2);
  }
}
