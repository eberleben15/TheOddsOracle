# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

## Required API Keys

### 1. The Odds API (Betting Lines)

```
THE_ODDS_API_KEY=your_odds_api_key_here
```

Get your API key from: https://theoddsapi.com/

**Used for:**
- Real-time betting odds from multiple sportsbooks
- Game schedules and matchups
- Moneyline, spread, and total odds

### 2. SportsData.io (NCAA Basketball Stats)

```
SPORTSDATA_API_KEY=your_sportsdata_api_key_here
```

Get your API key from: https://sportsdata.io/

**Used for:**
- Team season statistics
- Four Factors (eFG%, TOV%, ORB%, FTR)
- Advanced metrics (Offensive/Defensive Rating, Pace)
- Recent games and head-to-head history
- Player statistics
- Live game scores

**Subscription tiers:**
- Free Trial: 1,000 calls/month (good for testing)
- Starter: $50/month - 10,000 calls
- Pro: $150/month - 100,000 calls

## Example .env.local file

```bash
# The Odds API - for betting lines
THE_ODDS_API_KEY=abc123xyz789

# SportsData.io - for NCAA basketball stats
SPORTSDATA_API_KEY=your_sportsdata_key_here
```

## Validation

After setting up your environment variables, validate the SportsData.io integration:

```bash
npx tsx scripts/validate-sportsdata.ts
```

This will test:
- API connection
- Team lookup
- Season statistics (including Four Factors)
- Recent games
- And more...

## Notes

- The `.env.local` file is already in `.gitignore` and will not be committed
- Restart your development server after adding environment variables (`npm run dev`)
- If `SPORTSDATA_API_KEY` is not set, stats will not be available on matchup pages
- The Odds API is used for betting lines; SportsData.io is used for all team statistics

## API Documentation

- **The Odds API:** https://theoddsapi.com/docs/
- **SportsData.io CBB:** https://sportsdata.io/developers/api-documentation/cbb
