# SportsData.io Setup Guide

## Step 1: Sign Up

1. Go to https://sportsdata.io
2. Click "Sign Up" or "Get Started"
3. Create an account
4. Navigate to the **CBB (College Basketball)** product
5. Start with the **Free Trial** (1,000 API calls/month)

## Step 2: Get Your API Key

1. After signing up, go to your Dashboard
2. Find the CBB product section
3. Copy your API key (it will look like: `a1b2c3d4e5f6g7h8i9j0`)

## Step 3: Add to Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your key:
   ```
   SPORTSDATA_API_KEY=your_actual_key_here
   ```

## Step 4: Test Endpoints in Postman

Test these endpoints to verify your key works:

### Get All Teams
```
GET https://api.sportsdata.io/v3/cbb/scores/json/Teams?key=YOUR_KEY
```

### Get Team Season Stats (2025 season)
```
GET https://api.sportsdata.io/v3/cbb/stats/json/TeamSeasonStats/2025?key=YOUR_KEY
```

### Get Games for Today
```
GET https://api.sportsdata.io/v3/cbb/scores/json/GamesByDate/2024-12-12?key=YOUR_KEY
```

### Check if Any Games Are Live
```
GET https://api.sportsdata.io/v3/cbb/scores/json/AreAnyGamesInProgress?key=YOUR_KEY
```

## What to Verify

✅ **Four Factors in Team Stats:**
- `EffectiveFieldGoalsPercentage`
- `TurnOversPercentage`
- `OffensiveReboundsPercentage`
- `FreeThrowAttemptRate`

✅ **Advanced Metrics:**
- `OffensiveRating` (points per 100 possessions)
- `DefensiveRating`
- `Possessions` (for tempo/pace)

✅ **Game Data:**
- Live game status
- Box scores with detailed shooting stats
- Team schedules and results

## Pricing Tiers

- **Free Trial:** 1,000 calls/month (good for testing)
- **Starter:** $50/month - 10,000 calls
- **Pro:** $150/month - 100,000 calls
- **Enterprise:** Custom pricing

## Next Steps

After setup is complete, the app will automatically use SportsData.io for all NCAA basketball statistics. The Odds API will still be used for betting lines.

