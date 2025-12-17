-- ============================================
-- The Odds Oracle Database Schema
-- ============================================
-- This file contains the DDL for setting up the database
-- Run this after connecting to your database
-- 
-- For local dev: Use existing dev_db with a new schema
-- For AWS: Will be its own database
-- ============================================

-- Create schema for The Odds Oracle
-- This allows multiple apps to share the same database
CREATE SCHEMA IF NOT EXISTS oddsoracle;

-- Set search path to use the oddsoracle schema
SET search_path TO oddsoracle, public;

-- Enable UUID extension (if using UUIDs, though we're using CUID)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS oddsoracle."users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON oddsoracle."users"("email");

-- ============================================
-- ACCOUNTS TABLE (OAuth Accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS oddsoracle."accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Create unique index on provider + providerAccountId
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_providerAccountId_key" 
    ON oddsoracle."accounts"("provider", "providerAccountId");

-- Foreign key to users
ALTER TABLE oddsoracle."accounts" 
    ADD CONSTRAINT "accounts_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES oddsoracle."users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS oddsoracle."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- Create unique index on sessionToken
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_sessionToken_key" 
    ON oddsoracle."sessions"("sessionToken");

-- Foreign key to users
ALTER TABLE oddsoracle."sessions" 
    ADD CONSTRAINT "sessions_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES oddsoracle."users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- VERIFICATION TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS oddsoracle."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" 
    ON oddsoracle."verification_tokens"("token");

-- Create unique composite index on identifier + token
CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" 
    ON oddsoracle."verification_tokens"("identifier", "token");

-- ============================================
-- SUBSCRIPTION STATUS ENUM
-- ============================================
-- Note: Enums are database-level, not schema-level in PostgreSQL
-- If enum already exists, this will error - that's fine, just continue
DO $$ BEGIN
    CREATE TYPE oddsoracle."subscription_status" AS ENUM ('FREE', 'PREMIUM', 'PRO', 'CANCELLED', 'PAST_DUE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS oddsoracle."subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "status" oddsoracle."subscription_status" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_userId_key" 
    ON oddsoracle."subscriptions"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripeCustomerId_key" 
    ON oddsoracle."subscriptions"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_stripeSubscriptionId_key" 
    ON oddsoracle."subscriptions"("stripeSubscriptionId");

-- Foreign key to users
ALTER TABLE oddsoracle."subscriptions" 
    ADD CONSTRAINT "subscriptions_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES oddsoracle."users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS oddsoracle."analytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS "analytics_userId_idx" ON oddsoracle."analytics"("userId");
CREATE INDEX IF NOT EXISTS "analytics_eventType_idx" ON oddsoracle."analytics"("eventType");
CREATE INDEX IF NOT EXISTS "analytics_createdAt_idx" ON oddsoracle."analytics"("createdAt");

-- Foreign key to users
ALTER TABLE oddsoracle."analytics" 
    ADD CONSTRAINT "analytics_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES oddsoracle."users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- USAGE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS oddsoracle."usage_tracking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on userId + resourceType + date
CREATE UNIQUE INDEX IF NOT EXISTS "usage_tracking_userId_resourceType_date_key" 
    ON oddsoracle."usage_tracking"("userId", "resourceType", "date");

-- Create indexes for usage queries
CREATE INDEX IF NOT EXISTS "usage_tracking_userId_date_idx" 
    ON oddsoracle."usage_tracking"("userId", "date");

-- Foreign key to users
ALTER TABLE oddsoracle."usage_tracking" 
    ADD CONSTRAINT "usage_tracking_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES oddsoracle."users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- INITIAL DATA (Optional)
-- ============================================
-- You can add any initial data here if needed

-- ============================================
-- GRANTS (if using a specific database user)
-- ============================================
-- Uncomment and modify if you have a specific database user
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

