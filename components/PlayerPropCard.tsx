"use client";

import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import type { PropPrediction, PropValueBet } from "@/lib/player-props/player-types";
import { PROP_TYPE_LABELS } from "@/lib/player-props/player-types";

interface PlayerPropCardProps {
  prediction: PropPrediction;
  valueBet?: PropValueBet;
  compact?: boolean;
  showDetails?: boolean;
}

export function PlayerPropCard({
  prediction,
  valueBet,
  compact = false,
  showDetails = true,
}: PlayerPropCardProps) {
  const {
    playerName,
    team,
    propType,
    line,
    predictedValue,
    confidence,
    edge,
    recommendation,
    factors,
    overOdds,
    underOdds,
    bestBookmaker,
    seasonAvg,
    last5Avg,
    last10Avg,
  } = prediction;

  const propLabel = PROP_TYPE_LABELS[propType] || propType;
  const isOver = recommendation === "over";
  const isPass = recommendation === "pass";
  const absEdge = Math.abs(edge);

  const edgeColor =
    absEdge >= 8
      ? "text-green-500"
      : absEdge >= 5
        ? "text-yellow-500"
        : absEdge >= 3
          ? "text-blue-500"
          : "text-gray-500";

  const confidenceColor =
    confidence >= 70
      ? "text-green-500"
      : confidence >= 50
        ? "text-yellow-500"
        : "text-red-500";

  const tierBadge = valueBet?.tier ? (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        valueBet.tier === "high"
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : valueBet.tier === "medium"
            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      }`}
    >
      {valueBet.tier.toUpperCase()}
    </span>
  ) : null;

  const formatOdds = (odds: number | undefined) => {
    if (!odds) return "N/A";
    return odds > 0 ? `+${odds}` : `${odds}`;
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-medium text-sm text-[var(--text-dark)]">
              {playerName}
            </span>
            <span className="text-xs text-gray-500">{team}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium">
              {propLabel} {recommendation.toUpperCase()} {line}
            </div>
            <div className="text-xs text-gray-500">
              Pred: {predictedValue} | Edge: {edge.toFixed(1)}%
            </div>
          </div>
          {!isPass && (
            <div
              className={`flex items-center justify-center h-8 w-8 rounded-full ${
                isOver
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
              }`}
            >
              {isOver ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg text-[var(--text-dark)]">
              {playerName}
            </h3>
            <p className="text-sm text-gray-500">{team}</p>
          </div>
          <div className="flex items-center gap-2">
            {tierBadge}
            {!isPass && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isOver
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {recommendation.toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Prop Line */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-sm text-gray-500">{propLabel}</span>
            <div className="text-2xl font-bold text-[var(--text-dark)]">
              {line}
            </div>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">Prediction</span>
            <div className="text-2xl font-bold text-[var(--text-dark)]">
              {predictedValue}
            </div>
          </div>
          <div
            className={`flex items-center justify-center h-12 w-12 rounded-full ${
              isPass
                ? "bg-gray-100 dark:bg-gray-800"
                : isOver
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-red-100 dark:bg-red-900/30"
            }`}
          >
            {isPass ? (
              <MinusIcon className="h-6 w-6 text-gray-500" />
            ) : isOver ? (
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />
            ) : (
              <ArrowTrendingDownIcon className="h-6 w-6 text-red-600" />
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <span className={`text-lg font-bold ${edgeColor}`}>
              {edge.toFixed(1)}%
            </span>
            <p className="text-xs text-gray-500">Edge</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <span className={`text-lg font-bold ${confidenceColor}`}>
              {Math.round(confidence)}%
            </span>
            <p className="text-xs text-gray-500">Confidence</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <span className="text-lg font-bold text-[var(--text-dark)]">
              {formatOdds(isOver ? overOdds : underOdds)}
            </span>
            <p className="text-xs text-gray-500">Odds</p>
          </div>
        </div>

        {/* Stats Comparison */}
        {showDetails && (seasonAvg || last5Avg || last10Avg) && (
          <div className="border-t border-[var(--border-color)] pt-4 mb-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <ChartBarIcon className="h-4 w-4" />
              Player Stats
            </h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-gray-500 block">Season</span>
                <span className="font-medium text-[var(--text-dark)]">
                  {seasonAvg?.toFixed(1) ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Last 10</span>
                <span className="font-medium text-[var(--text-dark)]">
                  {last10Avg?.toFixed(1) ?? "—"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Last 5</span>
                <span className="font-medium text-[var(--text-dark)]">
                  {last5Avg?.toFixed(1) ?? "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Factors */}
        {showDetails && factors && factors.length > 0 && (
          <div className="border-t border-[var(--border-color)] pt-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">
              Key Factors
            </h4>
            <ul className="space-y-1">
              {factors.map((factor, idx) => (
                <li
                  key={idx}
                  className="text-sm text-[var(--text-dark)] flex items-start gap-2"
                >
                  <span className="text-gray-400 mt-0.5">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Best Bookmaker */}
        {bestBookmaker && (
          <div className="mt-3 text-xs text-gray-500 text-right">
            Best odds at {bestBookmaker}
          </div>
        )}
      </div>
    </div>
  );
}

interface PlayerPropListProps {
  predictions: PropPrediction[];
  valueBets?: PropValueBet[];
  showAll?: boolean;
}

export function PlayerPropList({
  predictions,
  valueBets = [],
  showAll = false,
}: PlayerPropListProps) {
  const displayPredictions = showAll
    ? predictions
    : predictions.filter((p) => p.recommendation !== "pass");

  const valueBetMap = new Map(
    valueBets.map((vb) => [
      `${vb.prediction.playerId}:${vb.prediction.propType}`,
      vb,
    ])
  );

  if (displayPredictions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No player props available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayPredictions.map((prediction, idx) => {
        const key = `${prediction.playerId}:${prediction.propType}`;
        const valueBet = valueBetMap.get(key);
        
        return (
          <PlayerPropCard
            key={`${prediction.playerId}-${prediction.propType}-${idx}`}
            prediction={prediction}
            valueBet={valueBet}
          />
        );
      })}
    </div>
  );
}
