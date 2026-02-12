/**
 * Test Helpers
 * 
 * Shared utilities and validators for testing data sources
 */

import * as dotenv from "dotenv";
import { existsSync } from "fs";

// Load environment variables
const envPaths = [".env.local", ".env", ".env.development"];
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

export interface TestResult {
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  data?: any;
  dataSize?: number;
}

export interface DataQualityCheck {
  hasRequiredFields: boolean;
  missingFields: string[];
  dataTypesValid: boolean;
  hasNullValues: boolean;
  nullFields: string[];
  score: number; // 0-10
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; time: number }> {
  const start = Date.now();
  const result = await fn();
  const time = Date.now() - start;
  return { result, time };
}

/**
 * Test an API endpoint with error handling
 */
export async function testEndpoint(
  url: string,
  options: RequestInit = {}
): Promise<TestResult> {
  try {
    const { result, time } = await measureTime(async () => {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
      
      const statusCode = response.status;
      let data: any = null;
      let error: string | undefined;
      
      try {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            // Not JSON, return as text
            data = text;
          }
        }
      } catch (e) {
        error = `Failed to parse response: ${e instanceof Error ? e.message : String(e)}`;
      }
      
      return {
        success: response.ok,
        statusCode,
        data,
        dataSize: JSON.stringify(data).length,
        error,
      };
    });
    
    return {
      success: result.success,
      responseTime: time,
      statusCode: result.statusCode,
      data: result.data,
      dataSize: result.dataSize,
      error: result.error,
    };
  } catch (error) {
    return {
      success: false,
      responseTime: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Validate data quality against required fields
 */
export function validateDataQuality(
  data: any,
  requiredFields: string[]
): DataQualityCheck {
  const missingFields: string[] = [];
  const nullFields: string[] = [];
  let dataTypesValid = true;
  
  // Check for required fields
  for (const field of requiredFields) {
    if (!(field in data) || data[field] === undefined) {
      missingFields.push(field);
    } else if (data[field] === null) {
      nullFields.push(field);
    }
  }
  
  // Basic type validation (can be enhanced)
  // For now, just check that values exist and aren't null
  
  const hasRequiredFields = missingFields.length === 0;
  const hasNullValues = nullFields.length > 0;
  
  // Calculate quality score (0-10)
  let score = 10;
  score -= missingFields.length * 2; // -2 per missing field
  score -= nullFields.length * 1; // -1 per null field
  score = Math.max(0, score);
  
  return {
    hasRequiredFields,
    missingFields,
    dataTypesValid,
    hasNullValues,
    nullFields,
    score,
  };
}

/**
 * Check if a value is within expected range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Normalize team name for comparison
 */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
}

/**
 * Compare two team names (fuzzy matching)
 */
export function compareTeamNames(name1: string, name2: string): boolean {
  const normalized1 = normalizeTeamName(name1);
  const normalized2 = normalizeTeamName(name2);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // One contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  // Check if key words match (e.g., "Michigan" matches "Michigan Wolverines")
  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);
  
  // If all words from shorter name are in longer name
  const shorter = words1.length < words2.length ? words1 : words2;
  const longer = words1.length >= words2.length ? words1 : words2;
  
  return shorter.every(word => longer.some(lw => lw.includes(word) || word.includes(lw)));
}

/**
 * Extract numeric value from string (e.g., "72.5" -> 72.5)
 */
export function extractNumber(value: any): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ""));
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Validate team stats structure
 */
export function validateTeamStats(data: any): DataQualityCheck {
  const requiredFields = [
    "wins",
    "losses",
    "pointsPerGame",
    "pointsAllowedPerGame",
  ];
  
  return validateDataQuality(data, requiredFields);
}

/**
 * Validate game result structure
 */
export function validateGameResult(data: any): DataQualityCheck {
  const requiredFields = [
    "homeTeam",
    "awayTeam",
    "homeScore",
    "awayScore",
    "date",
  ];
  
  return validateDataQuality(data, requiredFields);
}

/**
 * Calculate cache hit rate from test results
 */
export function calculateCacheHitRate(results: TestResult[]): number {
  if (results.length === 0) return 0;
  
  // This would need to be enhanced based on actual cache implementation
  // For now, assume we track cache hits separately
  return 0;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

/**
 * Format milliseconds to human readable
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
