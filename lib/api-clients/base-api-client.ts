/**
 * Base API Client
 * 
 * Base class for all API clients with shared functionality:
 * - Error handling
 * - Retry logic
 * - Rate limiting
 * - Request deduplication
 */

import { fetchWithRetry } from "../retry-utils";

export interface ApiClientConfig {
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  cached?: boolean;
}

export class BaseApiClient {
  protected config: ApiClientConfig;
  private requestQueue: Map<string, Promise<any>> = new Map();
  private callCounts: {
    second: number[];
    minute: number[];
    hour: number[];
    day: number;
  } = {
    second: [],
    minute: [],
    hour: [],
    day: 0,
  };

  constructor(config: ApiClientConfig) {
    this.config = config;
    
    // Load API key from environment if specified
    if (config.apiKeyEnv && !config.apiKey) {
      this.config.apiKey = process.env[config.apiKeyEnv];
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    if (this.config.apiKeyEnv && !this.config.apiKey) {
      return false;
    }
    return true;
  }

  /**
   * Get API key (masked for logging)
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
   * Check rate limits and wait if necessary
   */
  protected async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Clean old entries
    this.callCounts.second = this.callCounts.second.filter(t => now - t < 1000);
    this.callCounts.minute = this.callCounts.minute.filter(t => now - t < 60000);
    this.callCounts.hour = this.callCounts.hour.filter(t => now - t < 3600000);
    
    // Check limits
    if (this.config.rateLimit?.perSecond && this.callCounts.second.length >= this.config.rateLimit.perSecond) {
      const waitTime = 1000 - (now - this.callCounts.second[0]);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    if (this.config.rateLimit?.perMinute && this.callCounts.minute.length >= this.config.rateLimit.perMinute) {
      const waitTime = 60000 - (now - this.callCounts.minute[0]);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    if (this.config.rateLimit?.perHour && this.callCounts.hour.length >= this.config.rateLimit.perHour) {
      const waitTime = 3600000 - (now - this.callCounts.hour[0]);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    if (this.config.rateLimit?.perDay && this.callCounts.day >= this.config.rateLimit.perDay) {
      throw new Error(`Daily rate limit reached for ${this.config.name}`);
    }
    
    // Record call
    const timestamp = Date.now();
    this.callCounts.second.push(timestamp);
    this.callCounts.minute.push(timestamp);
    this.callCounts.hour.push(timestamp);
    this.callCounts.day++;
  }

  /**
   * Make API request with deduplication, rate limiting, and retry logic
   */
  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
    cacheKey?: string
  ): Promise<ApiResponse<T>> {
    // Check configuration
    if (!this.isConfigured()) {
      return {
        success: false,
        error: `API key not configured for ${this.config.name}. Set ${this.config.apiKeyEnv} in environment variables.`,
      };
    }
    
    // Request deduplication
    if (cacheKey && this.requestQueue.has(cacheKey)) {
      try {
        const result = await this.requestQueue.get(cacheKey);
        return { ...result, cached: true };
      } catch (error) {
        // If cached request failed, continue with new request
      }
    }
    
    // Check rate limits
    try {
      await this.checkRateLimit();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
    
    // Create request promise
    const requestPromise = (async () => {
      try {
        const url = endpoint.startsWith("http") ? endpoint : `${this.config.baseUrl}${endpoint}`;
        
        const response = await fetchWithRetry(
          url,
          {
            ...options,
            headers: {
              ...options.headers,
              ...this.getDefaultHeaders(),
            },
          },
          {
            maxAttempts: 3,
            initialDelay: 1000,
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          return {
            success: false,
            error: `HTTP ${response.status}: ${errorText || response.statusText}`,
            statusCode: response.status,
          };
        }
        
        const data = await response.json();
        return {
          success: true,
          data,
          statusCode: response.status,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })();
    
    // Store in queue for deduplication
    if (cacheKey) {
      this.requestQueue.set(cacheKey, requestPromise);
      
      // Clean up after request completes
      requestPromise.finally(() => {
        setTimeout(() => this.requestQueue.delete(cacheKey), 1000);
      });
    }
    
    return requestPromise;
  }

  /**
   * Get default headers for API requests
   * Override in subclasses for specific API requirements
   */
  protected getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }

  /**
   * Get current call counts (for monitoring)
   */
  getCallCounts() {
    return {
      perSecond: this.callCounts.second.length,
      perMinute: this.callCounts.minute.length,
      perHour: this.callCounts.hour.length,
      perDay: this.callCounts.day,
    };
  }

  /**
   * Reset call counts (for testing)
   */
  resetCallCounts() {
    this.callCounts = {
      second: [],
      minute: [],
      hour: [],
      day: 0,
    };
  }
}
