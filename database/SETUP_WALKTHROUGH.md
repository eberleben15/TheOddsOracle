# Database Setup Walkthrough

This guide will walk you through setting up the PostgreSQL database for The Odds Oracle.

## Setup Options

- **Option A**: Use existing database with a new schema (recommended for local dev)
- **Option B**: Create a new database (for production/AWS)

See `SCHEMA_SETUP.md` for schema-based setup instructions.

## Prerequisites

- PostgreSQL installed (version 12+)
- Terminal/Command line access
- Basic knowledge of SQL (helpful but not required)

## Option 1: Using Docker (Recommended - Easiest)

### Step 1: Start PostgreSQL Container

```bash
docker run --name postgres-oddsoracle \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=theoddsoracle \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -d postgres:14
```

**What this does:**
- Creates a container named `postgres-oddsoracle`
- Sets the database password to `yourpassword` (change this!)
- Creates a database named `theoddsoracle`
- Uses the default `postgres` user
- Maps port 5432 to your local machine

**Verify it's running:**
```bash
docker ps
```

You should see the container listed.

### Step 2: Connect to the Database

```bash
# Connect using Docker
docker exec -it postgres-oddsoracle psql -U postgres -d theoddsoracle

# Or connect from your local machine (if you have psql installed)
psql -h localhost -U postgres -d theoddsoracle
```

When prompted, enter the password you set: `yourpassword`

### Step 3: Run the DDL Script

Once connected to the database, you can run the DDL in two ways:

**Option A: Copy and paste the SQL**
```bash
# In psql, you can paste the contents of database/ddl.sql
\i /path/to/database/ddl.sql
```

**Option B: Run from command line**
```bash
# From your project root
docker exec -i postgres-oddsoracle psql -U postgres -d theoddsoracle < database/ddl.sql
```

**Option C: Use Prisma (Recommended)**
```bash
# This is the easiest way - Prisma will create everything for you
npm run db:push
```

### Step 4: Verify Tables Were Created

```sql
-- List all tables
\dt

-- You should see:
-- accounts
-- analytics
-- sessions
-- subscriptions
-- usage_tracking
-- users
-- verification_tokens

-- Check a specific table structure
\d users
\d subscriptions
```

### Step 5: Set Up Environment Variable

Create or update your `.env.local` file:

```bash
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/theoddsoracle?schema=public"
```

## Option 2: Using Local PostgreSQL Installation

### Step 1: Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### Step 2: Create Database and User

```bash
# Connect to PostgreSQL as the postgres user
psql postgres

# In the psql prompt:
CREATE DATABASE theoddsoracle;
CREATE USER oddsoracle_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE theoddsoracle TO oddsoracle_user;
\q
```

### Step 3: Connect to Your Database

```bash
psql -U oddsoracle_user -d theoddsoracle
# Enter password when prompted
```

### Step 4: Run the DDL Script

```bash
# From your project root
psql -U oddsoracle_user -d theoddsoracle -f database/ddl.sql

# Or use Prisma (easier)
npm run db:push
```

### Step 5: Set Up Environment Variable

```bash
DATABASE_URL="postgresql://oddsoracle_user:yourpassword@localhost:5432/theoddsoracle?schema=public"
```

## Option 3: Using Prisma (Easiest Method)

If you just want to get started quickly, Prisma can handle everything:

### Step 1: Set Up Database Connection

Create `.env.local`:
```bash
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/theoddsoracle?schema=public"
```

### Step 2: Push Schema to Database

```bash
# This will create all tables automatically
npm run db:push
```

That's it! Prisma will:
- Connect to your database
- Create all tables
- Set up all relationships
- Create all indexes

## Verification Steps

### 1. Check Database Connection

```bash
# Test connection
psql $DATABASE_URL

# Or using Prisma Studio (visual database browser)
npm run db:studio
```

### 2. Verify Tables

```sql
-- Connect to database
psql $DATABASE_URL

-- List tables
\dt

-- Check table structure
\d users
\d subscriptions
\d accounts
```

### 3. Test with Prisma

```bash
# Generate Prisma Client (if not already done)
npm run db:generate

# Open Prisma Studio to view your database
npm run db:studio
```

Visit `http://localhost:5555` to see your database in a GUI.

## Common Issues & Solutions

### Issue: "database does not exist"

**Solution:**
```sql
-- Connect to postgres database
psql postgres

-- Create the database
CREATE DATABASE theoddsoracle;
```

### Issue: "password authentication failed"

**Solution:**
- Check your password in `.env.local`
- Verify the user exists: `\du` in psql
- Reset password: `ALTER USER postgres WITH PASSWORD 'newpassword';`

### Issue: "connection refused"

**Solution:**
- Check PostgreSQL is running: `brew services list` or `docker ps`
- Verify port 5432 is correct
- Check firewall settings

### Issue: "relation already exists"

**Solution:**
- Tables already exist - this is fine if you're re-running
- To start fresh: `DROP DATABASE theoddsoracle; CREATE DATABASE theoddsoracle;`

## Docker Commands Reference

```bash
# Start container
docker start postgres-oddsoracle

# Stop container
docker stop postgres-oddsoracle

# View logs
docker logs postgres-oddsoracle

# Remove container (WARNING: deletes data)
docker rm -f postgres-oddsoracle

# Backup database
docker exec postgres-oddsoracle pg_dump -U postgres theoddsoracle > backup.sql

# Restore database
docker exec -i postgres-oddsoracle psql -U postgres theoddsoracle < backup.sql
```

## Next Steps

Once your database is set up:

1. ✅ Verify connection works: `npm run db:studio`
2. ✅ Test authentication: Start dev server and visit `/auth/signin`
3. ✅ Create a test user through the sign-in flow
4. ✅ Check the database to see the user was created

## Production Considerations

For AWS/Amplify deployment later:

1. **Use AWS RDS** instead of local database
2. **Update DATABASE_URL** to point to RDS endpoint
3. **Use connection pooling** (PgBouncer or RDS Proxy)
4. **Set up automated backups**
5. **Configure security groups** properly
6. **Use SSL connections**: Add `?sslmode=require` to DATABASE_URL

## Quick Start Summary

```bash
# 1. Start PostgreSQL (Docker)
docker run --name postgres-oddsoracle \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=theoddsoracle \
  -p 5432:5432 -d postgres:14

# 2. Set environment variable
echo 'DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/theoddsoracle?schema=public"' >> .env.local

# 3. Push schema
npm run db:push

# 4. Verify
npm run db:studio
```

Done! 🎉

