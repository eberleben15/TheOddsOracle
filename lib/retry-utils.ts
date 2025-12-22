/**
 * Retry Utilities
 * 
 * Provides retry logic with exponential backoff for API calls
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number; // in milliseconds
  maxDelay?: number; // in milliseconds
  backoffMultiplier?: number;
  retryable?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryable: () => true,
};

/**
 * Check if an error is retryable based on status code or error type
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network errors are retryable
    if (message.includes("fetch") || message.includes("network") || message.includes("econnrefused")) {
      return true;
    }
    
    // Timeout errors are retryable
    if (message.includes("timeout") || message.includes("timed out")) {
      return true;
    }
    
    // 5xx server errors are retryable
    if (message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504")) {
      return true;
    }
    
    // Rate limit errors are retryable (but with longer delay)
    if (message.includes("429") || message.includes("rate limit")) {
      return true;
    }
    
    // 4xx client errors are generally not retryable
    if (message.includes("400") || message.includes("401") || message.includes("403") || message.includes("404")) {
      return false;
    }
  }
  
  // Unknown errors - default to retryable
  return true;
}

/**
 * Calculate delay for retry attempt with exponential backoff
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  return Math.min(delay, options.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config: Required<RetryOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
    retryable: options.retryable || DEFAULT_OPTIONS.retryable,
  };

  let lastError: unknown;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      if (!config.retryable(error)) {
        throw error; // Don't retry non-retryable errors
      }
      
      // Don't delay after last attempt
      if (attempt < config.maxAttempts) {
        const delay = calculateDelay(attempt, config);
        
        // Special handling for rate limit errors - use longer delay
        if (error instanceof Error && error.message.toLowerCase().includes("429")) {
          const rateLimitDelay = Math.max(delay * 2, 5000); // At least 5 seconds for rate limits
          console.warn(`[RETRY] Rate limit hit, waiting ${rateLimitDelay}ms before retry ${attempt + 1}/${config.maxAttempts}`);
          await sleep(rateLimitDelay);
        } else {
          console.warn(`[RETRY] Attempt ${attempt}/${config.maxAttempts} failed, retrying in ${delay}ms...`, error instanceof Error ? error.message : String(error));
          await sleep(delay);
        }
      }
    }
  }
  
  // All retries exhausted
  console.error(`[RETRY] All ${config.maxAttempts} attempts failed`);
  throw lastError;
}

/**
 * Retry a fetch request with exponential backoff
 * 
 * @param url - URL to fetch
 * @param init - Fetch options
 * @param options - Retry configuration
 * @returns Response from fetch
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, init);
      
      // Check if response indicates a retryable error
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const error = new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
        
        // Only retry on server errors (5xx) or rate limits (429)
        if (response.status >= 500 || response.status === 429) {
          throw error;
        }
        
        // For other errors, throw but don't retry
        throw error;
      }
      
      return response;
    },
    {
      ...options,
      retryable: (error) => {
        // Use custom retryable function if provided
        if (options.retryable) {
          return options.retryable(error);
        }
        
        // Default: only retry on network errors, timeouts, or 5xx/429
        return isRetryableError(error);
      },
    }
  );
}

