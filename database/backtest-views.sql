-- ============================================
-- Backtest Views for The Odds Oracle
-- ============================================
-- Run after connecting to your database:
--   psql -U your_username -d dev_db -f database/backtest-views.sql
--
-- Views provide a unified interface for backtesting strategies
-- on validated prediction data.
-- ============================================

SET search_path TO oddsoracle, public;

-- ============================================
-- View 1: v_backtest_universe
-- ============================================
-- One row per validated prediction with computed ATS outcome, netUnits, etc.
-- Use closingSpread when available, else oddsSnapshot.spread for market line.

CREATE OR REPLACE VIEW oddsoracle.v_backtest_universe AS
SELECT
  p.id,
  p."gameId",
  p.date,
  p."homeTeam",
  p."awayTeam",
  p.sport,
  p."predictedSpread",
  p."predictedTotal",
  p.confidence,
  p."winProbability",
  p."predictedScore",
  p."favorableBets",
  p."oddsSnapshot",
  p."actualHomeScore",
  p."actualAwayScore",
  p."actualWinner",
  p."actualTotal",
  p."closingSpread",
  p."openingSpread",
  p."closingTotal",
  p."openingTotal",
  p."validatedAt",
  -- Market spread: prefer closing, else oddsSnapshot (Odds API: negative = home favored)
  COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float) AS market_spread,
  -- Actual margin from home perspective (positive = home won)
  (COALESCE(p."actualHomeScore", 0) - COALESCE(p."actualAwayScore", 0))::float AS actual_margin,
  -- ATS result: 1=win, -1=loss, 0=push (at -110 juice)
  -- lineInOurFormat = -marketSpread; betOnHome = predictedSpread > 0
  CASE
    WHEN p."actualHomeScore" IS NULL OR p."actualAwayScore" IS NULL THEN NULL
    WHEN COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float) IS NULL THEN NULL
    WHEN (p."predictedSpread" > 0) AND ((p."actualHomeScore" - p."actualAwayScore") - (-COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float))) > 0.5 THEN 1
    WHEN (p."predictedSpread" > 0) AND ((p."actualHomeScore" - p."actualAwayScore") - (-COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float))) < -0.5 THEN -1
    WHEN (p."predictedSpread" <= 0) AND ((-COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float)) - (p."actualHomeScore" - p."actualAwayScore")) > 0.5 THEN 1
    WHEN (p."predictedSpread" <= 0) AND ((-COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float)) - (p."actualHomeScore" - p."actualAwayScore")) < -0.5 THEN -1
    ELSE 0
  END AS ats_result,
  -- Net units: 0.91 on win, -1 on loss, 0 on push
  CASE
    WHEN p."actualHomeScore" IS NULL OR p."actualAwayScore" IS NULL THEN NULL
    WHEN COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float) IS NULL THEN NULL
    WHEN (p."predictedSpread" > 0) AND ((p."actualHomeScore" - p."actualAwayScore") - (-COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float))) > 0.5 THEN 0.91
    WHEN (p."predictedSpread" > 0) AND ((p."actualHomeScore" - p."actualAwayScore") - (-COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float))) < -0.5 THEN -1.0
    WHEN (p."predictedSpread" <= 0) AND ((-COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float)) - (p."actualHomeScore" - p."actualAwayScore")) > 0.5 THEN 0.91
    WHEN (p."predictedSpread" <= 0) AND ((-COALESCE(p."closingSpread", (p."oddsSnapshot"->>'spread')::float)) - (p."actualHomeScore" - p."actualAwayScore")) < -0.5 THEN -1.0
    ELSE 0.0
  END AS net_units
FROM oddsoracle.predictions p
WHERE p.validated = true
  AND p."actualHomeScore" IS NOT NULL
  AND p."actualAwayScore" IS NOT NULL;

COMMENT ON VIEW oddsoracle.v_backtest_universe IS 'Validated predictions with computed ATS outcome for backtesting';

-- ============================================
-- View 2: v_backtest_bet_opportunities
-- ============================================
-- Denormalizes favorableBets JSON into rows for bet-level backtesting.
-- Uses jsonb_array_elements when favorableBets is a JSON array.

CREATE OR REPLACE VIEW oddsoracle.v_backtest_bet_opportunities AS
SELECT
  p.id AS prediction_id,
  p."gameId",
  p.date,
  p."homeTeam",
  p."awayTeam",
  p.sport,
  p."actualHomeScore",
  p."actualAwayScore",
  bet.elem->>'type' AS bet_type,
  bet.elem->>'recommendation' AS recommendation,
  bet.elem->>'bookmaker' AS bookmaker,
  (bet.elem->>'edge')::float AS edge,
  (bet.elem->'currentOdds'->>'impliedProbability')::float AS implied_probability,
  bet.idx AS bet_index
FROM oddsoracle.predictions p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN p."favorableBets" IS NULL THEN '[]'::jsonb
    WHEN jsonb_typeof((p."favorableBets")::jsonb) = 'array' THEN (p."favorableBets")::jsonb
    ELSE '[]'::jsonb
  END
) WITH ORDINALITY AS bet(elem, idx)
WHERE p.validated = true
  AND p."actualHomeScore" IS NOT NULL
  AND p."actualAwayScore" IS NOT NULL;

COMMENT ON VIEW oddsoracle.v_backtest_bet_opportunities IS 'Favorable bets expanded for bet-level backtesting';

-- ============================================
-- View 3: v_backtest_ats_summary
-- ============================================
-- Aggregated ATS metrics by sport and confidence tier for quick performance checks.

CREATE OR REPLACE VIEW oddsoracle.v_backtest_ats_summary AS
SELECT
  u.sport,
  CASE
    WHEN u.confidence >= 75 THEN 'high'
    WHEN u.confidence >= 60 THEN 'medium'
    ELSE 'low'
  END AS confidence_tier,
  COUNT(*) AS game_count,
  COUNT(u.ats_result) FILTER (WHERE u.ats_result = 1) AS wins,
  COUNT(u.ats_result) FILTER (WHERE u.ats_result = -1) AS losses,
  COUNT(u.ats_result) FILTER (WHERE u.ats_result = 0) AS pushes,
  ROUND(100.0 * COUNT(*) FILTER (WHERE u.ats_result = 1) / NULLIF(COUNT(*) FILTER (WHERE u.ats_result IN (1, -1)), 0), 2) AS win_rate_pct,
  ROUND(SUM(COALESCE(u.net_units, 0))::numeric, 2) AS net_units
FROM oddsoracle.v_backtest_universe u
GROUP BY u.sport, confidence_tier;

COMMENT ON VIEW oddsoracle.v_backtest_ats_summary IS 'ATS metrics by sport and confidence tier';
