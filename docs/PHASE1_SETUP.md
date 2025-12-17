# Phase 1 Setup Guide

This guide will help you set up the database and authentication system for The Odds Oracle.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or remote)
- Google OAuth credentials (optional, for Google sign-in)
- Email server credentials (optional, for email sign-in)

## Step 1: Set Up Local PostgreSQL Database

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS
   brew install postgresql@14
   brew services start postgresql@14

   # Or use Docker
   docker run --name postgres-oddsoracle -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=theoddsoracle -p 5432:5432 -d postgres:14
   ```

2. **Create the database**:
   ```bash
   # Connect to PostgreSQL
   psql postgres

   # Create database
   CREATE DATABASE theoddsoracle;

   # Exit
   \q
   ```

## Step 2: Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/theoddsoracle?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3005"
NEXTAUTH_SECRET="your-secret-key-here"

# Generate a secret key:
# openssl rand -base64 32

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Provider (Optional - only if using email sign-in)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@theoddsoracle.com"

# Existing API Keys
THE_ODDS_API_KEY=your_odds_api_key_here
SPORTSDATA_API_KEY=your_sportsdata_api_key_here
```

## Step 3: Set Up Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure the consent screen
6. Add authorized redirect URI: `http://localhost:3005/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your `.env.local`

## Step 4: Generate Prisma Client and Run Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or create a migration (for production)
npm run db:migrate
```

## Step 5: Verify Installation

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Visit the sign-in page**:
   - Navigate to `http://localhost:3005/auth/signin`
   - You should see the sign-in page with Google and Email options

3. **Test authentication**:
   - Try signing in with Google (if configured)
   - Or use email sign-in (if email server is configured)

## Step 6: Database Management

- **View database in Prisma Studio**:
  ```bash
  npm run db:studio
  ```
  This opens a GUI at `http://localhost:5555` where you can view and edit your database.

- **Create a new migration**:
  ```bash
  npm run db:migrate
  ```

## Database Schema Overview

The database includes the following models:

- **User**: User accounts and authentication
- **Account**: OAuth account connections
- **Session**: User sessions
- **Subscription**: User subscription tiers (FREE, PREMIUM, PRO)
- **Analytics**: User engagement tracking
- **UsageTracking**: API usage and tier limit tracking

## Troubleshooting

### Database Connection Issues

- Verify PostgreSQL is running: `brew services list` or `docker ps`
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure database exists: `psql -l` to list databases

### NextAuth Issues

- Verify NEXTAUTH_SECRET is set and is at least 32 characters
- Check NEXTAUTH_URL matches your app URL
- For OAuth: verify redirect URIs match exactly

### Prisma Issues

- Run `npm run db:generate` after schema changes
- If migrations fail, try `npm run db:push` for development
- Clear node_modules and reinstall if Prisma client is missing

## Next Steps

Once Phase 1 is complete, you can proceed to:
- Phase 2: Stripe Integration (Week 2)
- Phase 3: Access Control & Middleware (Week 3)

See the main roadmap in Notion for details.

