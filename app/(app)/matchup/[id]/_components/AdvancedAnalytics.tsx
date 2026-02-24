"use client";

import { Card, CardBody, CardHeader, Progress, Chip, Spinner } from "@nextui-org/react";
import { TeamStats, GameResult } from "@/types";
import {
  calculateTeamAnalytics,
  predictMatchup,
  identifyValueBets,
  TeamAnalytics,
  MatchupPrediction,
  AlternateSpread,
} from "@/lib/advanced-analytics";
import { TeamLogo } from "@/components/TeamLogo";
import { FaChartLine, FaFire, FaTrophy, FaBullseye, FaLightbulb } from "react-icons/fa";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { OddsGame } from "@/types";
import { ParsedOdds } from "@/lib/odds-utils";
import { getSportFromGame } from "@/lib/sports/sport-detection";
import { buildBestOddsSnapshot } from "@/lib/odds-utils";
import { useState, useEffect, useMemo, useCallback } from "react";
import React from "react";

interface AdvancedAnalyticsProps {
  awayTeamStats: TeamStats;
  homeTeamStats: TeamStats;
  awayRecentGames: GameResult[];
  homeRecentGames: GameResult[];
  odds?: import("@/lib/odds-utils").OddsSnapshotForRecs | null;
  game?: OddsGame;
  parsedOdds?: ParsedOdds[];
}

interface StoredPrediction {
  id: string;
  predictedScore: { home: number; away: number };
  predictedSpread: number;
  alternateSpread: AlternateSpread | null;
  winProbability: { home: number; away: number };
  confidence: number;
  keyFactors: string[];
  valueBets: Array<{ type: string; recommendation: string; confidence: number; reason: string }>;
  simulation?: {
    homeScore: { percentiles: { p25: number; p75: number } };
    awayScore: { percentiles: { p25: number; p75: number } };
    confidenceIntervals: {
      spread: { lower: number; upper: number };
      total: { lower: number; upper: number };
    };
    simulationCount: number;
  };
}

