/**
 * Player Props Module
 * 
 * Comprehensive player props system for NBA betting.
 * Includes stats fetching, analytics, predictions, and value identification.
 */

// Types
export * from "./player-types";

// ESPN Player API
export {
  getNBATeamRoster,
  getNBAPlayerSeasonStats,
  getNBAPlayerGameLog,
  findNBATeamId,
  getPlayersForGame,
  getPlayerStatsForRoster,
  getGameBoxScore,
  type BoxScorePlayerStats,
} from "./espn-player-api";

// Player Cache
export { playerCache } from "./player-cache";

// Odds API
export {
  getEventPlayerProps,
  aggregatePlayerProps,
  getUpcomingEventsWithProps,
  getAllPlayerPropsForSport,
  americanToDecimal,
  americanToImpliedProbability,
  type PropMarketSet,
} from "./player-props-odds-api";

// Player Analytics
export {
  calculatePlayerAnalytics,
  getPlayerAnalyticsForGame,
  getStatForPropType,
  getConsistencyScore,
} from "./player-analytics";

// Prop Predictor
export {
  predictProp,
  predictPropsForGame,
  rankPredictionsByValue,
} from "./prop-predictor";

// Value Engine
export {
  findValuePropsForGame,
  findValuePropsForMultipleGames,
  getTopValueBets,
  filterValueBetsByTier,
  filterValueBetsByPropType,
  calculateKellyStake,
  formatValueBetSummary,
  type ValueEngineResult,
  type MultiGameValueResult,
} from "./prop-value-engine";

// Database Operations
export {
  upsertPlayer,
  upsertPlayers,
  getPlayerById,
  getPlayersByTeam,
  savePropPrediction,
  savePropPredictions,
  getPropPredictionsForGame,
  getPropPredictionsByPlayer,
  getValuePropPredictions,
  validatePropPrediction,
  validatePropPredictionsFromBoxScore,
  getPropPerformanceStats,
  getRecentPropPredictions,
} from "./player-props-db";
