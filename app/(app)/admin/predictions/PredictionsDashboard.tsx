"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Switch,
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
  // Enhanced metrics
  ats?: {
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    record: string;
  };
  overUnder?: {
    overWins: number;
    underWins: number;
    pushes: number;
    overWinRate: number;
    totalAccuracy: number;
    overPickAccuracy?: number;
    underPickAccuracy?: number;
    overPickCount?: number;
    underPickCount?: number;
  };
  categories?: {
    homePickWinRate: number;
    homePickCount: number;
    awayPickWinRate: number;
    awayPickCount: number;
    favoriteWinRate: number;
    favoriteCount: number;
    underdogWinRate: number;
    underdogCount: number;
    highConfidence: { winRate: number; count: number };
    mediumConfidence: { winRate: number; count: number };
    lowConfidence: { winRate: number; count: number };
    closeGameWinRate: number;
    closeGameCount: number;
    blowoutWinRate: number;
    blowoutCount: number;
  };
  calibration?: {
    brierScore: number;
    expectedCalibrationError: number;
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
  const [filter, setFilter] = useState<"all" | "validated" | "pending" | "live" | "final">("all");
  const [listSearchQuery, setListSearchQuery] = useState("");

  // Regenerate state
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Live scores state
  const [liveScores, setLiveScores] = useState<Map<string, {
    homeScore: number;
    awayScore: number;
    status: "pre" | "in" | "post";
    statusDetail: string;
    period: string;
    clock: string;
  }>>(new Map());

  // Action control modal state
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [actionConfig, setActionConfig] = useState({
    // Sync options
    syncSports: [...SPORTS.filter(s => s.oddsKey).map(s => s.oddsKey!)] as string[],
    // Capture odds options
    captureSports: [...SPORTS.filter(s => s.oddsKey).map(s => s.oddsKey!)] as string[],
    captureForceAll: false,
    // Backfill options
    backfillSports: [...SPORTS.filter(s => s.oddsKey).map(s => s.oddsKey!)] as string[],
    backfillLimit: 100,
    // Sync outcomes options  
    syncOutcomesMinAge: 0, // sync immediately
    // Train options
    trainMinValidated: 20,
    trainIncludeRecent: true,
  });

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
      // Map client-side filters to API filters
      // "live" and "final" are filtered client-side, so we fetch "pending" or "all"
      const apiFilter = filter === "live" ? "pending" : filter === "final" ? "all" : filter;
      const res = await fetch(
        `/api/admin/predictions/list?page=${page}&limit=100&filter=${apiFilter}${sportParam}`
      );
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions);
        // For live/final filters, we'll filter client-side so pagination may not be accurate
        setTotalPages(filter === "live" || filter === "final" ? 1 : data.pagination.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch predictions:", err);
    } finally {
      setLoading(null);
    }
  }, [page, filter, selectedSport]);

  // Fetch live scores
  const fetchLiveScores = useCallback(async () => {
    try {
      // Only fetch if we have pending (non-validated) predictions
      const pendingPredictions = predictions.filter(p => !p.validated);
      if (pendingPredictions.length === 0) return;

      const res = await fetch("/api/admin/live-scores");
      if (!res.ok) return;
      
      const data = await res.json();
      const scores = data.scores as Array<{
        homeTeam: string;
        awayTeam: string;
        homeScore: number;
        awayScore: number;
        status: "pre" | "in" | "post";
        statusDetail: string;
        period: string;
        clock: string;
      }>;

      // Match scores to predictions by team names
      const newLiveScores = new Map<string, typeof scores[0]>();
      for (const pred of pendingPredictions) {
        const normalizeTeam = (name: string) => name.toLowerCase().replace(/[^a-z]/g, "");
        const predHome = normalizeTeam(pred.homeTeam);
        const predAway = normalizeTeam(pred.awayTeam);

        for (const score of scores) {
          const scoreHome = normalizeTeam(score.homeTeam);
          const scoreAway = normalizeTeam(score.awayTeam);

          // Match if either team name matches (partial match for shortened names)
          if (
            (predHome.includes(scoreHome) || scoreHome.includes(predHome)) &&
            (predAway.includes(scoreAway) || scoreAway.includes(predAway))
          ) {
            newLiveScores.set(pred.id, score);
            break;
          }
        }
      }
      setLiveScores(newLiveScores);
    } catch (err) {
      console.error("Failed to fetch live scores:", err);
    }
  }, [predictions]);

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

  // Open action configuration modal
  const openActionModal = (action: string) => {
    // Pre-select current sport if one is selected
    if (currentOddsKey) {
      setActionConfig(prev => ({
        ...prev,
        syncSports: [currentOddsKey],
        captureSports: [currentOddsKey],
        backfillSports: [currentOddsKey],
      }));
    } else {
      // Reset to all sports
      const allSports = SPORTS.filter(s => s.oddsKey).map(s => s.oddsKey!);
      setActionConfig(prev => ({
        ...prev,
        syncSports: allSports,
        captureSports: allSports,
        backfillSports: allSports,
      }));
    }
    setActiveModal(action);
  };

  // Execute action with current config
  const executeAction = async (action: string) => {
    setActiveModal(null);
    setLoading(action);
    setMessage(null);
    
    try {
      let requestBody: Record<string, unknown> | undefined;
      let url: string;
      
      switch (action) {
        case "sync":
          url = "/api/admin/sync-games";
          requestBody = { sports: actionConfig.syncSports };
          break;
        case "captureOdds":
          url = "/api/admin/capture-odds";
          requestBody = { 
            sports: actionConfig.captureSports,
            forceAll: actionConfig.captureForceAll,
          };
          break;
        case "syncOutcomes":
          url = "/api/admin/predictions/batch-sync?mode=sync";
          requestBody = { minAgeHours: actionConfig.syncOutcomesMinAge };
          break;
        case "train":
          url = "/api/admin/predictions/batch-sync?mode=train";
          requestBody = { 
            minValidated: actionConfig.trainMinValidated,
            includeRecent: actionConfig.trainIncludeRecent,
          };
          break;
        case "backfill":
          url = "/api/admin/predictions/backfill";
          requestBody = { 
            sports: actionConfig.backfillSports,
            limit: actionConfig.backfillLimit,
          };
          break;
        default:
          throw new Error("Unknown action");
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      const sportsLabel = action === "sync" ? actionConfig.syncSports.length 
        : action === "captureOdds" ? actionConfig.captureSports.length
        : action === "backfill" ? actionConfig.backfillSports.length
        : 0;

      if (res.ok && data.success !== false) {
        const messages: Record<string, string> = {
          sync: `Synced ${data.result?.newGames ?? 0} games, ${data.result?.predictionsGenerated ?? 0} predictions (${sportsLabel} sports)`,
          captureOdds: `Captured ${data.totalSnapshots ?? 0} odds snapshots (${sportsLabel} sports)`,
          syncOutcomes: `Recorded ${data.outcomesRecorded ?? 0} outcomes`,
          train: `Training ${data.trainingRan ? "completed" : "skipped (need " + actionConfig.trainMinValidated + "+ validated)"}`,
          backfill: `Generated ${data.totalGenerated ?? 0} predictions (${sportsLabel} sports)`,
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

  // Legacy runAction for regenerate (still uses direct call)
  const runAction = async (action: string, body?: unknown) => {
    setLoading(action);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/predictions/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        setMessage({ type: "success", text: `Regenerated ${data.regenerated ?? 0} predictions` });
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

  // Toggle sport in action config
  const toggleSportInConfig = (configKey: "syncSports" | "captureSports" | "backfillSports", sport: string) => {
    setActionConfig(prev => {
      const current = prev[configKey];
      if (current.includes(sport)) {
        return { ...prev, [configKey]: current.filter(s => s !== sport) };
      } else {
        return { ...prev, [configKey]: [...current, sport] };
      }
    });
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

  // Poll for live scores every 30 seconds
  useEffect(() => {
    fetchLiveScores();
    const interval = setInterval(fetchLiveScores, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveScores]);

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

      {/* Model Performance - Enhanced */}
      {performance && performance.gamesValidated > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
          <CardHeader className="flex flex-col gap-2">
            <div className="flex justify-between items-center w-full">
              <h3 className="text-lg font-semibold">
                Model Performance (90 Days)
                {selectedSport !== "all" && (
                  <Chip size="sm" variant="flat" className="ml-2">
                    {currentSportConfig?.label}
                  </Chip>
                )}
              </h3>
              <Chip size="sm" variant="flat" color="primary">
                {performance.gamesValidated} games
              </Chip>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            {/* Primary Metrics Row - ATS Record (Most Important for Betting) */}
            {performance.ats && (
              <div className="bg-white/60 dark:bg-gray-900/40 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className={`text-4xl font-bold ${
                        performance.ats.winRate >= 55 ? "text-green-600" : 
                        performance.ats.winRate >= 50 ? "text-blue-600" : "text-red-600"
                      }`}>
                        {performance.ats.winRate.toFixed(1)}%
                      </div>
                      <div className="text-sm font-medium text-gray-600">ATS Win Rate</div>
                    </div>
                    <div className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
                      {performance.ats.record}
                    </div>
                  </div>
                  <div className="flex gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {performance.winnerAccuracy.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Winner Pick</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {performance.spreadMAE.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">Spread MAE</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {performance.spreadWithin3.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Within 3 pts</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Secondary Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Category: Home vs Away */}
              {performance.categories && (
                <>
                  <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Home Picks</div>
                    <div className={`text-xl font-bold ${
                      performance.categories.homePickWinRate >= 55 ? "text-green-600" : 
                      performance.categories.homePickWinRate >= 50 ? "text-gray-700" : "text-red-600"
                    }`}>
                      {performance.categories.homePickWinRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">{performance.categories.homePickCount} picks</div>
                  </div>
                  <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Away Picks</div>
                    <div className={`text-xl font-bold ${
                      performance.categories.awayPickWinRate >= 55 ? "text-green-600" : 
                      performance.categories.awayPickWinRate >= 50 ? "text-gray-700" : "text-red-600"
                    }`}>
                      {performance.categories.awayPickWinRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">{performance.categories.awayPickCount} picks</div>
                  </div>
                </>
              )}
              
              {/* Category: Favorites vs Underdogs */}
              {performance.categories && (
                <>
                  <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Favorites (&gt;3pt)</div>
                    <div className={`text-xl font-bold ${
                      performance.categories.favoriteWinRate >= 55 ? "text-green-600" : 
                      performance.categories.favoriteWinRate >= 50 ? "text-gray-700" : "text-red-600"
                    }`}>
                      {performance.categories.favoriteWinRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">{performance.categories.favoriteCount} picks</div>
                  </div>
                  <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Close Games</div>
                    <div className={`text-xl font-bold ${
                      performance.categories.underdogWinRate >= 55 ? "text-green-600" : 
                      performance.categories.underdogWinRate >= 50 ? "text-gray-700" : "text-red-600"
                    }`}>
                      {performance.categories.underdogWinRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">{performance.categories.underdogCount} picks</div>
                  </div>
                </>
              )}
            </div>

            {/* Confidence Tiers */}
            {performance.categories && (
              <div className="bg-white/40 dark:bg-gray-800/40 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-600 mb-3">Performance by Confidence</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">High (75%+)</div>
                    <div className={`text-lg font-bold ${
                      performance.categories.highConfidence.winRate >= 60 ? "text-green-600" : 
                      performance.categories.highConfidence.winRate >= 50 ? "text-gray-700" : "text-red-600"
                    }`}>
                      {performance.categories.highConfidence.winRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">{performance.categories.highConfidence.count} games</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Medium (60-75%)</div>
                    <div className={`text-lg font-bold ${
                      performance.categories.mediumConfidence.winRate >= 55 ? "text-green-600" : 
                      performance.categories.mediumConfidence.winRate >= 50 ? "text-gray-700" : "text-red-600"
                    }`}>
                      {performance.categories.mediumConfidence.winRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">{performance.categories.mediumConfidence.count} games</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Low (&lt;60%)</div>
                    <div className={`text-lg font-bold ${
                      performance.categories.lowConfidence.winRate >= 50 ? "text-green-600" : "text-red-600"
                    }`}>
                      {performance.categories.lowConfidence.winRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">{performance.categories.lowConfidence.count} games</div>
                  </div>
                </div>
              </div>
            )}

            {/* Biases */}
            {performance.biases && (performance.biases.homeTeamBias || performance.biases.scoreBias) && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600">
                <span className="font-medium">Detected Biases: </span>
                {performance.biases.homeTeamBias && (
                  <Chip size="sm" variant="flat" color={performance.biases.homeTeamBias > 0 ? "warning" : "primary"} className="mr-2">
                    Home {performance.biases.homeTeamBias > 0 ? "+" : ""}{performance.biases.homeTeamBias.toFixed(1)} pts
                  </Chip>
                )}
                {performance.biases.scoreBias && (
                  <Chip size="sm" variant="flat" color={performance.biases.scoreBias > 0 ? "warning" : "primary"}>
                    Total {performance.biases.scoreBias > 0 ? "+" : ""}{performance.biases.scoreBias.toFixed(1)} pts
                  </Chip>
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
              {currentSportConfig?.label} selected
            </Chip>
          )}
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <Button
              color="primary"
              variant="flat"
              startContent={loading === "sync" ? <Spinner size="sm" /> : <PlayIcon className="w-4 h-4" />}
              onPress={() => openActionModal("sync")}
              isDisabled={loading !== null}
            >
              Sync Games
            </Button>
            <Button
              color="secondary"
              variant="flat"
              startContent={loading === "captureOdds" ? <Spinner size="sm" /> : <ChartBarIcon className="w-4 h-4" />}
              onPress={() => openActionModal("captureOdds")}
              isDisabled={loading !== null}
            >
              Capture Odds
            </Button>
            <Divider orientation="vertical" className="h-10" />
            <Button
              color="warning"
              variant="flat"
              startContent={loading === "syncOutcomes" ? <Spinner size="sm" /> : <ClockIcon className="w-4 h-4" />}
              onPress={() => openActionModal("syncOutcomes")}
              isDisabled={loading !== null}
            >
              Sync Outcomes
            </Button>
            <Button
              color="success"
              variant="flat"
              startContent={loading === "train" ? <Spinner size="sm" /> : <ArrowPathIcon className="w-4 h-4" />}
              onPress={() => openActionModal("train")}
              isDisabled={loading !== null}
            >
              Train Model
            </Button>
            <Divider orientation="vertical" className="h-10" />
            <Button
              color="default"
              variant="flat"
              startContent={loading === "backfill" ? <Spinner size="sm" /> : <PlayIcon className="w-4 h-4" />}
              onPress={() => openActionModal("backfill")}
              isDisabled={loading !== null}
            >
              Backfill Missing
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
        <CardHeader className="flex flex-col gap-3">
          <div className="flex justify-between items-center w-full">
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
                className="w-36"
              >
                <SelectItem key="all">All</SelectItem>
                <SelectItem key="validated">Validated</SelectItem>
                <SelectItem key="pending">Pending</SelectItem>
                <SelectItem key="live">Live</SelectItem>
                <SelectItem key="final">Final</SelectItem>
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
          </div>
          <div className="relative w-full">
            <Input
              size="sm"
              placeholder="Search teams, games..."
              value={listSearchQuery}
              onChange={(e) => setListSearchQuery(e.target.value)}
              startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
              endContent={
                listSearchQuery && (
                  <button
                    onClick={() => setListSearchQuery("")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                )
              }
              className="w-full"
              isClearable={false}
            />
            {/* Autocomplete suggestions */}
            {listSearchQuery.length >= 2 && (
              (() => {
                const query = listSearchQuery.toLowerCase();
                const allTeams = new Set<string>();
                predictions.forEach((p) => {
                  if (p.homeTeam.toLowerCase().includes(query)) allTeams.add(p.homeTeam);
                  if (p.awayTeam.toLowerCase().includes(query)) allTeams.add(p.awayTeam);
                });
                const matchingTeams = Array.from(allTeams).slice(0, 6);
                
                if (matchingTeams.length > 0) {
                  return (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                      {matchingTeams.map((team) => (
                        <button
                          key={team}
                          onClick={() => setListSearchQuery(team)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
                          <span>
                            {team.split(new RegExp(`(${listSearchQuery})`, 'i')).map((part, i) => 
                              part.toLowerCase() === listSearchQuery.toLowerCase() 
                                ? <strong key={i} className="text-primary">{part}</strong> 
                                : part
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>
        </CardHeader>
        <CardBody>
          {(() => {
            // Filter predictions once for both count and display
            const filteredPredictions = predictions.filter((p) => {
              // Filter by live/final status
              if (filter === "live" || filter === "final") {
                const liveScore = liveScores.get(p.id);
                if (filter === "live" && liveScore?.status !== "in") return false;
                if (filter === "final" && !(liveScore?.status === "post" || p.validated)) return false;
              }
              // Filter by search query
              if (listSearchQuery.trim()) {
                const query = listSearchQuery.toLowerCase();
                const matchesHome = p.homeTeam.toLowerCase().includes(query);
                const matchesAway = p.awayTeam.toLowerCase().includes(query);
                const matchesGameId = p.gameId.toLowerCase().includes(query);
                if (!matchesHome && !matchesAway && !matchesGameId) return false;
              }
              return true;
            });

            if (loading === "predictions") {
              return (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              );
            }
            
            if (predictions.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  No predictions found
                </div>
              );
            }
            
            if (filteredPredictions.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  No predictions match your search
                  {listSearchQuery && (
                    <button 
                      onClick={() => setListSearchQuery("")}
                      className="block mx-auto mt-2 text-primary hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              );
            }

            return (
              <>
                {(listSearchQuery || filter === "live" || filter === "final") && (
                  <div className="mb-3 text-sm text-gray-500">
                    Showing {filteredPredictions.length} of {predictions.length} predictions
                  </div>
                )}
                <div className="divide-y">
                  {filteredPredictions.map((p) => {
                const spreadError = p.validated && p.actualHomeScore !== null && p.actualAwayScore !== null
                  ? Math.abs((p.actualAwayScore - p.actualHomeScore) - p.predictedSpread)
                  : null;

                const scoreBasedWinner = (p.predictedScore?.home ?? 0) > (p.predictedScore?.away ?? 0) 
                  ? "home" 
                  : (p.predictedScore?.away ?? 0) > (p.predictedScore?.home ?? 0) 
                    ? "away" 
                    : "tie";
                const predictedWinnerTeam = scoreBasedWinner === "home" ? p.homeTeam : p.awayTeam;
                
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
                        <Link 
                          href={`/admin/predictions/${p.id}`}
                          className="font-semibold text-base flex items-center gap-2 hover:underline"
                        >
                          <span className={scoreBasedWinner === "away" ? "text-green-600" : ""}>
                            {p.awayTeam}
                          </span>
                          <span className="text-gray-400">@</span>
                          <span className={scoreBasedWinner === "home" ? "text-green-600" : ""}>
                            {p.homeTeam}
                          </span>
                          <Chip size="sm" color="primary" variant="flat" className="ml-2">
                            Pick: {predictedWinnerTeam.split(" ").pop()}
                          </Chip>
                        </Link>
                        <div className="text-xs text-gray-500">
                          {new Date(p.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          {" • "}
                          {getSportKey(p.sport).toUpperCase()}
                        </div>
                      </div>
                      {(() => {
                        const liveScore = liveScores.get(p.id);
                        
                        // Determine if prediction was correct based on available data
                        const determineCorrectness = () => {
                          // Use predicted scores to determine predicted winner (more reliable than spread)
                          const predHome = p.predictedScore?.home ?? 0;
                          const predAway = p.predictedScore?.away ?? 0;
                          const predictedWinner = predHome > predAway ? "home" : predAway > predHome ? "away" : "push";
                          
                          // Use validated actual data if available
                          if (p.validated && p.actualHomeScore !== null && p.actualAwayScore !== null) {
                            const actualWinner = p.actualHomeScore > p.actualAwayScore ? "home" : 
                                                 p.actualAwayScore > p.actualHomeScore ? "away" : "push";
                            return actualWinner === predictedWinner;
                          }
                          
                          // Use live score data for Final games
                          if (liveScore?.status === "post") {
                            const actualWinner = liveScore.homeScore > liveScore.awayScore ? "home" : 
                                                 liveScore.awayScore > liveScore.homeScore ? "away" : "push";
                            return actualWinner === predictedWinner;
                          }
                          
                          return null;
                        };
                        
                        const isCorrect = determineCorrectness();
                        
                        if (p.validated) {
                          return (
                            <Chip
                              size="sm"
                              color={isCorrect ? "success" : "danger"}
                              variant="flat"
                            >
                              {isCorrect ? "Correct" : "Wrong"}
                            </Chip>
                          );
                        } else if (liveScore?.status === "in") {
                          return (
                            <Chip
                              size="sm"
                              color="danger"
                              variant="solid"
                              startContent={
                                <span className="relative flex h-2 w-2 mr-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                              }
                            >
                              LIVE
                            </Chip>
                          );
                        } else if (liveScore?.status === "post") {
                          // Show Correct/Wrong for Final games
                          return (
                            <div className="flex items-center gap-1">
                              <Chip
                                size="sm"
                                color={isCorrect ? "success" : "danger"}
                                variant="flat"
                              >
                                {isCorrect ? "Correct" : "Wrong"}
                              </Chip>
                              <Chip size="sm" color="primary" variant="flat">
                                Final
                              </Chip>
                            </div>
                          );
                        } else {
                          return (
                            <Chip size="sm" color="warning" variant="flat">
                              Pending
                            </Chip>
                          );
                        }
                      })()}
                    </div>

                    {/* Prediction Details Grid */}
                    <div className="ml-9 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {/* Predicted Score with Winner Highlight */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                        <div className="text-xs text-gray-500 mb-1">Predicted Score</div>
                        {(() => {
                          const homeScore = p.predictedScore?.home ?? 0;
                          const awayScore = p.predictedScore?.away ?? 0;
                          const predictedWinner = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "tie";
                          return (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Away:</span>
                                <span className={`font-semibold ${predictedWinner === "away" ? "text-green-600" : ""}`}>
                                  {awayScore}{predictedWinner === "away" && " ✓"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">Home:</span>
                                <span className={`font-semibold ${predictedWinner === "home" ? "text-green-600" : ""}`}>
                                  {homeScore}{predictedWinner === "home" && " ✓"}
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-600">
                                Total: {p.predictedTotal?.toFixed(0) ?? (homeScore + awayScore)}
                              </div>
                            </div>
                          );
                        })()}
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

                      {/* Live Score, Actual Result, or Line Movement */}
                      {(() => {
                        const liveScore = liveScores.get(p.id);
                        
                        if (p.validated) {
                          // Show actual score for validated games
                          const actualHome = p.actualHomeScore ?? 0;
                          const actualAway = p.actualAwayScore ?? 0;
                          const predictedHome = p.predictedScore?.home ?? 0;
                          const predictedAway = p.predictedScore?.away ?? 0;
                          const actualWinner = actualHome > actualAway ? "home" : actualAway > actualHome ? "away" : "tie";
                          const homeError = actualHome - predictedHome;
                          const awayError = actualAway - predictedAway;
                          return (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                              <div className="text-xs text-gray-500 mb-1">Actual Score</div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-gray-500">Away:</span>
                                  <div className="flex items-center gap-1">
                                    <span className={`font-semibold ${actualWinner === "away" ? "text-blue-600" : ""}`}>
                                      {actualAway}{actualWinner === "away" && " ✓"}
                                    </span>
                                    <span className={`text-xs ${awayError === 0 ? "text-green-500" : Math.abs(awayError) <= 5 ? "text-yellow-500" : "text-red-500"}`}>
                                      ({awayError >= 0 ? "+" : ""}{awayError})
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs text-gray-500">Home:</span>
                                  <div className="flex items-center gap-1">
                                    <span className={`font-semibold ${actualWinner === "home" ? "text-blue-600" : ""}`}>
                                      {actualHome}{actualWinner === "home" && " ✓"}
                                    </span>
                                    <span className={`text-xs ${homeError === 0 ? "text-green-500" : Math.abs(homeError) <= 5 ? "text-yellow-500" : "text-red-500"}`}>
                                      ({homeError >= 0 ? "+" : ""}{homeError})
                                    </span>
                                  </div>
                                </div>
                                <div className="text-xs text-gray-400 pt-1 border-t border-gray-200 dark:border-gray-600">
                                  {spreadError !== null && `Spread err: ${spreadError.toFixed(1)}`}
                                </div>
                              </div>
                            </div>
                          );
                        } else if (liveScore && (liveScore.status === "in" || liveScore.status === "post")) {
                          // Show live score for games in progress or just finished
                          const liveWinner = liveScore.homeScore > liveScore.awayScore ? "home" : 
                                            liveScore.awayScore > liveScore.homeScore ? "away" : "tie";
                          const isLive = liveScore.status === "in";
                          return (
                            <div className={`rounded-lg p-2 ${isLive ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" : "bg-gray-50 dark:bg-gray-700"}`}>
                              <div className="flex items-center gap-1 mb-1">
                                {isLive && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                  </span>
                                )}
                                <span className={`text-xs ${isLive ? "text-red-600 dark:text-red-400 font-medium" : "text-gray-500"}`}>
                                  {isLive ? "LIVE" : "Final"}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Away:</span>
                                  <span className={`font-bold text-lg ${liveWinner === "away" ? "text-green-600" : ""}`}>
                                    {liveScore.awayScore}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Home:</span>
                                  <span className={`font-bold text-lg ${liveWinner === "home" ? "text-green-600" : ""}`}>
                                    {liveScore.homeScore}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 pt-1 border-t border-gray-200 dark:border-gray-600">
                                  {liveScore.statusDetail || (liveScore.period && liveScore.clock ? `${liveScore.period} - ${liveScore.clock}` : "")}
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          // Show line movement for pending games
                          return (
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
                          );
                        }
                      })()}
                    </div>

                    {/* Betting Results Row (for validated or final games) */}
                    {(() => {
                      const liveScore = liveScores.get(p.id);
                      const hasResult = p.validated || liveScore?.status === "post";
                      
                      if (!hasResult) return null;
                      
                      // Get actual scores
                      const actualHome = p.validated ? (p.actualHomeScore ?? 0) : (liveScore?.homeScore ?? 0);
                      const actualAway = p.validated ? (p.actualAwayScore ?? 0) : (liveScore?.awayScore ?? 0);
                      const actualMargin = actualHome - actualAway;
                      const actualTotal = actualHome + actualAway;
                      
                      // Predicted values
                      const predHome = p.predictedScore?.home ?? 0;
                      const predAway = p.predictedScore?.away ?? 0;
                      const predMargin = predHome - predAway;
                      const predictedWinner = predHome > predAway ? "home" : "away";
                      const actualWinner = actualHome > actualAway ? "home" : actualHome < actualAway ? "away" : "push";
                      const predTotal = p.predictedTotal ?? (predHome + predAway);
                      
                      // Winner pick result
                      const winnerCorrect = predictedWinner === actualWinner;
                      
                      // ATS result: Did we cover the spread?
                      // If we predicted home -5, home needs to win by MORE than 5 to cover
                      const ourSpread = p.predictedSpread;
                      const marketLine = p.closingSpread ?? ourSpread;
                      let atsCovered: boolean | null = null;
                      let atsText = "";
                      
                      if (predMargin > 0) {
                        // We bet on home (they're favored)
                        const homeNeeded = marketLine;
                        atsCovered = actualMargin > homeNeeded;
                        atsText = atsCovered 
                          ? `Home covered (${actualMargin > 0 ? "+" : ""}${actualMargin.toFixed(0)} vs ${homeNeeded > 0 ? "-" : "+"}${Math.abs(homeNeeded).toFixed(1)})`
                          : actualMargin === homeNeeded 
                            ? "Push"
                            : `Home didn't cover (${actualMargin > 0 ? "+" : ""}${actualMargin.toFixed(0)} vs ${homeNeeded > 0 ? "-" : "+"}${Math.abs(homeNeeded).toFixed(1)})`;
                      } else {
                        // We bet on away (they're underdog or we predicted them to win)
                        const awayNeeded = -marketLine;
                        const awayMargin = -actualMargin;
                        atsCovered = awayMargin > awayNeeded;
                        atsText = atsCovered 
                          ? `Away covered (+${awayMargin.toFixed(0)} vs +${awayNeeded.toFixed(1)})`
                          : awayMargin === awayNeeded 
                            ? "Push"
                            : `Away didn't cover (+${awayMargin.toFixed(0)} vs +${awayNeeded.toFixed(1)})`;
                      }
                      
                      // O/U result
                      const marketTotal = p.closingTotal ?? predTotal;
                      const predictedOver = predTotal > marketTotal;
                      const actualOver = actualTotal > marketTotal;
                      const totalPush = actualTotal === marketTotal;
                      let totalHit: boolean | null = totalPush ? null : (predictedOver === actualOver);
                      const totalText = totalPush 
                        ? "Push" 
                        : totalHit 
                          ? `${actualOver ? "Over" : "Under"} hit (${actualTotal} vs ${marketTotal.toFixed(0)})`
                          : `${actualOver ? "Over" : "Under"} (${actualTotal} vs ${marketTotal.toFixed(0)})`;
                      
                      return (
                        <div className="ml-9 flex flex-wrap items-center gap-2 text-sm">
                          <Chip
                            size="sm"
                            color={winnerCorrect ? "success" : "danger"}
                            variant="flat"
                          >
                            {winnerCorrect ? "✓ Winner" : "✗ Winner"}
                          </Chip>
                          <Chip
                            size="sm"
                            color={atsCovered === null ? "default" : atsCovered ? "success" : "danger"}
                            variant="flat"
                          >
                            {atsCovered === null ? "—" : atsCovered ? "✓ ATS" : "✗ ATS"}
                          </Chip>
                          <Chip
                            size="sm"
                            color={totalHit === null ? "default" : totalHit ? "success" : "danger"}
                            variant="flat"
                          >
                            {totalHit === null ? "— O/U" : totalHit ? "✓ O/U" : "✗ O/U"}
                          </Chip>
                          <span className="text-xs text-gray-400">
                            {totalText}
                          </span>
                        </div>
                      );
                    })()}

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
              </>
            );
          })()}

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

      {/* Action Configuration Modals */}
      
      {/* Sync Games Modal */}
      <Modal isOpen={activeModal === "sync"} onClose={() => setActiveModal(null)}>
        <ModalContent>
          <ModalHeader>Sync Games</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              Discover new games from the Odds API and generate predictions.
            </p>
            <div className="space-y-3">
              <p className="text-sm font-medium">Select Sports:</p>
              <div className="flex flex-wrap gap-2">
                {SPORTS.filter(s => s.oddsKey).map(sport => (
                  <Chip
                    key={sport.key}
                    variant={actionConfig.syncSports.includes(sport.oddsKey!) ? "solid" : "bordered"}
                    color={actionConfig.syncSports.includes(sport.oddsKey!) ? "primary" : "default"}
                    className="cursor-pointer"
                    onClick={() => toggleSportInConfig("syncSports", sport.oddsKey!)}
                  >
                    {sport.label}
                  </Chip>
                ))}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setActiveModal(null)}>Cancel</Button>
            <Button 
              color="primary" 
              onPress={() => executeAction("sync")}
              isDisabled={actionConfig.syncSports.length === 0}
            >
              Sync {actionConfig.syncSports.length} Sport{actionConfig.syncSports.length !== 1 ? "s" : ""}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Capture Odds Modal */}
      <Modal isOpen={activeModal === "captureOdds"} onClose={() => setActiveModal(null)}>
        <ModalContent>
          <ModalHeader>Capture Odds</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              Capture current odds for line movement tracking and CLV analysis.
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Select Sports:</p>
                <div className="flex flex-wrap gap-2">
                  {SPORTS.filter(s => s.oddsKey).map(sport => (
                    <Chip
                      key={sport.key}
                      variant={actionConfig.captureSports.includes(sport.oddsKey!) ? "solid" : "bordered"}
                      color={actionConfig.captureSports.includes(sport.oddsKey!) ? "secondary" : "default"}
                      className="cursor-pointer"
                      onClick={() => toggleSportInConfig("captureSports", sport.oddsKey!)}
                    >
                      {sport.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Force capture all</p>
                  <p className="text-xs text-gray-500">Capture even if recently captured</p>
                </div>
                <Switch 
                  isSelected={actionConfig.captureForceAll}
                  onValueChange={(v) => setActionConfig(prev => ({ ...prev, captureForceAll: v }))}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setActiveModal(null)}>Cancel</Button>
            <Button 
              color="secondary" 
              onPress={() => executeAction("captureOdds")}
              isDisabled={actionConfig.captureSports.length === 0}
            >
              Capture Odds
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Sync Outcomes Modal */}
      <Modal isOpen={activeModal === "syncOutcomes"} onClose={() => setActiveModal(null)}>
        <ModalContent>
          <ModalHeader>Sync Outcomes</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600">
              Record final scores for completed games and calculate prediction accuracy.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setActiveModal(null)}>Cancel</Button>
            <Button color="warning" onPress={() => executeAction("syncOutcomes")}>
              Sync Outcomes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Train Model Modal */}
      <Modal isOpen={activeModal === "train"} onClose={() => setActiveModal(null)}>
        <ModalContent>
          <ModalHeader>Train Model</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              Run Platt scaling recalibration using validated prediction outcomes.
            </p>
            <div className="space-y-4">
              <Input
                type="number"
                label="Minimum validated predictions"
                description="Training requires at least this many validated predictions"
                value={actionConfig.trainMinValidated.toString()}
                onChange={(e) => setActionConfig(prev => ({ 
                  ...prev, 
                  trainMinValidated: parseInt(e.target.value) || 20 
                }))}
                min={10}
                max={100}
              />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Include recent predictions</p>
                  <p className="text-xs text-gray-500">Use predictions from last 7 days</p>
                </div>
                <Switch 
                  isSelected={actionConfig.trainIncludeRecent}
                  onValueChange={(v) => setActionConfig(prev => ({ ...prev, trainIncludeRecent: v }))}
                />
              </div>
              {stats && (
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-sm">
                  <p>Current validated predictions: <strong>{stats.validated}</strong></p>
                  {stats.validated < actionConfig.trainMinValidated && (
                    <p className="text-yellow-600 mt-1">
                      Need {actionConfig.trainMinValidated - stats.validated} more to train
                    </p>
                  )}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setActiveModal(null)}>Cancel</Button>
            <Button 
              color="success" 
              onPress={() => executeAction("train")}
              isDisabled={(stats?.validated ?? 0) < actionConfig.trainMinValidated}
            >
              Train Model
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Backfill Modal */}
      <Modal isOpen={activeModal === "backfill"} onClose={() => setActiveModal(null)}>
        <ModalContent>
          <ModalHeader>Backfill Missing Predictions</ModalHeader>
          <ModalBody>
            <p className="text-sm text-gray-600 mb-4">
              Generate predictions for games that don't have one yet.
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Select Sports:</p>
                <div className="flex flex-wrap gap-2">
                  {SPORTS.filter(s => s.oddsKey).map(sport => (
                    <Chip
                      key={sport.key}
                      variant={actionConfig.backfillSports.includes(sport.oddsKey!) ? "solid" : "bordered"}
                      color={actionConfig.backfillSports.includes(sport.oddsKey!) ? "primary" : "default"}
                      className="cursor-pointer"
                      onClick={() => toggleSportInConfig("backfillSports", sport.oddsKey!)}
                    >
                      {sport.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <Input
                type="number"
                label="Limit"
                description="Maximum number of predictions to generate"
                value={actionConfig.backfillLimit.toString()}
                onChange={(e) => setActionConfig(prev => ({ 
                  ...prev, 
                  backfillLimit: parseInt(e.target.value) || 100 
                }))}
                min={10}
                max={500}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setActiveModal(null)}>Cancel</Button>
            <Button 
              color="primary" 
              onPress={() => executeAction("backfill")}
              isDisabled={actionConfig.backfillSports.length === 0}
            >
              Backfill (max {actionConfig.backfillLimit})
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
