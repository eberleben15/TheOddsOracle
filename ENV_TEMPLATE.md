# Environment Variables Template

Copy this template to `.env.local` and fill in your values.

```bash
# ============================================
# DATABASE CONFIGURATION
# ============================================
# Local PostgreSQL connection string
# Format: postgresql://username:password@host:port/database
DATABASE_URL="postgresql://postgres:password@localhost:5432/theoddsoracle?schema=public"

# ============================================
# NEXTAUTH CONFIGURATION
# ============================================
# Your app URL (change in production)
NEXTAUTH_URL="http://localhost:3005"

# Secret key for NextAuth (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="generate-a-random-32-character-secret-here"

# ============================================
# OAUTH PROVIDERS (Optional)
# ============================================
# Google OAuth - Get from https://console.cloud.google.com/
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# ============================================
# EMAIL PROVIDER (Optional)
# ============================================
# Only configure if you want email-based sign-in
# For Gmail, use an App Password: https://support.google.com/accounts/answer/185833
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@theoddsoracle.com"

# ============================================
# EXISTING API KEYS
# ============================================
THE_ODDS_API_KEY=your_odds_api_key_here
SPORTSDATA_API_KEY=your_sportsdata_api_key_here
```

## Quick Setup Commands

1. **Generate NextAuth Secret**:
   ```bash
   openssl rand -base64 32
   ```

2. **Create .env.local**:
   ```bash
   cp ENV_TEMPLATE.md .env.local
   # Then edit .env.local with your values
   ```

3. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

4. **Push Schema to Database**:
   ```bash
   npm run db:push
   ```

