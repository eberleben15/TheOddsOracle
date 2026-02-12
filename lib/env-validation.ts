/**
 * Environment Variable Validation
 * 
 * Validates all required environment variables on startup
 * and provides helpful error messages for missing/invalid config
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  configured: {
    database: boolean;
    auth: boolean;
    stripe: boolean;
    apis: {
      odds: boolean;
      sportsdata: boolean;
    };
  };
}

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = {
  // Database
  DATABASE_URL: "PostgreSQL database connection string",
  
  // Authentication
  NEXTAUTH_URL: "Base URL for NextAuth callbacks",
  NEXTAUTH_SECRET: "Secret key for NextAuth session encryption",
  
  // APIs
  THE_ODDS_API_KEY: "The Odds API key for betting odds",
} as const;

/**
 * Optional but recommended environment variables
 */
const OPTIONAL_ENV_VARS = {
  // SportsData (optional – CBB uses ESPN; key only needed for NBA/NFL/NHL/MLB stats)
  SPORTSDATA_API_KEY: "SportsData.io API key (optional; CBB uses free ESPN data)",
  
  // Stripe (optional - only needed for payments)
  STRIPE_SECRET_KEY: "Stripe secret key for payment processing",
  STRIPE_WEBHOOK_SECRET: "Stripe webhook secret for verifying webhooks",
  STRIPE_PRICE_PREMIUM: "Stripe price ID for Premium subscription",
  STRIPE_PRICE_PRO: "Stripe price ID for Pro subscription",
  
  // OAuth (optional - only needed for Google sign-in)
  GOOGLE_CLIENT_ID: "Google OAuth client ID",
  GOOGLE_CLIENT_SECRET: "Google OAuth client secret",
  
  // Email (optional - only needed for email auth)
  EMAIL_SERVER_HOST: "SMTP server host for email authentication",
  EMAIL_SERVER_PORT: "SMTP server port",
  EMAIL_FROM: "Email address for sending auth emails",
} as const;

/**
 * Validate all environment variables
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missing: string[] = [];

  // Check required variables
  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      errors.push(`Missing required: ${key} - ${description}`);
      missing.push(key);
    }
  }

  // Check optional but recommended variables
  for (const [key, description] of Object.entries(OPTIONAL_ENV_VARS)) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      warnings.push(`Not configured: ${key} - ${description}`);
    }
  }

  // Validate specific formats
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
        errors.push("DATABASE_URL must use postgresql:// or postgres:// protocol");
      }
    } catch {
      errors.push("DATABASE_URL is not a valid URL");
    }
  }

  if (process.env.NEXTAUTH_URL) {
    try {
      new URL(process.env.NEXTAUTH_URL);
    } catch {
      errors.push("NEXTAUTH_URL is not a valid URL");
    }
  }

  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    warnings.push("NEXTAUTH_SECRET should be at least 32 characters long for security");
  }

  // Check for Stripe configuration completeness
  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
  const hasStripeWebhook = !!process.env.STRIPE_WEBHOOK_SECRET;
  const hasStripePrices = !!process.env.STRIPE_PRICE_PREMIUM && !!process.env.STRIPE_PRICE_PRO;

  if (hasStripeKey && (!hasStripeWebhook || !hasStripePrices)) {
    warnings.push(
      "Stripe is partially configured. For full payment functionality, you need: " +
      "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PREMIUM, and STRIPE_PRICE_PRO"
    );
  }

  // Check for OAuth configuration completeness
  const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;

  if (hasGoogleClientId !== hasGoogleClientSecret) {
    warnings.push(
      "Google OAuth is partially configured. You need both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    missing,
    configured: {
      database: !!process.env.DATABASE_URL,
      auth: !!(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET),
      stripe: hasStripeKey && hasStripeWebhook && hasStripePrices,
      apis: {
        odds: !!process.env.THE_ODDS_API_KEY,
        sportsdata: !!process.env.SPORTSDATA_API_KEY,
      },
    },
  };
}

/**
 * Get user-friendly error message for missing environment variables
 */
export function getEnvErrorMessage(result: EnvValidationResult): string {
  if (result.valid) {
    return "";
  }

  const missingList = result.missing
    .map((key) => `  - ${key}: ${REQUIRED_ENV_VARS[key as keyof typeof REQUIRED_ENV_VARS]}`)
    .join("\n");

  return `Missing required environment variables:\n${missingList}\n\n` +
    `Please check your .env.local file and ensure all required variables are set.`;
}

/**
 * Validate environment and throw if invalid
 * Use this in critical paths where the app cannot function without proper config
 */
export function requireValidEnvironment(): void {
  const result = validateEnvironment();
  if (!result.valid) {
    const message = getEnvErrorMessage(result);
    throw new Error(message);
  }
}

