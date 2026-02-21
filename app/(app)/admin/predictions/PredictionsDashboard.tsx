"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tabs,
  Tab,
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Select,
  SelectItem,
  Input,
  Divider,
  Autocomplete,
  AutocompleteItem,
  Checkbox,
} from "@nextui-org/react";
import {
  ArrowPathIcon,
  PlayIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";

// Types
interface PredictionStats {
  total: number;
  validated: number;
  unvalidated: number;
}

interface CLVStats {
  totalWithClv: number;
  avgClv: number | null;
  positiveCLV: number;
  negativeCLV: number;
}

interface PerformanceStats {
  winnerAccuracy: number;
  spreadMAE: number;
  spreadWithin3: number;
  spreadWithin5: number;
  gamesValidated: number;
  biases?: {
    homeTeamBias?: number;
    awayTeamBias?: number;
    scoreBias?: number;
  };
}

interface SportBreakdown {
  [sport: string]: { total: number; validated: number };
}

interface PredictionItem {
  id: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string | null;
  date: string;
  validated: boolean;
  confidence: number;
  predictedSpread: number;
  predictedScore: { home: number; away: number };
  predictedTotal: number;
  winProbability: { home: number; away: number };
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualTotal: number | null;
  actualWinner: string | null;
  openingSpread: number | null;
  closingSpread: number | null;
  clvSpread: number | null;
  lineMovement: number | null;
  createdAt: string;
}

interface SearchResult {
  id: string;
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string | null;
  date: string;
  validated: boolean;
}

const SPORTS = [
  { key: "all", label: "All Sports", oddsKey: null },
  { key: "cbb", label: "College Basketball", oddsKey: "basketball_ncaab" },
  { key: "nba", label: "NBA", oddsKey: "basketball_nba" },
  { key: "nhl", label: "NHL", oddsKey: "icehockey_nhl" },
  { key: "mlb", label: "MLB", oddsKey: "baseball_mlb" },
];

function getSportKey(sport: string | null): string {
  if (!sport) return "unknown";
  if (sport.includes("ncaab") || sport === "cbb") return "cbb";
  if (sport.includes("nba") || sport === "nba") return "nba";
  if (sport.includes("nhl") || sport === "nhl") return "nhl";
  if (sport.includes("mlb") || sport === "mlb") return "mlb";
  return sport;
}

export function PredictionsDashboard() {
  const [selectedSport, setSelectedSport] = useState("all");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Stats state
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [clvStats, setClvStats] = useState<CLVStats | null>(null);
  const [sportBreakdown, setSportBreakdown] = useState<SportBreakdown | null>(null);
  const [performance, setPerformance] = useState<PerformanceStats | null>(null);

  // Predictions list state
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<"all" | "validated" | "pending">("all");

  // Regenerate state
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Get current sport's oddsKey
  const currentSportConfig = SPORTS.find((s) => s.key === selectedSport);
  const currentOddsKey = currentSportConfig?.oddsKey;

  // Fetch stats (filtered by sport)
  const fetchStats = useCallback(async () => {
    try {
      const sportParam = currentOddsKey ? `?sport=${currentOddsKey}` : "";
      const res = await fetch(`/api/admin/predictions/stats${sportParam}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setClvStats(data.clvStats);
        setSportBreakdown(data.sportBreakdown);
        setPerformance(data.performance);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, [currentOddsKey]);

  // Fetch predictions
  const fetchPredictions = useCallback(async () => {
    setLoading("predictions");
    try {
      const sport = SPORTS.find((s) => s.key === selectedSport);
      const sportParam = sport?.oddsKey ? `&sport=${sport.oddsKey}` : "";
      const res = await fetch(
        `/api/admin/predictions/list?page=${page}&limit=20&filter=${filter}${sportParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch predictions:", err);
    } finally {
      setLoading(null);
    }
  }, [page, filter, selectedSport]);

  // Search predictions for autocomplete
  const searchPredictions = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const sport = SPORTS.find((s) => s.key === selectedSport);
      const sportParam = sport?.oddsKey ? `&sport=${sport.oddsKey}` : "";
      const res = await fetch(
        `/api/admin/predictions/search?q=${encodeURIComponent(query)}${sportParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.predictions);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Run actions (filtered by sport when applicable)
  const runAction = async (action: string, body?: unknown) => {
    setLoading(action);
    setMessage(null);
    try {
      // Build sport-aware body
      const sportBody = currentOddsKey
        ? { ...(body as object || {}), sports: [currentOddsKey] }
        : body;

      const endpoints: Record<string, { url: string; method: string; useBody?: boolean }> = {
        sync: { url: "/api/admin/sync-games", method: "POST", useBody: true },
        captureOdds: { url: "/api/admin/capture-odds", method: "POST", useBody: true },
        syncOutcomes: { url: "/api/admin/predictions/batch-sync?mode=sync", method: "POST" },
        train: { url: "/api/admin/predictions/batch-sync?mode=train", method: "POST" },
        backfill: { url: "/api/admin/predictions/backfill", method: "POST", useBody: true },
        regenerate: { url: "/api/admin/predictions/regenerate", method: "POST", useBody: true },
      };

      const endpoint = endpoints[action];
      if (!endpoint) throw new Error("Unknown action");

      // Only include sport filter in body for actions that support it
      const requestBody = endpoint.useBody ? sportBody : body;

      const res = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: requestBody ? { "Content-Type": "application/json" } : undefined,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      const data = await res.json();

      const sportLabel = currentSportConfig?.label || "All Sports";

      if (res.ok && data.success !== false) {
        const messages: Record<string, string> = {
          sync: `[${sportLabel}] Synced ${data.result?.newGames ?? 0} games, ${data.result?.predictionsGenerated ?? 0} predictions`,
          captureOdds: `[${sportLabel}] Captured ${data.totalSnapshots ?? 0} odds snapshots`,
          syncOutcomes: `Recorded ${data.outcomesRecorded ?? 0} outcomes`,
          train: `Training ${data.trainingRan ? "completed" : "skipped (need 20+ validated)"}`,
          backfill: `[${sportLabel}] Generated ${data.totalGenerated ?? 0} predictions`,
          regenerate: `[${sportLabel}] Regenerated ${data.regenerated ?? 0} predictions`,
        };
        setMessage({ type: "success", text: messages[action] || "Success" });
        fetchStats();
        fetchPredictions();
      } else {
        setMessage({ type: "error", text: data.error || "Action failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Action failed" });
    } finally {
      setLoading(null);
    }
  };

  // Regenerate specific games
  const regenerateSelected = async () => {
    if (selectedGames.length === 0) return;
    await runAction("regenerate", { gameIds: selectedGames });
    setSelectedGames([]);
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats, selectedSport]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchPredictions(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedSport]);

  // Stats are now already filtered by the selected sport from the API

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-700"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircleIcon className="w-5 h-5" />
          ) : (
            <ExclamationTriangleIcon className="w-5 h-5" />
          )}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto">×</button>
        </div>
      )}

      {/* Sport Tabs */}
      <Tabs
        selectedKey={selectedSport}
        onSelectionChange={(key) => {
          setSelectedSport(key as string);
          setPage(1);
        }}
        aria-label="Sport selection"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-6",
        }}
      >
        {SPORTS.map((sport) => (
          <Tab
            key={sport.key}
            title={
              <div className="flex items-center gap-2">
                <span>{sport.label}</span>
                {sportBreakdown && sport.oddsKey && sportBreakdown[sport.oddsKey] && (
                  <Chip size="sm" variant="flat">
                    {sportBreakdown[sport.oddsKey].total}
                  </Chip>
                )}
              </div>
            }
          />
        ))}
      </Tabs>

      {/* Model Performance */}
      {performance && performance.gamesValidated > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
          <CardHeader>
            <h3 className="text-lg font-semibold">
              Model Performance (90 Days)
              {selectedSport !== "all" && (
                <Chip size="sm" variant="flat" className="ml-2">
                  {currentSportConfig?.label}
                </Chip>
              )}
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">
                  {performance.winnerAccuracy.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Winner Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {performance.spreadMAE.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">Spread MAE</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {performance.spreadWithin3.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Within 3 pts</div>
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {performance.spreadWithin5.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Within 5 pts</div>
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {performance.gamesValidated}
                </div>
                <div className="text-sm text-gray-500">Games Validated</div>
              </div>
            </div>
            {performance.biases && (performance.biases.homeTeamBias || performance.biases.scoreBias) && (
              <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                <span className="font-medium">Detected Biases: </span>
                {performance.biases.homeTeamBias && (
                  <span className="mr-4">
                    Home {performance.biases.homeTeamBias > 0 ? "+" : ""}{performance.biases.homeTeamBias.toFixed(1)} pts
                  </span>
                )}
                {performance.biases.scoreBias && (
                  <span>
                    Total {performance.biases.scoreBias > 0 ? "+" : ""}{performance.biases.scoreBias.toFixed(1)} pts
                  </span>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <div className="text-sm text-gray-500">Total Predictions</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats?.validated ?? 0}</div>
            <div className="text-sm text-gray-500">Validated</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats?.unvalidated ?? 0}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-center">
            <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${
              clvStats?.avgClv && clvStats.avgClv > 0 ? "text-green-600" : 
              clvStats?.avgClv && clvStats.avgClv < 0 ? "text-red-600" : ""
            }`}>
              {clvStats?.avgClv !== null && clvStats?.avgClv !== undefined ? (
                <>
                  {clvStats.avgClv > 0 ? "+" : ""}{clvStats.avgClv.toFixed(2)}
                  {clvStats.avgClv > 0 ? <ArrowTrendingUpIcon className="w-5 h-5" /> : <ArrowTrendingDownIcon className="w-5 h-5" />}
                </>
              ) : "-"}
            </div>
            <div className="text-sm text-gray-500">Avg CLV</div>
          </CardBody>
        </Card>
      </div>

      {/* Actions Panel */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Pipeline Actions</h3>
          {selectedSport !== "all" && (
            <Chip color="primary" variant="flat" size="sm">
              {currentSportConfig?.label}
            </Chip>
          )}
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <Button
              color="primary"
              variant="flat"
              startContent={loading === "sync" ? <Spinner size="sm" /> : <PlayIcon className="w-4 h-4" />}
              onPress={() => runAction("sync")}
              isDisabled={loading !== null}
            >
              Sync {selectedSport === "all" ? "All" : currentSportConfig?.label} Games
            </Button>
            <Button
              color="secondary"
              variant="flat"
              startContent={loading === "captureOdds" ? <Spinner size="sm" /> : <ChartBarIcon className="w-4 h-4" />}
              onPress={() => runAction("captureOdds")}
              isDisabled={loading !== null}
            >
              Capture {selectedSport === "all" ? "All" : currentSportConfig?.label} Odds
            </Button>
            <Divider orientation="vertical" className="h-10" />
            <Button
              color="warning"
              variant="flat"
              startContent={loading === "syncOutcomes" ? <Spinner size="sm" /> : <ClockIcon className="w-4 h-4" />}
              onPress={() => runAction("syncOutcomes")}
              isDisabled={loading !== null}
            >
              Sync Outcomes
            </Button>
            <Button
              color="success"
              variant="flat"
              startContent={loading === "train" ? <Spinner size="sm" /> : <ArrowPathIcon className="w-4 h-4" />}
              onPress={() => runAction("train")}
              isDisabled={loading !== null}
            >
              Train Model
            </Button>
            <Divider orientation="vertical" className="h-10" />
            <Button
              color="default"
              variant="flat"
              startContent={loading === "backfill" ? <Spinner size="sm" /> : <PlayIcon className="w-4 h-4" />}
              onPress={() => runAction("backfill")}
              isDisabled={loading !== null}
            >
              Backfill {selectedSport === "all" ? "All" : currentSportConfig?.label}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Regenerate Panel */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Regenerate Predictions</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-gray-600">
            Search and select specific games to regenerate predictions, or regenerate all in current view.
          </p>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                label="Search games"
                placeholder="Team name or game ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
                endContent={searchLoading && <Spinner size="sm" />}
              />
            </div>
            <Button
              color="danger"
              variant="flat"
              onPress={regenerateSelected}
              isDisabled={loading !== null || selectedGames.length === 0}
            >
              Regenerate Selected ({selectedGames.length})
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
              {searchResults.map((result) => (
                <label
                  key={result.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    isSelected={selectedGames.includes(result.gameId)}
                    onValueChange={(checked) => {
                      if (checked) {
                        setSelectedGames([...selectedGames, result.gameId]);
                      } else {
                        setSelectedGames(selectedGames.filter((id) => id !== result.gameId));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {result.awayTeam} @ {result.homeTeam}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(result.date).toLocaleDateString()} •{" "}
                      {getSportKey(result.sport).toUpperCase()}
                    </div>
                  </div>
                  <Chip size="sm" color={result.validated ? "success" : "warning"} variant="flat">
                    {result.validated ? "Validated" : "Pending"}
                  </Chip>
                </label>
              ))}
            </div>
          )}

          {selectedGames.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <span className="text-sm text-gray-500">Selected:</span>
              {selectedGames.map((id) => (
                <Chip
                  key={id}
                  size="sm"
                  onClose={() => setSelectedGames(selectedGames.filter((g) => g !== id))}
                >
                  {id.slice(0, 8)}...
                </Chip>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Predictions List */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            {selectedSport === "all" ? "All Predictions" : `${currentSportConfig?.label} Predictions`}
            {stats && (
              <Chip size="sm" variant="flat" className="ml-2">
                {stats.total}
              </Chip>
            )}
          </h3>
          <div className="flex gap-2 items-center">
            <Select
              size="sm"
              selectedKeys={[filter]}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="w-32"
            >
              <SelectItem key="all">All</SelectItem>
              <SelectItem key="validated">Validated</SelectItem>
              <SelectItem key="pending">Pending</SelectItem>
            </Select>
            <Button
              size="sm"
              variant="flat"
              startContent={loading === "predictions" ? <Spinner size="sm" /> : <ArrowPathIcon className="w-4 h-4" />}
              onPress={fetchPredictions}
              isDisabled={loading !== null}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {loading === "predictions" ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : predictions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No predictions found
            </div>
          ) : (
            <div className="divide-y">
              {predictions.map((p) => {
                const predictedWinner = p.predictedSpread < 0 ? "home" : p.predictedSpread > 0 ? "away" : "push";
                const wasCorrect = p.validated && p.actualWinner === predictedWinner;
                const spreadError = p.validated && p.actualHomeScore !== null && p.actualAwayScore !== null
                  ? Math.abs((p.actualAwayScore - p.actualHomeScore) - p.predictedSpread)
                  : null;

                return (
                  <div key={p.id} className="py-4 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center gap-3">
                      <Checkbox
                        isSelected={selectedGames.includes(p.gameId)}
                        onValueChange={(checked) => {
                          if (checked) {
                            setSelectedGames([...selectedGames, p.gameId]);
                          } else {
                            setSelectedGames(selectedGames.filter((id) => id !== p.gameId));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-base">
                          {p.awayTeam} @ {p.homeTeam}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(p.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          {" • "}
                          {getSportKey(p.sport).toUpperCase()}
                        </div>
                      </div>
                      <Chip 
                        size="sm" 
                        color={p.validated ? (wasCorrect ? "success" : "danger") : "warning"} 
                        variant="flat"
                      >
                        {p.validated ? (wasCorrect ? "Correct" : "Wrong") : "Pending"}
                      </Chip>
                    </div>

                    {/* Prediction Details Grid */}
                    <div className="ml-9 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {/* Predicted Score */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <div className="text-xs text-gray-500 mb-1">Predicted Score</div>
                        <div className="font-semibold">
                          {p.predictedScore?.away ?? "-"} - {p.predictedScore?.home ?? "-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total: {p.predictedTotal?.toFixed(0) ?? "-"}
                        </div>
                      </div>

                      {/* Spread & Win Prob */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <div className="text-xs text-gray-500 mb-1">Spread</div>
                        <div className="font-semibold">
                          {p.predictedSpread > 0 ? "+" : ""}{p.predictedSpread.toFixed(1)}
                        </div>
                        {(() => {
                          // Win probability may be stored as decimal (0-1) or percentage (0-100)
                          const homeProb = (p.winProbability?.home ?? 0) > 1 
                            ? (p.winProbability?.home ?? 0) 
                            : (p.winProbability?.home ?? 0) * 100;
                          const awayProb = (p.winProbability?.away ?? 0) > 1 
                            ? (p.winProbability?.away ?? 0) 
                            : (p.winProbability?.away ?? 0) * 100;
                          return (
                            <div className="text-xs text-gray-500">
                              Win: {homeProb.toFixed(0)}% H / {awayProb.toFixed(0)}% A
                            </div>
                          );
                        })()}
                      </div>

                      {/* Confidence */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <div className="text-xs text-gray-500 mb-1">Confidence</div>
                        {(() => {
                          // Confidence may be stored as decimal (0-1) or percentage (0-100)
                          const confValue = p.confidence > 1 ? p.confidence : p.confidence * 100;
                          return (
                            <>
                              <div className={`font-semibold ${
                                confValue >= 70 ? "text-green-600" : 
                                confValue >= 50 ? "text-yellow-600" : "text-red-600"
                              }`}>
                                {confValue.toFixed(0)}%
                              </div>
                              <div className="text-xs text-gray-500">
                                {confValue >= 70 ? "High" : confValue >= 50 ? "Medium" : "Low"}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Actual Result or Line Movement */}
                      {p.validated ? (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                          <div className="text-xs text-gray-500 mb-1">Actual Score</div>
                          <div className="font-semibold text-blue-600">
                            {p.actualAwayScore} - {p.actualHomeScore}
                          </div>
                          <div className="text-xs text-gray-500">
                            {spreadError !== null && `Error: ${spreadError.toFixed(1)} pts`}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                          <div className="text-xs text-gray-500 mb-1">Line Movement</div>
                          <div className="font-semibold">
                            {p.openingSpread !== null ? (
                              <>
                                {p.openingSpread > 0 ? "+" : ""}{p.openingSpread.toFixed(1)}
                                {p.closingSpread !== null && p.closingSpread !== p.openingSpread && (
                                  <span className="text-gray-400"> → {p.closingSpread > 0 ? "+" : ""}{p.closingSpread.toFixed(1)}</span>
                                )}
                              </>
                            ) : "-"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {p.lineMovement !== null && p.lineMovement !== 0 && (
                              <span className={p.lineMovement > 0 ? "text-blue-500" : "text-purple-500"}>
                                {p.lineMovement > 0 ? "+" : ""}{p.lineMovement.toFixed(1)} pts
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* CLV Row (for validated predictions) */}
                    {p.validated && p.clvSpread !== null && (
                      <div className="ml-9 flex items-center gap-4 text-sm">
                        <Chip
                          size="sm"
                          color={p.clvSpread > 0 ? "success" : p.clvSpread < 0 ? "danger" : "default"}
                          variant="flat"
                          startContent={p.clvSpread > 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                        >
                          CLV: {p.clvSpread > 0 ? "+" : ""}{p.clvSpread.toFixed(1)} pts
                        </Chip>
                        <span className="text-xs text-gray-500">
                          {p.clvSpread > 0 ? "Beat closing line" : p.clvSpread < 0 ? "Line moved against" : "Matched close"}
                        </span>
                        {p.openingSpread !== null && p.closingSpread !== null && (
                          <span className="text-xs text-gray-400">
                            Open: {p.openingSpread > 0 ? "+" : ""}{p.openingSpread.toFixed(1)} → Close: {p.closingSpread > 0 ? "+" : ""}{p.closingSpread.toFixed(1)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                size="sm"
                variant="flat"
                isDisabled={page === 1}
                onPress={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="flat"
                isDisabled={page === totalPages}
                onPress={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
