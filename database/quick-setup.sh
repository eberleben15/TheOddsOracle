#!/bin/bash

# Quick Database Setup Script for The Odds Oracle
# This script sets up a PostgreSQL database using Docker

set -e

echo "🚀 Setting up The Odds Oracle database..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^postgres-oddsoracle$"; then
    echo -e "${YELLOW}⚠️  Container 'postgres-oddsoracle' already exists${NC}"
    read -p "Do you want to remove it and start fresh? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing existing container..."
        docker rm -f postgres-oddsoracle
    else
        echo "Starting existing container..."
        docker start postgres-oddsoracle
        exit 0
    fi
fi

# Get database password
read -sp "Enter database password (default: oddsoracle): " DB_PASSWORD
echo
DB_PASSWORD=${DB_PASSWORD:-oddsoracle}

# Start PostgreSQL container
echo -e "${BLUE}📦 Starting PostgreSQL container...${NC}"
docker run --name postgres-oddsoracle \
  -e POSTGRES_PASSWORD=$DB_PASSWORD \
  -e POSTGRES_DB=theoddsoracle \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  -d postgres:14

# Wait for PostgreSQL to be ready
echo -e "${BLUE}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^postgres-oddsoracle$"; then
    echo "❌ Failed to start container. Check Docker logs:"
    docker logs postgres-oddsoracle
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL container is running!${NC}"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo -e "${BLUE}📝 Creating .env.local file...${NC}"
    cat > .env.local << EOF
# Database
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@localhost:5432/theoddsoracle?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3005"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# API Keys (add your keys here)
THE_ODDS_API_KEY=your_odds_api_key_here
SPORTSDATA_API_KEY=your_sportsdata_api_key_here
EOF
    echo -e "${GREEN}✅ Created .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local already exists. Please update DATABASE_URL manually.${NC}"
fi

# Check if Prisma is available
if command -v npx &> /dev/null; then
    echo -e "${BLUE}📊 Setting up database schema with Prisma...${NC}"
    
    # Generate Prisma Client
    npx prisma generate
    
    # Push schema to database
    npx prisma db push --accept-data-loss
    
    echo -e "${GREEN}✅ Database schema created!${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma not found. Run 'npm install' first, then 'npm run db:push'${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify connection: npm run db:studio"
echo "  2. Start dev server: npm run dev"
echo "  3. Visit: http://localhost:3005/auth/signin"
echo ""
echo "Database connection string:"
echo "  postgresql://postgres:${DB_PASSWORD}@localhost:5432/theoddsoracle"
echo ""

