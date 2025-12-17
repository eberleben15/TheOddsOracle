# Schema-Based Setup Guide

This guide is for setting up The Odds Oracle as a **schema** within an existing database (like `dev_db`).

## Why Use a Schema?

- **Development**: Share one database (`dev_db`) with multiple projects
- **Production**: Each app gets its own database on AWS
- **Isolation**: Tables are namespaced under the `oddsoracle` schema
- **Easy Migration**: When moving to AWS, we'll use a separate database

## Quick Setup

### Step 1: Connect to Your Database

```bash
# Connect to your existing dev_db
psql -U your_username -d dev_db
```

### Step 2: Run the DDL Script

```bash
# From your project root
psql -U your_username -d dev_db -f database/ddl.sql
```

Or if you're already in psql:
```sql
\i /full/path/to/database/ddl.sql
```

### Step 3: Update Your Environment Variable

In `.env.local`:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/dev_db?schema=oddsoracle"
```

**Important**: Notice the `?schema=oddsoracle` parameter!

### Step 4: Generate Prisma Client

```bash
npm run db:generate
```

### Step 5: Push Schema (if needed)

```bash
npm run db:push
```

## What Gets Created

The DDL script will:
1. Create a new schema called `oddsoracle`
2. Create all tables within that schema
3. Set up all indexes, foreign keys, and constraints

Your tables will be:
- `oddsoracle.users`
- `oddsoracle.accounts`
- `oddsoracle.sessions`
- `oddsoracle.subscriptions`
- `oddsoracle.analytics`
- `oddsoracle.usage_tracking`
- `oddsoracle.verification_tokens`

## Verification

### Check Schema Exists

```sql
-- In psql
\dn

-- Should see: oddsoracle
```

### List Tables in Schema

```sql
-- In psql
\dt oddsoracle.*

-- Should see all 7 tables
```

### View Table Structure

```sql
\d oddsoracle.users
\d oddsoracle.subscriptions
```

## Using Prisma Studio

When you run `npm run db:studio`, Prisma will automatically:
- Connect to the `dev_db` database
- Show only tables in the `oddsoracle` schema
- Allow you to browse and edit data

## Migration to AWS

When you're ready to deploy to AWS:

1. **Create a new database** on AWS RDS (not just a schema)
2. **Update DATABASE_URL** to point to AWS:
   ```bash
   DATABASE_URL="postgresql://user:pass@aws-rds-endpoint:5432/theoddsoracle?schema=public"
   ```
   Note: AWS will use `public` schema (or you can keep `oddsoracle`)

3. **Run migrations**:
   ```bash
   npm run db:push
   ```

The Prisma schema is configured to work with both approaches!

## Troubleshooting

### "schema 'oddsoracle' does not exist"

Make sure you ran the DDL script. The first line creates the schema:
```sql
CREATE SCHEMA IF NOT EXISTS oddsoracle;
```

### "relation does not exist"

Check that:
1. Schema exists: `\dn`
2. Tables are in the schema: `\dt oddsoracle.*`
3. Your DATABASE_URL includes `?schema=oddsoracle`

### Prisma Can't Find Tables

1. Verify DATABASE_URL has `?schema=oddsoracle`
2. Run `npm run db:generate`
3. Check `prisma/schema.prisma` has `schemas = ["oddsoracle"]`

## Schema vs Database

**Development (Current Setup)**:
```
dev_db (database)
  ├── public (schema) - other projects
  └── oddsoracle (schema) - The Odds Oracle tables
```

**Production (AWS)**:
```
theoddsoracle (database)
  └── public (schema) - The Odds Oracle tables
```

This approach gives you flexibility during development while keeping production clean!

