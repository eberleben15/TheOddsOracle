# Quick Start: Schema Setup in Existing Database

## For Your Setup (dev_db with oddsoracle schema)

### Option 1: Automated Script (Easiest)

```bash
./database/quick-schema-setup.sh
```

This will:
- Connect to your `dev_db` database
- Create the `oddsoracle` schema
- Create all tables
- Update your `.env.local` with the correct DATABASE_URL

### Option 2: Manual Setup

#### Step 1: Run the DDL

```bash
# Connect to your database
psql -U your_username -d dev_db

# Run the DDL script
\i /full/path/to/TheOddsOracle/database/ddl.sql

# Or from command line:
psql -U your_username -d dev_db -f database/ddl.sql
```

#### Step 2: Update .env.local

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/dev_db?schema=oddsoracle"
```

**Important**: The `?schema=oddsoracle` parameter tells Prisma which schema to use!

#### Step 3: Generate Prisma Client

```bash
npm run db:generate
```

#### Step 4: Verify

```bash
# Open Prisma Studio
npm run db:studio

# Or check in psql
psql -U your_username -d dev_db
\dt oddsoracle.*
```

## What Gets Created

In your `dev_db` database:
- **Schema**: `oddsoracle` (new)
- **Tables** (all in the `oddsoracle` schema):
  - `oddsoracle.users`
  - `oddsoracle.accounts`
  - `oddsoracle.sessions`
  - `oddsoracle.subscriptions`
  - `oddsoracle.analytics`
  - `oddsoracle.usage_tracking`
  - `oddsoracle.verification_tokens`

## Verification

```sql
-- Check schema exists
\dn

-- List tables in schema
\dt oddsoracle.*

-- View a table
\d oddsoracle.users
```

## When Moving to AWS

Just update your DATABASE_URL:
```bash
# Development (schema in existing DB)
DATABASE_URL="postgresql://user:pass@localhost:5432/dev_db?schema=oddsoracle"

# Production (own database, public schema)
DATABASE_URL="postgresql://user:pass@aws-rds-endpoint:5432/theoddsoracle?schema=public"
```

The Prisma schema works with both! 🎉

