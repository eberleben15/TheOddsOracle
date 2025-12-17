# Database Setup Files

This directory contains all the files needed to set up the PostgreSQL database for The Odds Oracle.

## Files

- **`ddl.sql`** - Complete SQL DDL script to create all tables, indexes, and constraints
- **`SETUP_WALKTHROUGH.md`** - Detailed step-by-step walkthrough guide
- **`quick-setup.sh`** - Automated setup script (Docker)

## Quick Start

### Option 1: Automated Script (Easiest)

```bash
./database/quick-setup.sh
```

This script will:
- Start a PostgreSQL Docker container
- Create the database
- Set up your `.env.local` file
- Run Prisma to create all tables

### Option 2: Manual Setup with Prisma (Recommended)

1. Start PostgreSQL (Docker):
   ```bash
   docker run --name postgres-oddsoracle \
     -e POSTGRES_PASSWORD=yourpassword \
     -e POSTGRES_DB=theoddsoracle \
     -p 5432:5432 -d postgres:14
   ```

2. Set environment variable:
   ```bash
   echo 'DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/theoddsoracle?schema=public"' >> .env.local
   ```

3. Push schema:
   ```bash
   npm run db:push
   ```

### Option 3: Manual SQL Setup

1. Start PostgreSQL and create database
2. Connect to the database
3. Run the DDL script:
   ```bash
   psql -U postgres -d theoddsoracle -f database/ddl.sql
   ```

## Database Schema

The database includes:

- **users** - User accounts
- **accounts** - OAuth account connections
- **sessions** - User sessions
- **verification_tokens** - Email verification
- **subscriptions** - User subscription tiers
- **analytics** - User engagement tracking
- **usage_tracking** - API usage limits

## Verification

After setup, verify everything works:

```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Or connect directly
psql $DATABASE_URL
```

## Documentation

See `SETUP_WALKTHROUGH.md` for detailed instructions and troubleshooting.

