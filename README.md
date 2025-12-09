# The Odds Oracle

A Next.js application for viewing meaningful sports betting matchups and statistics, starting with college basketball.

## Features

- **Dashboard**: View upcoming college basketball matchups with betting odds
- **Matchup Details**: Click on any matchup to see detailed statistics including:
  - Team records (W-L)
  - Points per game (offense/defense)
  - Recent form (last 5-10 games)
  - Head-to-head history

## Tech Stack

- **Next.js 14+** (App Router) with TypeScript
- **Tailwind CSS** for styling
- **NextUI** for UI components
- **Prisma** (scaffolded for future database use)
- **The Odds API** for betting odds
- **API Basketball** (or similar) for statistics

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- API keys for:
  - [The Odds API](https://theoddsapi.com/)
  - [API Basketball](https://www.api-basketball.com/) (via RapidAPI)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/TheOddsOracle/TheOddsOracle.git
cd TheOddsOracle
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
```
THE_ODDS_API_KEY=your_odds_api_key_here
STATS_API_KEY=your_stats_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Setup

### The Odds API

1. Sign up at [theoddsapi.com](https://theoddsapi.com/)
2. Get your API key from the dashboard
3. Add it to `.env.local` as `THE_ODDS_API_KEY`

### Stats API (API Basketball)

1. Sign up at [RapidAPI](https://rapidapi.com/api-sports/api/api-basketball) or [api-basketball.com](https://www.api-basketball.com/)
2. **Subscribe to the API**: Go to https://rapidapi.com/api-sports/api/api-basketball and subscribe (free tier available)
3. Get your API key from the RapidAPI dashboard
4. Add it to `.env.local` as `STATS_API_KEY`

**Important Notes**:
- Make sure you're subscribed to the API-Basketball API on RapidAPI (not just signed up)
- If using RapidAPI teams, ensure your team is added to the subscription
- Check the "Endpoints" tab in RapidAPI to verify the exact endpoint structure
- The stats API integration includes mock data fallbacks for development

**Troubleshooting**:
- If you get "not subscribed" errors, verify your subscription is active in RapidAPI
- If you get 403 errors, check that the endpoint structure matches the RapidAPI documentation
- Rate limits (429) are normal on free tiers - the app will fall back to mock data

## Project Structure

```
TheOddsOracle/
├── app/
│   ├── layout.tsx              # Root layout with NextUI provider
│   ├── page.tsx                 # Dashboard with upcoming matchups
│   ├── matchup/
│   │   └── [id]/
│   │       └── page.tsx         # Matchup detail page
│   └── api/
│       ├── odds/
│       │   └── route.ts         # API route for fetching odds
│       └── stats/
│           └── route.ts         # API route for fetching stats
├── components/
│   ├── MatchupCard.tsx          # Card component for matchup list
│   └── StatsDisplay.tsx          # Component for displaying stats
├── lib/
│   ├── odds-api.ts              # The Odds API client
│   ├── stats-api.ts             # Stats API client
│   └── utils.ts                 # Utility functions
├── prisma/
│   └── schema.prisma            # Prisma schema (scaffolded)
└── types/
    └── index.ts                 # TypeScript types/interfaces
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Future Enhancements

- Expand to other sports (NBA, NFL, etc.)
- Add database integration with Prisma
- User authentication and saved matchups
- Advanced statistics and analytics
- Real-time updates

## License

ISC
