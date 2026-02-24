"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Tabs,
  Tab,
  Input,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  useDisclosure,
} from "@nextui-org/react";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

interface RecommendedBet {
  type: string;
  side: string;
  line: number | null;
  confidence: number;
  reasoning: string;
  edge?: number;
  isModelOnly?: boolean;
  tier?: "high" | "medium" | "low";
}

interface BetRecommendation {
  id: string;
  predictionId: string;
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  sport: string | null;
  predictedScore: { home: number; away: number };
  predictedSpread: number;
  predictedTotal: number | null;
  winProbability: { home: number; away: number };
  confidence: number;
  keyFactors: string[];
  oddsSnapshot: Record<string, unknown> | null;
  favorableBets?: Array<{ type: string; team?: string; recommendation: string; edge: number; confidence: number; valueRating?: string }> | null;
  recommendedBets: RecommendedBet[];
  alreadyBet: boolean;
}

interface BetRecord {
  id: string;
  predictionId: string;
  gameId: string;
  date: string;
  sport: string | null;
  homeTeam: string;
  awayTeam: string;
  betType: string;
  betSide: string;
  line: number | null;
  odds: number;
  stake: number;
  potentialPayout: number;
  confidence: number;
  edge: number | null;
  result: string | null;
  actualPayout: number | null;
  settledAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface RecordsStats {
  total: number;
  pending: number;
  wins: number;
  losses: number;
  pushes: number;
  totalStaked: number;
  totalPnL: number;
}

const SPORT_OPTIONS = [
  { value: "", label: "All Sports" },
  { value: "basketball_ncaab", label: "College Basketball" },
  { value: "basketball_nba", label: "NBA" },
  { value: "icehockey_nhl", label: "NHL" },
  { value: "baseball_mlb", label: "MLB" },
];

export function BetsPageClient() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState("");
  const [sport, setSport] = useState("");
  
  // Recommendations state
  const [recommendations, setRecommendations] = useState<BetRecommendation[]>([]);
  const [lowConfidence, setLowConfidence] = useState<BetRecommendation[]>([]);
  const [performanceGate, setPerformanceGate] = useState<{
    passed: boolean;
    atsWinRate: number;
    gamesDecided: number;
    threshold: number;
    strictGateUsed?: boolean;
    recsHiddenDueToGate?: boolean;
  } | null>(null);
  const [strictGate, setStrictGate] = useState(false);
  const [showModelOnlyDisclaimer, setShowModelOnlyDisclaimer] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(true);
  
  // Bet records state
  const [records, setRecords] = useState<BetRecord[]>([]);
  const [recordsStats, setRecordsStats] = useState<RecordsStats | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsPage, setRecordsPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [recordsFilter, setRecordsFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  // Initialize date on client only to avoid hydration mismatch
  useEffect(() => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setMounted(true);
  }, []);
  
  // Place bet modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedRec, setSelectedRec] = useState<BetRecommendation | null>(null);
  const [selectedBetType, setSelectedBetType] = useState<RecommendedBet | null>(null);
  const [betStake, setBetStake] = useState("10");
  const [betOdds, setBetOdds] = useState("-110");
  const [placingBet, setPlacingBet] = useState(false);

