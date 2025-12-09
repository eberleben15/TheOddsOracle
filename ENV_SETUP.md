# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

## Required API Keys

### The Odds API
```
THE_ODDS_API_KEY=your_odds_api_key_here
```

Get your API key from: https://theoddsapi.com/

### Stats API (API Basketball)
```
STATS_API_KEY=your_stats_api_key_here
```

Get your API key from:
- RapidAPI: https://rapidapi.com/api-sports/api/api-basketball
- Or directly from: https://www.api-basketball.com/

## Example .env.local file

```
THE_ODDS_API_KEY=abc123xyz789
STATS_API_KEY=rapidapi_key_here
```

## Notes

- The `.env.local` file is already in `.gitignore` and will not be committed
- If API keys are not set, the app will use mock data for development
- Make sure to restart your development server after adding environment variables

