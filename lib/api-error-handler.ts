/**
 * API Error Handler
 * 
 * Provides user-friendly error messages for API failures
 */

export interface ApiError {
  message: string;
  userMessage: string;
  actionable?: string;
  statusCode?: number;
  retryable: boolean;
}

/**
 * Create user-friendly error messages from API errors
 */
export function createApiError(
  error: unknown,
  context: {
    apiName: string;
    operation: string;
    statusCode?: number;
  }
): ApiError {
  const { apiName, operation, statusCode } = context;

  // Handle known error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes("fetch") || message.includes("network") || message.includes("econnrefused")) {
      return {
        message: error.message,
        userMessage: `Unable to connect to ${apiName}. Please check your internet connection and try again.`,
        actionable: "Check your internet connection and try again in a few moments.",
        retryable: true,
        statusCode,
      };
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("timed out")) {
      return {
        message: error.message,
        userMessage: `Request to ${apiName} timed out. The service may be temporarily unavailable.`,
        actionable: "Please try again in a few moments.",
        retryable: true,
        statusCode,
      };
    }

    // API key errors
    if (message.includes("api key") || message.includes("unauthorized") || message.includes("401")) {
      return {
        message: error.message,
        userMessage: `Authentication failed with ${apiName}. Your API key may be invalid or expired.`,
        actionable: `Please check your ${apiName} API key configuration.`,
        retryable: false,
        statusCode: 401,
      };
    }

    // Rate limit errors
    if (message.includes("rate limit") || message.includes("quota") || message.includes("429") || message.includes("too many requests")) {
      return {
        message: error.message,
        userMessage: `Rate limit exceeded for ${apiName}. You've made too many requests.`,
        actionable: "Please wait a few moments before trying again, or upgrade your API plan.",
        retryable: true,
        statusCode: 429,
      };
    }

    // Not found errors
    if (message.includes("not found") || message.includes("404")) {
      return {
        message: error.message,
        userMessage: `The requested ${operation} was not found.`,
        actionable: "Please try a different search or check back later.",
        retryable: false,
        statusCode: 404,
      };
    }

    // Server errors
    if (message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504")) {
      return {
        message: error.message,
        userMessage: `${apiName} is experiencing technical difficulties.`,
        actionable: "Please try again in a few moments. If the problem persists, contact support.",
        retryable: true,
        statusCode: statusCode || 500,
      };
    }

    // Generic error
    return {
      message: error.message,
      userMessage: `An error occurred while ${operation}.`,
      actionable: "Please try again. If the problem persists, contact support.",
      retryable: true,
      statusCode,
    };
  }

  // Unknown error type
  return {
    message: String(error),
    userMessage: `An unexpected error occurred while ${operation}.`,
    actionable: "Please try again. If the problem persists, contact support.",
    retryable: true,
    statusCode,
  };
}

/**
 * Handle HTTP response errors with user-friendly messages
 */
export function handleHttpError(
  response: Response,
  context: {
    apiName: string;
    operation: string;
  }
): ApiError {
  const { apiName, operation } = context;
  const statusCode = response.status;

  switch (statusCode) {
    case 400:
      return {
        message: `Bad request: ${response.statusText}`,
        userMessage: `Invalid request to ${apiName}.`,
        actionable: "Please try again with different parameters.",
        statusCode: 400,
        retryable: false,
      };

    case 401:
      return {
        message: `Unauthorized: ${response.statusText}`,
        userMessage: `Authentication failed with ${apiName}. Your API key may be invalid or expired.`,
        actionable: `Please check your ${apiName} API key in your configuration.`,
        statusCode: 401,
        retryable: false,
      };

    case 403:
      return {
        message: `Forbidden: ${response.statusText}`,
        userMessage: `Access denied to ${apiName}. You may not have permission for this operation.`,
        actionable: `Please check your ${apiName} subscription and permissions.`,
        statusCode: 403,
        retryable: false,
      };

    case 404:
      return {
        message: `Not found: ${response.statusText}`,
        userMessage: `The requested ${operation} was not found.`,
        actionable: "Please try a different search or check back later.",
        statusCode: 404,
        retryable: false,
      };

    case 429:
      return {
        message: `Rate limit exceeded: ${response.statusText}`,
        userMessage: `Rate limit exceeded for ${apiName}. You've made too many requests.`,
        actionable: "Please wait a few moments before trying again, or upgrade your API plan.",
        statusCode: 429,
        retryable: true,
      };

    case 500:
      return {
        message: `Internal server error: ${response.statusText}`,
        userMessage: `${apiName} is experiencing technical difficulties.`,
        actionable: "Please try again in a few moments. If the problem persists, contact support.",
        statusCode: 500,
        retryable: true,
      };

    case 502:
      return {
        message: `Bad gateway: ${response.statusText}`,
        userMessage: `${apiName} is temporarily unavailable.`,
        actionable: "Please try again in a few moments.",
        statusCode: 502,
        retryable: true,
      };

    case 503:
      return {
        message: `Service unavailable: ${response.statusText}`,
        userMessage: `${apiName} is temporarily unavailable for maintenance.`,
        actionable: "Please try again in a few moments.",
        statusCode: 503,
        retryable: true,
      };

    case 504:
      return {
        message: `Gateway timeout: ${response.statusText}`,
        userMessage: `Request to ${apiName} timed out.`,
        actionable: "Please try again in a few moments.",
        statusCode: 504,
        retryable: true,
      };

    default:
      return {
        message: `HTTP ${statusCode}: ${response.statusText}`,
        userMessage: `An error occurred while ${operation}.`,
        actionable: "Please try again. If the problem persists, contact support.",
        statusCode,
        retryable: statusCode >= 500,
      };
  }
}

/**
 * Format error for display to users
 */
export function formatErrorForUser(error: ApiError): string {
  let message = error.userMessage;
  if (error.actionable) {
    message += ` ${error.actionable}`;
  }
  return message;
}