export function AdvancedAnalytics({
  awayTeamStats,
  homeTeamStats,
  awayRecentGames,
  homeRecentGames,
  odds,
  game,
  parsedOdds,
}: AdvancedAnalyticsProps) {
  const sport = game ? getSportFromGame(game) : undefined;
  const gameId = game?.id;

  // State for fetched prediction
  const [storedPrediction, setStoredPrediction] = useState<StoredPrediction | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [apiPrediction, setApiPrediction] = useState<StoredPrediction | null>(null);
  const [apiPredictionLoading, setApiPredictionLoading] = useState(false);
  const [apiPredictionError, setApiPredictionError] = useState(false);
  const [apiRetryKey, setApiRetryKey] = useState(0);
  const [usedFallback, setUsedFallback] = useState(false);

  // Fetch existing prediction from database
  useEffect(() => {
    if (!gameId) {
      setPredictionLoading(false);
      return;
    }

    fetch(`/api/predictions/${gameId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.exists && data.prediction) {
          setStoredPrediction({
            id: data.prediction.id,
            predictedScore: data.prediction.predictedScore,
            predictedSpread: data.prediction.predictedSpread,
            alternateSpread: data.prediction.alternateSpread,
            winProbability: data.prediction.winProbability,
            confidence: data.prediction.confidence,
            keyFactors: data.prediction.keyFactors ?? [],
            valueBets: data.prediction.valueBets ?? [],
            simulation: data.prediction.simulation,
          });
        }
        setPredictionLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to fetch prediction:", err);
        setPredictionLoading(false);
      });
  }, [gameId]);

  // When no stored prediction, fetch from matchup-prediction API for full prediction + simulation
  const retryApiPrediction = () => {
    setApiPredictionError(false);
    setApiPrediction(null);
    setApiRetryKey((k) => k + 1);
  };
  useEffect(() => {
    if (predictionLoading || storedPrediction || !game?.away_team || !game?.home_team) return;
    setApiPredictionLoading(true);
    setApiPredictionError(false);
    const sportKey = game?.sport_key ?? sport ?? "cbb";
    const params = new URLSearchParams({
      awayTeam: game.away_team,
      homeTeam: game.home_team,
      sport: typeof sportKey === "string" ? sportKey : "cbb",
    });
    fetch(`/api/matchup-prediction?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.prediction) {
          const p = data.prediction;
          setApiPrediction({
            id: "",
            predictedScore: p.predictedScore,
            predictedSpread: p.predictedSpread,
            alternateSpread: p.alternateSpread ?? null,
            winProbability: p.winProbability,
            confidence: p.confidence,
            keyFactors: p.keyFactors ?? [],
            valueBets: p.valueBets ?? [],
            simulation: p.simulation,
          });
          setApiPredictionError(false);
        } else {
          setApiPredictionError(true);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch matchup prediction:", err);
        setApiPredictionError(true);
      })
      .finally(() => setApiPredictionLoading(false));
  }, [predictionLoading, storedPrediction, game?.away_team, game?.home_team, game?.sport_key, sport, apiRetryKey]);

  // Calculate analytics for display (needed for team comparison cards)
  const awayAnalytics = useMemo(
    () => calculateTeamAnalytics(awayTeamStats, awayRecentGames, false, sport),
    [awayTeamStats, awayRecentGames, sport]
  );
  const homeAnalytics = useMemo(
    () => calculateTeamAnalytics(homeTeamStats, homeRecentGames, true, sport),
    [homeTeamStats, homeRecentGames, sport]
  );

  // Fallback prediction (client-side, only when no stored or API prediction)
  const fallbackPrediction = useMemo(() => {
    if (storedPrediction || apiPrediction || predictionLoading) return null;
    setUsedFallback(true);
    const base = predictMatchup(awayAnalytics, homeAnalytics, awayTeamStats, homeTeamStats, sport);
    return odds ? identifyValueBets(base, odds) : base;
  }, [storedPrediction, apiPrediction, predictionLoading, awayAnalytics, homeAnalytics, awayTeamStats, homeTeamStats, sport, odds]);

  // Track prediction for feedback loop (fallback or API-sourced)
  useEffect(() => {
    const toTrack = apiPrediction ?? fallbackPrediction;
    if (!toTrack || !game?.id) return;
    const pred = {
      predictedScore: toTrack.predictedScore,
      predictedSpread: toTrack.predictedSpread,
      winProbability: toTrack.winProbability,
      confidence: toTrack.confidence,
      keyFactors: toTrack.keyFactors,
      valueBets: toTrack.valueBets,
    };
    fetch("/api/predictions/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: game.id,
        date: game.commence_time,
        homeTeam: game.home_team,
        awayTeam: game.away_team,
        prediction: pred,
        sport: game.sport_key ?? undefined,
        keyFactors: pred.keyFactors?.length ? pred.keyFactors : undefined,
        valueBets: pred.valueBets?.length ? pred.valueBets : undefined,
      }),
    }).catch((err) => console.warn("Failed to track prediction:", err));
  }, [apiPrediction, fallbackPrediction, game?.id, game?.commence_time, game?.home_team, game?.away_team, game?.sport_key]);

  // Build the prediction object for display (stored > API with simulation > local fallback)
  const prediction: MatchupPrediction = useMemo(() => {
    if (storedPrediction) {
      return {
        predictedScore: storedPrediction.predictedScore,
        predictedSpread: storedPrediction.predictedSpread,
        alternateSpread: storedPrediction.alternateSpread ?? undefined,
        winProbability: storedPrediction.winProbability,
        confidence: storedPrediction.confidence,
        keyFactors: storedPrediction.keyFactors,
        valueBets: storedPrediction.valueBets.map((v) => ({
          ...v,
          type: (v.type === "spread" || v.type === "total" || v.type === "moneyline" ? v.type : "moneyline") as "spread" | "total" | "moneyline",
        })),
        simulation: storedPrediction.simulation,
      } as MatchupPrediction;
    }
    if (apiPrediction) {
      return {
        predictedScore: apiPrediction.predictedScore,
        predictedSpread: apiPrediction.predictedSpread,
        alternateSpread: apiPrediction.alternateSpread ?? undefined,
        winProbability: apiPrediction.winProbability,
        confidence: apiPrediction.confidence,
        keyFactors: apiPrediction.keyFactors,
        valueBets: apiPrediction.valueBets.map((v) => ({
          ...v,
          type: (v.type === "spread" || v.type === "total" || v.type === "moneyline" ? v.type : "moneyline") as "spread" | "total" | "moneyline",
        })),
        simulation: apiPrediction.simulation,
      } as MatchupPrediction;
    }
    if (fallbackPrediction) {
      return fallbackPrediction;
    }
    // Default empty prediction while loading
    return {
      predictedScore: { home: 0, away: 0 },
      predictedSpread: 0,
      winProbability: { home: 50, away: 50 },
      confidence: 0,
      keyFactors: [],
      valueBets: [],
    };
  }, [storedPrediction, apiPrediction, fallbackPrediction]);

  // Analyze favorable bets
  const [favorableBetAnalysis, setFavorableBetAnalysis] = useState<any>(null);
  const [FavorableBetsComponent, setFavorableBetsComponent] = useState<React.ComponentType<{ analysis: any }> | null>(null);

  useEffect(() => {
    if (!gameId || !parsedOdds?.length || predictionLoading || prediction.confidence === 0) return;
    Promise.all([
      import("@/lib/favorable-bet-engine"),
      import("@/components/FavorableBets"),
    ]).then(([{ analyzeFavorableBets }, { FavorableBets }]) => {
      try {
        const analysis = analyzeFavorableBets(
          game!,
          parsedOdds,
          prediction,
          awayTeamStats,
          homeTeamStats
        );
        setFavorableBetAnalysis(analysis);
        setFavorableBetsComponent(() => FavorableBets);

        // Enrich stored prediction with favorable bets and odds snapshot for feedback
        const favorableBets = analysis.bets?.map((b: any) => ({
          type: b.type,
          team: b.team,
          recommendation: b.recommendation,
          bookmaker: b.bookmaker,
          edge: b.edge,
          confidence: b.confidence,
          valueRating: b.valueRating,
          ourProbability: b.ourPrediction?.probability ?? 0,
          impliedProbability: b.currentOdds?.impliedProbability ?? 0,
        }));
        const oddsSnapshot = buildBestOddsSnapshot(parsedOdds);
        fetch("/api/predictions/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gameId, favorableBets, oddsSnapshot }),
        }).catch((err) => console.warn("Failed to enrich prediction:", err));
      } catch (error) {
        console.warn("Error analyzing favorable bets:", error);
      }
    });
  }, [gameId, parsedOdds, predictionLoading, prediction, awayTeamStats?.pointsPerGame, homeTeamStats?.pointsPerGame, game]);

  // Helper function to safely display numbers
  const safeNumber = (value: number, decimals: number = 1): string => {
    if (isNaN(value) || !isFinite(value)) {
      return "--";
    }
    return value.toFixed(decimals);
  };

  // Show loading state
  if (predictionLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-lg">
        <CardBody className="p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" />
            <span className="text-sm text-gray-500">Loading prediction...</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Check if we have valid prediction data
  const hasValidPrediction = 
    !isNaN(prediction.predictedScore.away) && 
    !isNaN(prediction.predictedScore.home) &&
    !isNaN(prediction.winProbability.away) &&
    !isNaN(prediction.winProbability.home);

  return (
    <div className="space-y-6">
      {/* Win Probability & Prediction */}
      <Card className="bg-white border border-gray-200 shadow-lg">
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FaTrophy className="text-gray-600" size={20} />
            <h3 className="text-xl font-semibold text-text-dark">AI-Powered Prediction</h3>
            {hasValidPrediction && (
              <Chip size="sm" className="bg-gray-100 text-gray-700" variant="flat">
                {safeNumber(prediction.confidence, 0)}% Confidence
              </Chip>
            )}
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <div className="space-y-6">
            {/* Win Probability */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <TeamLogo teamName={awayTeamStats.name} size={32} />
                  <span className="font-semibold text-text-dark">{awayTeamStats.name}</span>
                </div>
                <span className="text-2xl font-bold text-gray-700">
                  {safeNumber(prediction.winProbability.away, 1)}%
                </span>
              </div>
              
              <Progress
                value={prediction.winProbability.away}
                className="mb-4"
                classNames={{
                  indicator: "bg-gray-600"
                }}
                size="lg"
              />
              
              <Progress
                value={prediction.winProbability.home}
                className="mb-3"
                classNames={{
                  indicator: "bg-gray-600"
                }}
                size="lg"
              />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <TeamLogo teamName={homeTeamStats.name} size={32} />
                  <span className="font-semibold text-text-dark">{homeTeamStats.name}</span>
                </div>
                <span className="text-2xl font-bold text-gray-700">
                  {safeNumber(prediction.winProbability.home, 1)}%
                </span>
              </div>
            </div>

            {/* Predicted Score */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Predicted Final Score
              </h4>
              {hasValidPrediction ? (
                <>
                  <div className="flex justify-center items-center gap-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-700 mb-1">
                        {safeNumber(prediction.predictedScore.away, 0)}
                      </div>
                      <div className="text-sm text-gray-500">{awayTeamStats.name.split(' ')[0]}</div>
                    </div>
                    <div className="text-2xl font-bold text-gray-400">-</div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-700 mb-1">
                        {safeNumber(prediction.predictedScore.home, 0)}
                      </div>
                      <div className="text-sm text-gray-500">{homeTeamStats.name.split(' ')[0]}</div>
                    </div>
                  </div>
                  <div className="text-center mt-3 space-y-2">
                    <div>
                      <span className="text-sm text-text-body">
                        Predicted Spread: <span className="font-semibold">{homeTeamStats.name.split(' ')[0]} {prediction.predictedSpread > 0 ? '-' : '+'}{safeNumber(Math.abs(prediction.predictedSpread), 1)}</span>
                      </span>
                    </div>
                    {prediction.simulation ? (
                      <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-2">
                          Monte Carlo uncertainty ({prediction.simulation.simulationCount.toLocaleString()} runs)
                        </div>
                        <div className="text-sm text-slate-700 space-y-1">
                          <div>
                            <span className="text-slate-500">Score range (25th–75th):</span>{" "}
                            {awayTeamStats.name.split(' ')[0]} {Math.round(prediction.simulation.awayScore.percentiles.p25)}–{Math.round(prediction.simulation.awayScore.percentiles.p75)} · {homeTeamStats.name.split(' ')[0]} {Math.round(prediction.simulation.homeScore.percentiles.p25)}–{Math.round(prediction.simulation.homeScore.percentiles.p75)}
                          </div>
                          <div>
                            <span className="text-slate-500">Spread 80% CI:</span>{" "}
                            {prediction.simulation.confidenceIntervals.spread.lower >= 0 ? '+' : ''}{Math.round(prediction.simulation.confidenceIntervals.spread.lower)} to {prediction.simulation.confidenceIntervals.spread.upper >= 0 ? '+' : ''}{Math.round(prediction.simulation.confidenceIntervals.spread.upper)}
                          </div>
                          <div>
                            <span className="text-slate-500">Total 80% CI:</span>{" "}
                            {Math.round(prediction.simulation.confidenceIntervals.total.lower)}–{Math.round(prediction.simulation.confidenceIntervals.total.upper)}
                          </div>
                        </div>
                      </div>
                    ) : apiPredictionLoading && hasValidPrediction ? (
                      <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2 text-sm text-slate-600">
                        <Spinner size="sm" />
                        Simulating uncertainty…
                      </div>
                    ) : apiPredictionError && hasValidPrediction ? (
                      <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-sm text-amber-800">
                        <span>Uncertainty simulation unavailable</span>
                        <button
                          type="button"
                          onClick={retryApiPrediction}
                          className="text-xs font-medium text-amber-700 hover:underline"
                        >
                          Retry
                        </button>
                      </div>
                    ) : null}
                    {prediction.alternateSpread && (() => {
                      const alt = prediction.alternateSpread;
                      const isUnderdog = (alt.team === 'home' && alt.spread < 0) || (alt.team === 'away' && alt.spread > 0);
                      const sign = isUnderdog ? '+' : '-';
                      const teamName = alt.team === 'home' ? homeTeamStats.name.split(' ')[0] : awayTeamStats.name.split(' ')[0];
                      return (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                        alt.riskLevel === 'safer' 
                          ? 'bg-green-50 text-green-700 border border-green-200' 
                          : alt.riskLevel === 'aggressive'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        <span className="font-medium">
                          Alt: {teamName} {sign}{Math.abs(alt.spread).toFixed(1)}
                        </span>
                        <span className="text-[10px] opacity-75">
                          ({alt.riskLevel} • {safeNumber(alt.confidence, 1)}% conf)
                        </span>
                      </div>
                    ); })()}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-text-body">
                    <ExclamationTriangleIcon className="h-4 w-4 text-gray-500" />
                    <span>Predictions unavailable — team stats required (CBB uses ESPN)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Key Factors */}
            {prediction.keyFactors.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Key Factors
                </h4>
                <div className="space-y-2">
                  {prediction.keyFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <FaBullseye className="text-gray-600 mt-0.5 flex-shrink-0" size={14} />
                      <span className="text-sm text-text-dark">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Favorable Bet Engine Results */}
      {favorableBetAnalysis && favorableBetAnalysis.totalValueBets > 0 && FavorableBetsComponent && (
        <FavorableBetsComponent analysis={favorableBetAnalysis} />
      )}

      {/* Legacy Value Bets (fallback) */}
      {prediction.valueBets.length > 0 && !favorableBetAnalysis && (
        <Card className="bg-value-light border-2 border-value/30">
          <CardHeader className="border-b border-value/20">
            <div className="flex items-center gap-2">
              <FaLightbulb className="text-value" size={20} />
              <h3 className="text-xl font-semibold text-text-dark">Value Bet Opportunities</h3>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="space-y-4">
              {prediction.valueBets.map((bet, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-lg border border-value/30"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-text-dark mb-1">
                        {bet.recommendation}
                      </div>
                      <div className="text-xs text-value uppercase tracking-wide font-medium">
                        {bet.type}
                      </div>
                    </div>
                    <Chip size="sm" className="bg-value text-white" variant="solid">
                      {safeNumber(bet.confidence, 0)}% Confidence
                    </Chip>
                  </div>
                  <p className="text-sm text-text-body">{bet.reason}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Team Analytics Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Momentum & Form */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FaFire className="text-gray-600" size={18} />
              <h3 className="text-lg font-semibold text-text-dark">Momentum & Form</h3>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="space-y-6">
              {/* Away Team */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={awayTeamStats.name} size={24} />
                    <span className="font-medium text-text-dark">{awayTeamStats.name.split(' ')[0]}</span>
                  </div>
                  <Chip
                    size="sm"
                    className={awayAnalytics.momentum > 0 ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-600"}
                    variant="flat"
                  >
                    {awayAnalytics.momentum > 0 ? '+' : ''}{safeNumber(awayAnalytics.momentum, 0)}
                  </Chip>
                </div>
                <div className="text-sm text-text-body mb-2">
                  <span className="font-medium">Form:</span> {awayAnalytics.recentForm}
                  <span className="ml-3">
                    ({awayAnalytics.last5Record.wins}-{awayAnalytics.last5Record.losses} L5)
                  </span>
                </div>
                <div className="text-sm text-text-body">
                  <span className="font-medium">Streak:</span>{' '}
                  {awayAnalytics.winStreak > 0 ? `${awayAnalytics.winStreak}W` : `${Math.abs(awayAnalytics.winStreak)}L`}
                </div>
              </div>

              {/* Home Team */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo teamName={homeTeamStats.name} size={24} logo={homeTeamStats.logo} />
                    <span className="font-medium text-text-dark">{homeTeamStats.name.split(' ')[0]}</span>
                  </div>
                  <Chip
                    size="sm"
                    className={homeAnalytics.momentum > 0 ? "bg-gray-100 text-gray-700" : "bg-gray-200 text-gray-600"}
                    variant="flat"
                  >
                    {homeAnalytics.momentum > 0 ? '+' : ''}{safeNumber(homeAnalytics.momentum, 0)}
                  </Chip>
                </div>
                <div className="text-sm text-text-body mb-2">
                  <span className="font-medium">Form:</span> {homeAnalytics.recentForm}
                  <span className="ml-3">
                    ({homeAnalytics.last5Record.wins}-{homeAnalytics.last5Record.losses} L5)
                  </span>
                </div>
                <div className="text-sm text-text-body">
                  <span className="font-medium">Streak:</span>{' '}
                  {homeAnalytics.winStreak > 0 ? `${homeAnalytics.winStreak}W` : `${Math.abs(homeAnalytics.winStreak)}L`}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Advanced Metrics */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FaChartLine className="text-gray-600" size={18} />
              <h3 className="text-lg font-semibold text-text-dark">Advanced Metrics</h3>
            </div>
          </CardHeader>
          <CardBody className="p-6">
            <div className="space-y-4">
              {/* Net Rating */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Net Rating
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-gray-700">{safeNumber(awayAnalytics.netRating, 1)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-gray-500">vs</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-700">{safeNumber(homeAnalytics.netRating, 1)}</span>
                  </div>
                </div>
              </div>

              {/* Offensive Efficiency */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Offensive Rating
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-gray-700">{safeNumber(awayAnalytics.offensiveRating, 1)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-gray-500">O-Rating</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-700">{safeNumber(homeAnalytics.offensiveRating, 1)}</span>
                  </div>
                </div>
              </div>

              {/* Defensive Efficiency */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Defensive Rating
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-gray-700">{safeNumber(awayAnalytics.defensiveRating, 1)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-gray-500">D-Rating</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-700">{safeNumber(homeAnalytics.defensiveRating, 1)}</span>
                  </div>
                </div>
              </div>

              {/* Assist/TO Ratio */}
              <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                  Assist/Turnover Ratio
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex-1 text-right">
                    <span className="font-bold text-gray-700">{safeNumber(awayAnalytics.assistToTurnoverRatio, 2)}</span>
                  </div>
                  <div className="w-32 text-center text-xs text-gray-500">AST/TO</div>
                  <div className="flex-1">
                    <span className="font-bold text-gray-700">{safeNumber(homeAnalytics.assistToTurnoverRatio, 2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

