# MCP Server Setup Guide

## Overview

The Odds Oracle MCP server is now available as a **standalone repository**. It enables AI agents to access betting odds, team statistics, predictions, and recommendations with built-in microtransaction tracking.

## Standalone Repository

The MCP server has been moved to its own repository for independent deployment:

**Repository**: `odds-oracle-mcp-server`  
**Location**: `/Users/eberleben15/oddsoracle/odds-oracle-mcp-server/`

## What's Available

### 9 Tools Available:

1. **`get_upcoming_games`** - Get upcoming games with betting odds
   - Supports: cbb, nba, nfl, mlb, nhl
   - Cost: 1 credit

2. **`get_live_games`** - Get currently live games with scores
   - Supports: cbb, nba, nfl, mlb, nhl
   - Cost: 1 credit

3. **`get_game_odds`** - Get detailed odds for a specific game
   - Requires: gameId
   - Cost: 1 credit

4. **`get_team_stats`** - Get comprehensive team statistics
   - Includes: Four Factors, advanced metrics, recent games
   - Requires: teamName, optional sport
   - Cost: 1 credit

5. **`get_matchup_prediction`** - Get AI-powered matchup predictions
   - Includes: Win probabilities, predicted scores, confidence
   - Requires: awayTeam, homeTeam, optional sport
   - Cost: 2 credits (higher cost for predictions)

6. **`get_head_to_head`** - Get head-to-head history
   - Currently supports: CBB only
   - Requires: team1, team2, optional sport
   - Cost: 1 credit

7. **`get_recommended_bets`** - Get AI-identified value betting opportunities
   - Analyzes all upcoming games
   - Requires: optional sport, optional limit
   - Cost: 3 credits (higher cost for recommendations)

8. **`get_favorable_bets`** - Get favorable bets for a specific game
   - Requires: gameId
   - Cost: 2 credits

9. **`get_microtransaction_history`** - Get usage/billing history
   - Requires: agentId, optional limit
   - Cost: 0 credits (free)

### 3 Resources Available:

1. **`odds-oracle://games/upcoming`** - Upcoming games data
2. **`odds-oracle://games/live`** - Live games data
3. **`odds-oracle://microtransactions`** - Microtransaction history

## Installation

### Clone the Standalone Repository

```bash
cd /path/to/your/repos
git clone <repository-url> odds-oracle-mcp-server
cd odds-oracle-mcp-server
npm install
```

### Configuration

Create a `.env` file:

```env
# The Odds Oracle API URL
ODDS_ORACLE_API_URL=http://localhost:3005

# Optional: API key for authentication
ODDS_ORACLE_API_KEY=your_api_key_here
```

## Running the Server

### Development
```bash
cd odds-oracle-mcp-server
npm run dev
```

### Production
```bash
cd odds-oracle-mcp-server
npm start
```

## MCP Client Configuration

Add to your MCP client configuration (e.g., `.mcp.json` in Cursor):

```json
{
  "mcpServers": {
    "odds-oracle": {
      "command": "npx",
      "args": ["-y", "tsx", "/absolute/path/to/odds-oracle-mcp-server/index.ts"],
      "env": {
        "ODDS_ORACLE_API_URL": "http://localhost:3005",
        "ODDS_ORACLE_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Architecture

The standalone MCP server:
- **Uses HTTP API calls** to communicate with The Odds Oracle API
- **Independent deployment** - can be in a separate repository
- **Network-based** - works across different servers
- **Microtransaction tracking** - built-in usage tracking

## API Endpoints Required

The MCP server requires these endpoints in The Odds Oracle API:

- `GET /api/odds?sport=...` - Upcoming games
- `GET /api/live-games?sport=...` - Live games
- `GET /api/game-odds?gameId=...` - Game odds
- `GET /api/stats?type=team&name=...&sport=...` - Team stats
- `GET /api/stats?type=findTeam&name=...` - Find team
- `GET /api/stats?type=h2h&team1=...&team2=...` - Head-to-head
- `GET /api/matchup-prediction?awayTeam=...&homeTeam=...&sport=...` - Matchup prediction
- `GET /api/recommended-bets?sport=...&limit=...` - Recommended bets

## Usage Examples

### Get Upcoming Games
```json
{
  "tool": "get_upcoming_games",
  "arguments": {
    "sport": "cbb"
  }
}
```

### Get Matchup Prediction
```json
{
  "tool": "get_matchup_prediction",
  "arguments": {
    "awayTeam": "Wisconsin",
    "homeTeam": "Duke",
    "sport": "cbb"
  }
}
```

### Get Recommended Bets
```json
{
  "tool": "get_recommended_bets",
  "arguments": {
    "sport": "cbb",
    "limit": 5
  }
}
```

## Microtransaction Tracking

All tool calls are automatically tracked with:
- Agent ID
- Tool name
- Timestamp
- Cost (credits)
- Metadata

**Default Costs:**
- Standard calls: 1 credit
- Predictions: 2 credits
- Recommendations: 3 credits

## Notes

- The server runs as a standalone process
- All API calls are tracked for billing/usage
- Supports multiple sports (CBB, NBA, NFL, MLB, NHL)
- Error handling included for all tools
- JSON responses for easy parsing
- Requires The Odds Oracle API to be running and accessible
