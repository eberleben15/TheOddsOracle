#!/bin/bash

# Quick Schema Setup Script for The Odds Oracle
# This script adds the oddsoracle schema to an existing database

set -e

echo "🚀 Setting up The Odds Oracle schema in existing database..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get database connection details
read -p "Database name (default: dev_db): " DB_NAME
DB_NAME=${DB_NAME:-dev_db}

read -p "Database user (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -p "Database host (default: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Database port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -sp "Database password: " DB_PASSWORD
echo

# Test connection
echo -e "${BLUE}🔌 Testing database connection...${NC}"
if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Connection successful!${NC}"
else
    echo -e "${YELLOW}❌ Connection failed. Please check your credentials.${NC}"
    exit 1
fi

# Run DDL script
echo -e "${BLUE}📊 Creating schema and tables...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$(dirname "$0")/ddl.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Schema and tables created successfully!${NC}"
else
    echo -e "${YELLOW}❌ Error creating schema. Check the output above.${NC}"
    exit 1
fi

# Update .env.local
ENV_FILE=".env.local"
DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=oddsoracle"

if [ -f "$ENV_FILE" ]; then
    # Check if DATABASE_URL exists
    if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
        echo -e "${YELLOW}⚠️  DATABASE_URL already exists in .env.local${NC}"
        read -p "Do you want to update it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Update existing DATABASE_URL
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=\"${DB_URL}\"|" "$ENV_FILE"
            else
                # Linux
                sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${DB_URL}\"|" "$ENV_FILE"
            fi
            echo -e "${GREEN}✅ Updated DATABASE_URL in .env.local${NC}"
        fi
    else
        # Add DATABASE_URL
        echo "" >> "$ENV_FILE"
        echo "DATABASE_URL=\"${DB_URL}\"" >> "$ENV_FILE"
        echo -e "${GREEN}✅ Added DATABASE_URL to .env.local${NC}"
    fi
else
    # Create .env.local
    cat > "$ENV_FILE" << EOF
# Database
DATABASE_URL="${DB_URL}"

# NextAuth
NEXTAUTH_URL="http://localhost:3005"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"

# API Keys (add your keys here)
THE_ODDS_API_KEY=your_odds_api_key_here
SPORTSDATA_API_KEY=your_sportsdata_api_key_here
EOF
    echo -e "${GREEN}✅ Created .env.local${NC}"
fi

# Generate Prisma Client
if command -v npx &> /dev/null; then
    echo -e "${BLUE}📦 Generating Prisma Client...${NC}"
    npx prisma generate
    
    echo -e "${GREEN}✅ Prisma Client generated!${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma not found. Run 'npm install' first, then 'npm run db:generate'${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Schema setup complete!${NC}"
echo ""
echo "Database connection:"
echo "  Database: $DB_NAME"
echo "  Schema: oddsoracle"
echo "  Connection: $DB_URL"
echo ""
echo "Next steps:"
echo "  1. Verify: npm run db:studio"
echo "  2. Start dev server: npm run dev"
echo "  3. Visit: http://localhost:3005/auth/signin"
echo ""

