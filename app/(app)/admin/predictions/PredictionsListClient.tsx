"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Pagination, Select, SelectItem, Chip, Spinner } from "@nextui-org/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

interface AlternateSpread {
  spread: number;
  direction: 'buy' | 'sell';
  team: 'home' | 'away';
  reason: string;
  confidence: number;
  riskLevel: 'safer' | 'standard' | 'aggressive';
}

interface PredictionListItem {
  id: string;
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  sport: string | null;
  predictedScore: { home: number; away: number };
  predictedSpread: number;
  alternateSpread: AlternateSpread | null;
  predictedTotal: number | null;
  winProbability: { home: number; away: number };
  confidence: number;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualWinner: string | null;
  actualTotal: number | null;
  validated: boolean;
  validatedAt: string | null;
  createdAt: string;
  // CLV fields
  openingSpread: number | null;
  closingSpread: number | null;
  clvSpread: number | null;
  lineMovement: number | null;
}

interface PredictionListResponse {
  predictions: PredictionListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type FilterType = "all" | "validated" | "pending";
type SortOrder = "asc" | "desc";

function getSportLabel(sport: string | null): string {
  if (!sport) return "Unknown";
  const labels: Record<string, string> = {
    basketball_ncaab: "CBB",
    basketball_nba: "NBA",
    icehockey_nhl: "NHL",
    baseball_mlb: "MLB",
    cbb: "CBB",
    nba: "NBA",
    nhl: "NHL",
    mlb: "MLB",
  };
  return labels[sport] || sport.toUpperCase();
}

function getSportColor(sport: string | null): "default" | "primary" | "secondary" | "success" | "warning" | "danger" {
  if (!sport) return "default";
  if (sport.includes("ncaab") || sport === "cbb") return "warning";
  if (sport.includes("nba") || sport === "nba") return "primary";
  if (sport.includes("nhl") || sport === "nhl") return "secondary";
  if (sport.includes("mlb") || sport === "mlb") return "success";
  return "default";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PredictionRow({ prediction }: { prediction: PredictionListItem }) {
  const [expanded, setExpanded] = useState(false);

  const predictedWinner = prediction.winProbability.home > prediction.winProbability.away ? "home" : "away";
  const wasCorrect = prediction.validated && prediction.actualWinner === predictedWinner;
  const predictedTotal = prediction.predictedTotal ?? (prediction.predictedScore.home + prediction.predictedScore.away);
  
  const scoreDiffHome = prediction.validated && prediction.actualHomeScore != null
    ? prediction.actualHomeScore - prediction.predictedScore.home
    : null;
  const scoreDiffAway = prediction.validated && prediction.actualAwayScore != null
    ? prediction.actualAwayScore - prediction.predictedScore.away
    : null;
  const totalDiff = prediction.validated && prediction.actualTotal != null
    ? prediction.actualTotal - predictedTotal
    : null;
  const spreadDiff = prediction.validated && prediction.actualHomeScore != null && prediction.actualAwayScore != null
    ? (prediction.actualHomeScore - prediction.actualAwayScore) - prediction.predictedSpread
    : null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Chip size="sm" color={getSportColor(prediction.sport)} variant="flat">
            {getSportLabel(prediction.sport)}
          </Chip>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">
              {prediction.awayTeam} @ {prediction.homeTeam}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(prediction.date)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">
              {prediction.predictedScore.away} - {prediction.predictedScore.home}
            </div>
            <div className="text-xs text-gray-500">
              {(prediction.winProbability.home * 100).toFixed(0)}% home
            </div>
          </div>

          {prediction.validated ? (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {prediction.actualAwayScore} - {prediction.actualHomeScore}
                </div>
                <div className="text-xs text-gray-500">actual</div>
              </div>
              {wasCorrect ? (
                <CheckIcon className="w-5 h-5 text-green-500" />
              ) : (
                <span className="w-5 h-5 text-red-500 font-bold">✗</span>
              )}
            </div>
          ) : (
            <Chip size="sm" color="warning" variant="flat" startContent={<ClockIcon className="w-3 h-3" />}>
              Pending
            </Chip>
          )}

          {expanded ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">
            {/* Predicted Stats */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 border-b pb-1">
                Predicted
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-500">Home Score:</span>
                <span className="font-medium">{prediction.predictedScore.home}</span>
                <span className="text-gray-500">Away Score:</span>
                <span className="font-medium">{prediction.predictedScore.away}</span>
                <span className="text-gray-500">Spread:</span>
                <span className="font-medium">
                  {prediction.predictedSpread > 0 ? "+" : ""}{prediction.predictedSpread.toFixed(1)}
                </span>
                {prediction.alternateSpread && (
                  <>
                    <span className="text-gray-500">Alt Spread:</span>
                    <span className={`font-medium ${
                      prediction.alternateSpread.riskLevel === 'safer' ? 'text-green-600' :
                      prediction.alternateSpread.riskLevel === 'aggressive' ? 'text-orange-600' :
                      'text-blue-600'
                    }`}>
                      {prediction.alternateSpread.team === 'home' ? prediction.homeTeam.split(' ').pop() : prediction.awayTeam.split(' ').pop()} {prediction.alternateSpread.spread > 0 ? '-' : '+'}{Math.abs(prediction.alternateSpread.spread).toFixed(1)}
                      <span className="text-[10px] ml-1 opacity-75">({prediction.alternateSpread.riskLevel})</span>
                    </span>
                  </>
                )}
                <span className="text-gray-500">Total:</span>
                <span className="font-medium">{predictedTotal.toFixed(1)}</span>
                <span className="text-gray-500">Home Win %:</span>
                <span className="font-medium">{(prediction.winProbability.home * 100).toFixed(1)}%</span>
                <span className="text-gray-500">Confidence:</span>
                <span className="font-medium">{(prediction.confidence * 100).toFixed(0)}%</span>
              </div>
              {prediction.alternateSpread && (
                <div className="mt-2 text-xs text-gray-500 italic">
                  {prediction.alternateSpread.reason}
                </div>
              )}
            </div>

            {/* Actual Stats */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 border-b pb-1">
                Actual {prediction.validated ? "" : "(Pending)"}
              </h4>
              {prediction.validated ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Home Score:</span>
                  <span className="font-medium">{prediction.actualHomeScore}</span>
                  <span className="text-gray-500">Away Score:</span>
                  <span className="font-medium">{prediction.actualAwayScore}</span>
                  <span className="text-gray-500">Spread:</span>
                  <span className="font-medium">
                    {prediction.actualHomeScore != null && prediction.actualAwayScore != null
                      ? (prediction.actualHomeScore - prediction.actualAwayScore > 0 ? "+" : "") +
                        (prediction.actualHomeScore - prediction.actualAwayScore).toFixed(1)
                      : "-"}
                  </span>
                  <span className="text-gray-500">Total:</span>
                  <span className="font-medium">{prediction.actualTotal ?? "-"}</span>
                  <span className="text-gray-500">Winner:</span>
                  <span className="font-medium capitalize">{prediction.actualWinner}</span>
                  <span className="text-gray-500">Validated:</span>
                  <span className="font-medium text-xs">
                    {prediction.validatedAt ? new Date(prediction.validatedAt).toLocaleString() : "-"}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Game not yet completed or scores not fetched.
                </p>
              )}
            </div>

            {/* Accuracy Analysis */}
            {prediction.validated && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 border-b pb-1">
                  Accuracy
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Winner:</span>
                  <span className={`font-medium ${wasCorrect ? "text-green-600" : "text-red-600"}`}>
                    {wasCorrect ? "Correct" : "Wrong"}
                  </span>
                  <span className="text-gray-500">Home Diff:</span>
                  <span className={`font-medium flex items-center gap-1 ${scoreDiffHome !== null && Math.abs(scoreDiffHome) <= 5 ? "text-green-600" : "text-amber-600"}`}>
                    {scoreDiffHome !== null ? (
                      <>
                        {scoreDiffHome > 0 ? "+" : ""}{scoreDiffHome}
                        {scoreDiffHome > 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : scoreDiffHome < 0 ? <ArrowTrendingDownIcon className="w-3 h-3" /> : null}
                      </>
                    ) : "-"}
                  </span>
                  <span className="text-gray-500">Away Diff:</span>
                  <span className={`font-medium flex items-center gap-1 ${scoreDiffAway !== null && Math.abs(scoreDiffAway) <= 5 ? "text-green-600" : "text-amber-600"}`}>
                    {scoreDiffAway !== null ? (
                      <>
                        {scoreDiffAway > 0 ? "+" : ""}{scoreDiffAway}
                        {scoreDiffAway > 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : scoreDiffAway < 0 ? <ArrowTrendingDownIcon className="w-3 h-3" /> : null}
                      </>
                    ) : "-"}
                  </span>
                  <span className="text-gray-500">Spread Error:</span>
                  <span className={`font-medium ${spreadDiff !== null && Math.abs(spreadDiff) <= 5 ? "text-green-600" : "text-amber-600"}`}>
                    {spreadDiff !== null ? (spreadDiff > 0 ? "+" : "") + spreadDiff.toFixed(1) : "-"}
                  </span>
                  <span className="text-gray-500">Total Diff:</span>
                  <span className={`font-medium ${totalDiff !== null && Math.abs(totalDiff) <= 10 ? "text-green-600" : "text-amber-600"}`}>
                    {totalDiff !== null ? (totalDiff > 0 ? "+" : "") + totalDiff : "-"}
                  </span>
                </div>
              </div>
            )}

            {/* CLV (Closing Line Value) Analysis */}
            {prediction.validated && (prediction.clvSpread !== null || prediction.openingSpread !== null) && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 border-b pb-1">
                  Line Movement & CLV
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-500">Opening Spread:</span>
                  <span className="font-medium">
                    {prediction.openingSpread !== null 
                      ? (prediction.openingSpread > 0 ? "+" : "") + prediction.openingSpread.toFixed(1) 
                      : "-"}
                  </span>
                  <span className="text-gray-500">Closing Spread:</span>
                  <span className="font-medium">
                    {prediction.closingSpread !== null 
                      ? (prediction.closingSpread > 0 ? "+" : "") + prediction.closingSpread.toFixed(1) 
                      : "-"}
                  </span>
                  <span className="text-gray-500">Line Movement:</span>
                  <span className={`font-medium flex items-center gap-1 ${
                    prediction.lineMovement !== null 
                      ? prediction.lineMovement > 0 
                        ? "text-blue-600" 
                        : prediction.lineMovement < 0 
                          ? "text-purple-600" 
                          : ""
                      : ""
                  }`}>
                    {prediction.lineMovement !== null ? (
                      <>
                        {prediction.lineMovement > 0 ? "+" : ""}{prediction.lineMovement.toFixed(1)}
                        {prediction.lineMovement > 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : prediction.lineMovement < 0 ? <ArrowTrendingDownIcon className="w-3 h-3" /> : null}
                      </>
                    ) : "-"}
                  </span>
                  <span className="text-gray-500">CLV (Spread):</span>
                  <span className={`font-medium ${
                    prediction.clvSpread !== null 
                      ? prediction.clvSpread > 0 
                        ? "text-green-600" 
                        : prediction.clvSpread < 0 
                          ? "text-red-600" 
                          : ""
                      : ""
                  }`}>
                    {prediction.clvSpread !== null 
                      ? (prediction.clvSpread > 0 ? "+" : "") + prediction.clvSpread.toFixed(1) + " pts"
                      : "-"}
                  </span>
                </div>
                {prediction.clvSpread !== null && (
                  <p className="text-xs text-gray-500 italic">
                    {prediction.clvSpread > 0 
                      ? "Beat the closing line (positive CLV = edge)" 
                      : prediction.clvSpread < 0 
                        ? "Line moved against prediction"
                        : "Matched closing line"}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500">
            <span>Game ID: {prediction.gameId}</span>
            <span className="mx-2">•</span>
            <span>Created: {new Date(prediction.createdAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PredictionsListClient() {
  const [predictions, setPredictions] = useState<PredictionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const limit = 15;

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/predictions/list?page=${page}&limit=${limit}&filter=${filter}&sort=${sortOrder}`
      );
      if (!res.ok) {
        console.error("Failed to fetch predictions:", res.status, res.statusText);
        return;
      }
      const text = await res.text();
      if (!text) {
        console.error("Empty response from predictions API");
        return;
      }
      const data: PredictionListResponse = JSON.parse(text);
      setPredictions(data.predictions ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
      setTotal(data.pagination?.total ?? 0);
    } catch (err) {
      console.error("Failed to fetch predictions:", err);
    } finally {
      setLoading(false);
    }
  }, [page, filter, sortOrder]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const handleFilterChange = (value: string) => {
    setFilter(value as FilterType);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortOrder(value as SortOrder);
    setPage(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">All Predictions</h2>
          <Chip size="sm" variant="flat" color="default">
            {total} total
          </Chip>
        </div>
        {isCollapsed ? (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {!isCollapsed && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Filters */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 flex flex-wrap gap-4 items-center border-b border-gray-200 dark:border-gray-700">
            <Select
              label="Filter"
              size="sm"
              className="w-36"
              selectedKeys={[filter]}
              onChange={(e) => handleFilterChange(e.target.value)}
            >
              <SelectItem key="all">All</SelectItem>
              <SelectItem key="validated">Validated</SelectItem>
              <SelectItem key="pending">Pending</SelectItem>
            </Select>

            <Select
              label="Sort by date"
              size="sm"
              className="w-40"
              selectedKeys={[sortOrder]}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <SelectItem key="desc">Newest first</SelectItem>
              <SelectItem key="asc">Oldest first</SelectItem>
            </Select>

            <Button
              size="sm"
              variant="flat"
              onPress={fetchPredictions}
              isLoading={loading}
            >
              Refresh
            </Button>
          </div>

          {/* List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : predictions.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No predictions found.
              </div>
            ) : (
              predictions.map((prediction) => (
                <PredictionRow key={prediction.id} prediction={prediction} />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-center">
              <Pagination
                total={totalPages}
                page={page}
                onChange={setPage}
                showControls
                size="sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