  // Settle modal
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settlingBet, setSettlingBet] = useState<BetRecord | null>(null);
  const [settleResult, setSettleResult] = useState("win");

  const fetchRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (sport) params.set("sport", sport);
      if (strictGate) params.set("strictGate", "true");

      const res = await fetch(`/api/admin/bets/recommendations?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = (data?.error as string) || `Request failed (${res.status})`;
        throw new Error(message);
      }
      setRecommendations(data.recommendations || []);
      setLowConfidence(data.lowConfidence || []);
      setPerformanceGate(data.performanceGate ?? null);
      setShowModelOnlyDisclaimer(data.showModelOnlyDisclaimer ?? false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load recommendations";
      setError(message);
      setRecommendations([]);
      setLowConfidence([]);
      setPerformanceGate(null);
      setShowModelOnlyDisclaimer(false);
    } finally {
      setLoadingRecs(false);
    }
  }, [selectedDate, sport, strictGate]);

  const fetchRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const params = new URLSearchParams({
        page: String(recordsPage),
        limit: "20",
        result: recordsFilter,
        days: "90",
      });
      if (sport) params.set("sport", sport);
      
      const res = await fetch(`/api/admin/bets/records?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecords(data.records || []);
      setRecordsStats(data.stats || null);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error("Error fetching records:", err);
    } finally {
      setLoadingRecords(false);
    }
  }, [recordsPage, recordsFilter, sport]);

  useEffect(() => {
    if (!mounted || !selectedDate) return;
    if (activeTab === "today") {
      fetchRecommendations();
    } else {
      fetchRecords();
    }
  }, [activeTab, fetchRecommendations, fetchRecords, mounted, selectedDate]);

  const handleDateChange = (direction: "prev" | "next") => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const openPlaceBetModal = (rec: BetRecommendation, bet: RecommendedBet) => {
    setSelectedRec(rec);
    setSelectedBetType(bet);
    setBetStake("10");
    setBetOdds("-110");
    onOpen();
  };

  const handlePlaceBet = async () => {
    if (!selectedRec || !selectedBetType) return;
    setPlacingBet(true);
    try {
      const res = await fetch("/api/admin/bets/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictionId: selectedRec.predictionId,
          gameId: selectedRec.gameId,
          date: selectedRec.date,
          sport: selectedRec.sport,
          homeTeam: selectedRec.homeTeam,
          awayTeam: selectedRec.awayTeam,
          betType: selectedBetType.type,
          betSide: selectedBetType.side,
          line: selectedBetType.line,
          odds: parseInt(betOdds),
          stake: parseFloat(betStake),
          confidence: selectedBetType.confidence,
        }),
      });
      if (!res.ok) throw new Error("Failed to place bet");
      onClose();
      fetchRecommendations();
    } catch (err) {
      console.error("Error placing bet:", err);
    } finally {
      setPlacingBet(false);
    }
  };

  const openSettleModal = (bet: BetRecord) => {
    setSettlingBet(bet);
    setSettleResult("win");
    setSettleModalOpen(true);
  };

  const handleSettleBet = async () => {
    if (!settlingBet) return;
    try {
      const res = await fetch(`/api/admin/bets/records/${settlingBet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: settleResult }),
      });
      if (!res.ok) throw new Error("Failed to settle bet");
      setSettleModalOpen(false);
      fetchRecords();
    } catch (err) {
      console.error("Error settling bet:", err);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getSportLabel = (sportKey: string | null) => {
    const found = SPORT_OPTIONS.find(s => s.value === sportKey);
    return found?.label || sportKey || "Unknown";
  };

  const getBetTypeLabel = (type: string) => {
    switch (type) {
      case "spread": return "Spread";
      case "moneyline": return "Moneyline";
      case "total_over": return "Over";
      case "total_under": return "Under";
      case "total_prediction": return "Predicted Total";
      default: return type;
    }
  };

  // Format bet line for display: American spread (negative=favorite), totals without + prefix
  const formatBetLine = (bet: RecommendedBet) => {
    if (bet.line === null) return "";
    if (bet.type === "total_over" || bet.type === "total_under" || bet.type === "total_prediction")
      return ` ${bet.line}`;
    if (bet.type === "spread") {
      const american = bet.side === "home" ? -bet.line : bet.line;
      return ` ${american > 0 ? "+" : ""}${american}`;
    }
    return ` ${bet.line > 0 ? "+" : ""}${bet.line}`;
  };

  const formatRecordLine = (record: BetRecord) => {
    if (record.line === null) return "";
    if (record.betType === "total_over" || record.betType === "total_under") return ` ${record.line}`;
    if (record.betType === "spread") {
      const american = record.betSide === "home" ? -record.line : record.line;
      return ` ${american > 0 ? "+" : ""}${american}`;
    }
    return ` ${record.line > 0 ? "+" : ""}${record.line}`;
  };

  const getResultColor = (result: string | null) => {
    switch (result) {
      case "win": return "success";
      case "loss": return "danger";
      case "push": return "warning";
      default: return "default";
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        size="lg"
      >
        <Tab key="today" title="Today's Picks" />
        <Tab key="history" title="Bet History" />
      </Tabs>

      {/* Sport Filter */}
      <div className="flex items-center gap-4">
        <Select
          label="Sport"
          size="sm"
          className="max-w-xs"
          selectedKeys={[sport]}
          onChange={(e) => setSport(e.target.value)}
        >
          {SPORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </Select>

        {activeTab === "today" && (
          <>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={strictGate}
              onChange={(e) => setStrictGate(e.target.checked)}
              className="rounded"
            />
            <span>Hide recs when ATS &lt; 53%</span>
          </label>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              isIconOnly
              onPress={() => handleDateChange("prev")}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              <span className="font-medium">
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <Button
              size="sm"
              variant="flat"
              isIconOnly
              onPress={() => handleDateChange("next")}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="flat"
              onPress={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            >
              Today
            </Button>
          </div>
          </>
        )}

        {activeTab === "history" && (
          <Select
            label="Filter"
            size="sm"
            className="max-w-xs"
            selectedKeys={[recordsFilter]}
            onChange={(e) => { setRecordsFilter(e.target.value); setRecordsPage(1); }}
          >
            <SelectItem key="all" value="all">All Results</SelectItem>
            <SelectItem key="pending" value="pending">Pending</SelectItem>
            <SelectItem key="win" value="win">Wins</SelectItem>
            <SelectItem key="loss" value="loss">Losses</SelectItem>
            <SelectItem key="push" value="push">Pushes</SelectItem>
          </Select>
        )}
      </div>

      {/* Today's Picks */}
      {activeTab === "today" && (
        <div className="space-y-4">
          {loadingRecs ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <Card className="border-red-200 dark:border-red-800">
              <CardBody className="text-center py-12">
                <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                <Button className="mt-4" color="primary" variant="flat" onPress={fetchRecommendations}>
                  Retry
                </Button>
              </CardBody>
            </Card>
          ) : recommendations.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <p className="text-gray-500">No actionable picks for this date.</p>
                <p className="text-sm text-gray-400 mt-1">
                  {lowConfidence.length} games with low confidence not shown.
                </p>
              </CardBody>
            </Card>
          ) : (
            <>
              {performanceGate?.recsHiddenDueToGate && (
                <Card className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
                  <CardBody className="py-3">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Strict gate:</strong> Recommendations hidden because ATS is {performanceGate.atsWinRate.toFixed(1)}% (below {performanceGate.threshold}% threshold). Uncheck &quot;Hide recs when ATS &lt; 53%&quot; to show them.
                    </p>
                  </CardBody>
                </Card>
              )}
              {performanceGate && !performanceGate.passed && !performanceGate.recsHiddenDueToGate && (
                <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
                  <CardBody className="py-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Performance note:</strong> Historical ATS win rate is {performanceGate.atsWinRate.toFixed(1)}% ({performanceGate.gamesDecided} games).
                      Recommendations are shown for internal use. Consider the {performanceGate.threshold}% ATS threshold before relying on these picks.
                    </p>
                  </CardBody>
                </Card>
              )}
              {showModelOnlyDisclaimer && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Some picks are model-only (no market odds to compare). Odds may differ at your sportsbook.
                </p>
              )}
              <p className="text-sm text-gray-500">
                {recommendations.length} recommended picks • {lowConfidence.length} low confidence games hidden
              </p>
              
              {recommendations.map((rec) => (
                <Card key={rec.id} className={rec.alreadyBet ? "border-2 border-green-500" : ""}>
                  <CardHeader className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">
                          {rec.awayTeam} @ {rec.homeTeam}
                        </span>
                        {rec.alreadyBet && (
                          <Chip size="sm" color="success" variant="flat">
                            Bet Placed
                          </Chip>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Chip size="sm" variant="flat">
                          {getSportLabel(rec.sport)}
                        </Chip>
                        <span className="text-sm text-gray-500">
                          {formatDate(rec.date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {rec.confidence.toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">Confidence</div>
                    </div>
                  </CardHeader>
                  <CardBody className="space-y-4">
                    {/* Prediction Summary */}
                    <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Predicted Score</div>
                        <div className="font-semibold">
                          {rec.predictedScore.away} - {rec.predictedScore.home}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Spread (home)</div>
                        <div className="font-semibold">
                          {rec.predictedSpread > 0 ? "+" : ""}{rec.predictedSpread.toFixed(1)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Win Prob</div>
                        <div className="font-semibold">
                          {rec.winProbability.away.toFixed(0)}% - {rec.winProbability.home.toFixed(0)}%
                        </div>
                      </div>
                    </div>

                    {/* Recommended Bets */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Recommended Bets:</div>
                      {rec.recommendedBets.map((bet, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Chip
                                size="sm"
                                color={bet.confidence >= 65 ? "success" : "primary"}
                              >
                                {getBetTypeLabel(bet.type)}
                              </Chip>
                              {bet.tier && (
                                <Chip size="sm" variant="bordered" color={
                                  bet.tier === "high" ? "success" :
                                  bet.tier === "medium" ? "primary" : "default"
                                }>
                                  {bet.tier} edge
                                </Chip>
                              )}
                              {bet.isModelOnly && (
                                <Chip size="sm" variant="flat" color="warning">
                                  Model only
                                </Chip>
                              )}
                              <span className="font-medium">
                                {bet.side === "home" ? rec.homeTeam : 
                                 bet.side === "away" ? rec.awayTeam :
                                 bet.side.charAt(0).toUpperCase() + bet.side.slice(1)}
                                {formatBetLine(bet)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {bet.reasoning}
                            </p>
                          </div>
                          {bet.type !== "total_prediction" ? (
                            <Button
                              size="sm"
                              color="primary"
                              isDisabled={rec.alreadyBet}
                              onPress={() => openPlaceBetModal(rec, bet)}
                            >
                              Place Bet
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-500">Informational — compare to your book</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Favorable Bets from matchup page (when user viewed and enriched) */}
                    {rec.favorableBets && rec.favorableBets.length > 0 && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400">Favorable bets (matchup):</span>{" "}
                        {rec.favorableBets.slice(0, 3).map((fb, i) => (
                          <Chip key={i} size="sm" variant="flat" className="mr-1 mt-1">
                            {fb.recommendation} ({fb.edge.toFixed(1)}% edge)
                          </Chip>
                        ))}
                      </div>
                    )}

                    {/* Key Factors */}
                    {rec.keyFactors.length > 0 && (
                      <div className="text-sm text-gray-500 break-words">
                        <span className="font-medium">Key factors:</span>{" "}
                        {rec.keyFactors.slice(0, 5).join(" • ")}
                      </div>
                    )}
                  </CardBody>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* Bet History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Stats Summary */}
          {recordsStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <Card>
                <CardBody className="text-center p-3">
                  <div className="text-2xl font-bold">{recordsStats.total}</div>
                  <div className="text-xs text-gray-500">Total Bets</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center p-3">
                  <div className="text-2xl font-bold text-yellow-600">{recordsStats.pending}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center p-3">
                  <div className="text-2xl font-bold text-green-600">{recordsStats.wins}</div>
                  <div className="text-xs text-gray-500">Wins</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center p-3">
                  <div className="text-2xl font-bold text-red-600">{recordsStats.losses}</div>
                  <div className="text-xs text-gray-500">Losses</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center p-3">
                  <div className="text-2xl font-bold">{formatCurrency(recordsStats.totalStaked)}</div>
                  <div className="text-xs text-gray-500">Total Staked</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center p-3">
                  <div className={`text-2xl font-bold ${recordsStats.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {recordsStats.totalPnL >= 0 ? "+" : ""}{formatCurrency(recordsStats.totalPnL)}
                  </div>
                  <div className="text-xs text-gray-500">Total P&L</div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="text-center p-3">
                  <div className={`text-2xl font-bold ${recordsStats.wins > recordsStats.losses ? "text-green-600" : "text-red-600"}`}>
                    {recordsStats.wins + recordsStats.losses > 0
                      ? ((recordsStats.wins / (recordsStats.wins + recordsStats.losses)) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Win Rate</div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Records Table */}
          {loadingRecords ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : records.length === 0 ? (
            <Card>
              <CardBody className="text-center py-12">
                <p className="text-gray-500">No bet records found.</p>
              </CardBody>
            </Card>
          ) : (
            <>
              <Table aria-label="Bet records">
                <TableHeader>
                  <TableColumn>DATE</TableColumn>
                  <TableColumn>MATCHUP</TableColumn>
                  <TableColumn>BET</TableColumn>
                  <TableColumn>ODDS</TableColumn>
                  <TableColumn>STAKE</TableColumn>
                  <TableColumn>RESULT</TableColumn>
                  <TableColumn>P&L</TableColumn>
                  <TableColumn>ACTIONS</TableColumn>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div className="text-sm">{formatDate(record.date)}</div>
                        <div className="text-xs text-gray-500">{getSportLabel(record.sport)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{record.awayTeam} @ {record.homeTeam}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Chip size="sm" variant="flat">{getBetTypeLabel(record.betType)}</Chip>
                          <span className="text-sm">
                            {record.betSide === "home" ? record.homeTeam.split(" ").pop() :
                             record.betSide === "away" ? record.awayTeam.split(" ").pop() :
                             record.betSide}
                            {formatRecordLine(record)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{record.odds > 0 ? "+" : ""}{record.odds}</TableCell>
                      <TableCell>{formatCurrency(record.stake)}</TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={getResultColor(record.result)}
                          startContent={
                            record.result === "win" ? <CheckCircleIcon className="h-3 w-3" /> :
                            record.result === "loss" ? <XCircleIcon className="h-3 w-3" /> :
                            <ClockIcon className="h-3 w-3" />
                          }
                        >
                          {record.result || "Pending"}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        {record.actualPayout !== null ? (
                          <span className={record.actualPayout >= 0 ? "text-green-600" : "text-red-600"}>
                            {record.actualPayout >= 0 ? "+" : ""}{formatCurrency(record.actualPayout)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {(!record.result || record.result === "pending") && (
                          <Button
                            size="sm"
                            variant="flat"
                            onPress={() => openSettleModal(record)}
                          >
                            Settle
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center">
                  <Pagination
                    page={recordsPage}
                    total={totalPages}
                    onChange={setRecordsPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Place Bet Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Place Bet</ModalHeader>
          <ModalBody>
            {selectedRec && selectedBetType && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="font-medium">{selectedRec.awayTeam} @ {selectedRec.homeTeam}</div>
                  <div className="text-sm text-gray-500">{formatDate(selectedRec.date)}</div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Chip size="sm" color="primary">{getBetTypeLabel(selectedBetType.type)}</Chip>
                    <span className="font-medium">
                      {selectedBetType.side === "home" ? selectedRec.homeTeam :
                       selectedBetType.side === "away" ? selectedRec.awayTeam :
                       selectedBetType.side}
                      {formatBetLine(selectedBetType)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{selectedBetType.reasoning}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Stake ($)"
                    type="number"
                    value={betStake}
                    onValueChange={setBetStake}
                    startContent={<CurrencyDollarIcon className="h-4 w-4 text-gray-400" />}
                  />
                  <Input
                    label="Odds"
                    type="number"
                    value={betOdds}
                    onValueChange={setBetOdds}
                    description="American odds (e.g. -110)"
                  />
                </div>

                {betStake && betOdds && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Potential Payout:</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(
                        parseFloat(betStake) * (
                          parseInt(betOdds) < 0
                            ? 100 / Math.abs(parseInt(betOdds))
                            : parseInt(betOdds) / 100
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button
              color="primary"
              onPress={handlePlaceBet}
              isLoading={placingBet}
            >
              Record Bet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Settle Bet Modal */}
      <Modal isOpen={settleModalOpen} onClose={() => setSettleModalOpen(false)}>
        <ModalContent>
          <ModalHeader>Settle Bet</ModalHeader>
          <ModalBody>
            {settlingBet && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="font-medium">{settlingBet.awayTeam} @ {settlingBet.homeTeam}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Chip size="sm" variant="flat">{getBetTypeLabel(settlingBet.betType)}</Chip>
                    <span className="text-sm">
                      {settlingBet.betSide === "home" ? settlingBet.homeTeam :
                       settlingBet.betSide === "away" ? settlingBet.awayTeam :
                       settlingBet.betSide}
                      {formatRecordLine(settlingBet)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Stake: {formatCurrency(settlingBet.stake)} at {settlingBet.odds > 0 ? "+" : ""}{settlingBet.odds}
                  </div>
                </div>

                <Select
                  label="Result"
                  selectedKeys={[settleResult]}
                  onChange={(e) => setSettleResult(e.target.value)}
                >
                  <SelectItem key="win" value="win">Win</SelectItem>
                  <SelectItem key="loss" value="loss">Loss</SelectItem>
                  <SelectItem key="push" value="push">Push</SelectItem>
                </Select>

                <div className={`rounded-lg p-3 ${
                  settleResult === "win" ? "bg-green-50 dark:bg-green-900/20" :
                  settleResult === "loss" ? "bg-red-50 dark:bg-red-900/20" :
                  "bg-gray-50 dark:bg-gray-800"
                }`}>
                  <div className="text-sm text-gray-600">P&L:</div>
                  <div className={`text-xl font-bold ${
                    settleResult === "win" ? "text-green-600" :
                    settleResult === "loss" ? "text-red-600" :
                    "text-gray-600"
                  }`}>
                    {settleResult === "win"
                      ? `+${formatCurrency(settlingBet.potentialPayout)}`
                      : settleResult === "loss"
                      ? `-${formatCurrency(settlingBet.stake)}`
                      : "$0.00 (Push)"}
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setSettleModalOpen(false)}>Cancel</Button>
            <Button color="primary" onPress={handleSettleBet}>
              Settle Bet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
