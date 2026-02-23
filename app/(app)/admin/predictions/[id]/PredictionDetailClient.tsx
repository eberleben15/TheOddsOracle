"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Divider,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@nextui-org/react";
import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface PredictionData {
  id: string;
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  sport: string | null;
  predictedScore: { home: number; away: number } | null;
  predictedSpread: number;
  alternateSpread: {
    spread: number;
    direction: string;
    team: string;
    reason: string;
    confidence: number;
    riskLevel: string;
  } | null;
  predictedTotal: number | null;
  winProbability: { home: number; away: number } | null;
  confidence: number;
  keyFactors: string[] | null;
  valueBets: Array<{
    type: string;
    recommendation: string;
    confidence: number;
    reason: string;
  }> | null;
  favorableBets: unknown | null;
  oddsSnapshot: unknown | null;
  predictionTrace: {
    modelPath: string;
    totalScore: number;
    homeAdvantage: number;
    homeWinProbRaw: number;
    recalibrationApplied: boolean;
    fourFactorsScore?: number;
    efficiencyScore?: number;
  } | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualWinner: string | null;
  actualTotal: number | null;
  openingSpread: number | null;
  closingSpread: number | null;
  openingTotal: number | null;
  closingTotal: number | null;
  clvSpread: number | null;
  clvTotal: number | null;
  lineMovement: number | null;
  validated: boolean;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PredictionHistory {
  id: string;
  changeType: string;
  previousValues: unknown | null;
  newValues: unknown;
  reason: string | null;
  triggeredBy: string | null;
  createdAt: string;
}

interface OddsHistoryItem {
  id: string;
  gameId: string;
  sport: string;
  capturedAt: string;
  consensusSpread: number | null;
  consensusTotal: number | null;
  isOpening: boolean;
  isClosing: boolean;
}

interface TrackedGame {
  id: string;
  externalId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  status: string;
  discoveredAt: string;
  predictedAt: string | null;
}

interface PredictionDetailResponse {
  prediction: PredictionData;
  history: PredictionHistory[];
  oddsHistory: OddsHistoryItem[];
  trackedGame: TrackedGame | null;
}

export function PredictionDetailClient({ predictionId }: { predictionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<PredictionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrediction = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/predictions/${predictionId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch prediction");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [predictionId]);

  useEffect(() => {
    fetchPrediction();
  }, [fetchPrediction]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardBody className="text-center py-8">
          <p className="text-red-500 mb-4">{error || "Prediction not found"}</p>
          <Button color="primary" onPress={() => router.back()}>
            Go Back
          </Button>
        </CardBody>
      </Card>
    );
  }

  const { prediction, history, oddsHistory, trackedGame } = data;
  const p = prediction;

  const predictedHome = p.predictedScore?.home ?? 0;
  const predictedAway = p.predictedScore?.away ?? 0;
  const predictedWinner = predictedHome > predictedAway ? "home" : predictedAway > predictedHome ? "away" : "tie";
  const predictedWinnerTeam = predictedWinner === "home" ? p.homeTeam : p.awayTeam;

  const actualHome = p.actualHomeScore ?? null;
  const actualAway = p.actualAwayScore ?? null;
  const actualWinner = actualHome !== null && actualAway !== null
    ? (actualHome > actualAway ? "home" : actualAway > actualHome ? "away" : "tie")
    : null;

  const wasCorrect = p.validated && actualWinner === predictedWinner;

  const homeWinProb = (p.winProbability?.home ?? 0) > 1 
    ? p.winProbability?.home ?? 0 
    : (p.winProbability?.home ?? 0) * 100;
  const awayWinProb = (p.winProbability?.away ?? 0) > 1 
    ? p.winProbability?.away ?? 0 
    : (p.winProbability?.away ?? 0) * 100;
  const confidence = p.confidence > 1 ? p.confidence : p.confidence * 100;

  const homeError = actualHome !== null ? actualHome - predictedHome : null;
  const awayError = actualAway !== null ? actualAway - predictedAway : null;
  const spreadError = actualHome !== null && actualAway !== null
    ? Math.abs((actualAway - actualHome) - p.predictedSpread)
    : null;
  const totalError = p.actualTotal !== null && p.predictedTotal !== null
    ? p.actualTotal - p.predictedTotal
    : null;

  const getSportLabel = (sport: string | null) => {
    if (!sport) return "Unknown";
    if (sport.includes("ncaab")) return "College Basketball";
    if (sport.includes("nba")) return "NBA";
    if (sport.includes("nhl")) return "NHL";
    if (sport.includes("mlb")) return "MLB";
    return sport;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          isIconOnly
          variant="light"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Prediction Details</h1>
          <p className="text-sm text-gray-500">
            {p.awayTeam} @ {p.homeTeam}
          </p>
        </div>
        <Button
          variant="flat"
          startContent={<ArrowPathIcon className="w-4 h-4" />}
          onPress={fetchPrediction}
        >
          Refresh
        </Button>
      </div>

      {/* Main Info Card */}
      <Card>
        <CardHeader className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <span className={`text-xl font-bold ${predictedWinner === "away" ? "text-green-600" : ""}`}>
                {p.awayTeam}
              </span>
              <span className="text-gray-400">@</span>
              <span className={`text-xl font-bold ${predictedWinner === "home" ? "text-green-600" : ""}`}>
                {p.homeTeam}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {new Date(p.date).toLocaleDateString("en-US", { 
                weekday: "long", 
                month: "long", 
                day: "numeric", 
                year: "numeric",
                hour: "numeric",
                minute: "2-digit"
              })}
              {" • "}
              {getSportLabel(p.sport)}
            </div>
          </div>
          <div className="flex gap-2">
            <Chip color="primary" variant="flat">
              Pick: {predictedWinnerTeam}
            </Chip>
            <Chip 
              color={p.validated ? (wasCorrect ? "success" : "danger") : "warning"} 
              variant="flat"
            >
              {p.validated ? (wasCorrect ? "Correct" : "Wrong") : "Pending"}
            </Chip>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Predicted vs Actual */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Score Prediction</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Predicted */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-2">Predicted</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Away:</span>
                      <span className={`text-lg font-bold ${predictedWinner === "away" ? "text-green-600" : ""}`}>
                        {predictedAway}{predictedWinner === "away" && " ✓"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Home:</span>
                      <span className={`text-lg font-bold ${predictedWinner === "home" ? "text-green-600" : ""}`}>
                        {predictedHome}{predictedWinner === "home" && " ✓"}
                      </span>
                    </div>
                    <Divider />
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Total:</span>
                      <span className="font-medium">{p.predictedTotal?.toFixed(0) ?? (predictedHome + predictedAway)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Spread:</span>
                      <span className="font-medium">{p.predictedSpread > 0 ? "+" : ""}{p.predictedSpread.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Actual */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-2">Actual</div>
                  {p.validated && actualHome !== null && actualAway !== null ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Away:</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${actualWinner === "away" ? "text-blue-600" : ""}`}>
                            {actualAway}{actualWinner === "away" && " ✓"}
                          </span>
                          <span className={`text-sm ${awayError === 0 ? "text-green-500" : Math.abs(awayError!) <= 5 ? "text-yellow-500" : "text-red-500"}`}>
                            ({awayError! >= 0 ? "+" : ""}{awayError})
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Home:</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${actualWinner === "home" ? "text-blue-600" : ""}`}>
                            {actualHome}{actualWinner === "home" && " ✓"}
                          </span>
                          <span className={`text-sm ${homeError === 0 ? "text-green-500" : Math.abs(homeError!) <= 5 ? "text-yellow-500" : "text-red-500"}`}>
                            ({homeError! >= 0 ? "+" : ""}{homeError})
                          </span>
                        </div>
                      </div>
                      <Divider />
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Total:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.actualTotal}</span>
                          {totalError !== null && (
                            <span className={`text-xs ${totalError === 0 ? "text-green-500" : Math.abs(totalError) <= 5 ? "text-yellow-500" : "text-red-500"}`}>
                              ({totalError >= 0 ? "+" : ""}{totalError.toFixed(0)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Spread Error:</span>
                        <span className={`font-medium ${spreadError !== null && spreadError <= 3 ? "text-green-500" : spreadError !== null && spreadError <= 7 ? "text-yellow-500" : "text-red-500"}`}>
                          {spreadError?.toFixed(1) ?? "-"} pts
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-center py-8">
                      Game not yet completed
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Win Probability & Confidence */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Confidence Metrics</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Win Probability</div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{p.awayTeam.split(" ").pop()}</span>
                        <span className="font-medium">{awayWinProb.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${awayWinProb}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{p.homeTeam.split(" ").pop()}</span>
                        <span className="font-medium">{homeWinProb.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${homeWinProb}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Divider />

                <div>
                  <div className="text-sm text-gray-500 mb-1">Overall Confidence</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${confidence >= 70 ? "bg-green-500" : confidence >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${confidence}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-lg font-bold ${confidence >= 70 ? "text-green-600" : confidence >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                      {confidence.toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {confidence >= 70 ? "High confidence" : confidence >= 50 ? "Medium confidence" : "Low confidence"}
                  </div>
                </div>
              </div>

              {/* Alternate Spread */}
              {p.alternateSpread && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
                    Alternate Spread Suggestion
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Chip size="sm" color={p.alternateSpread.riskLevel === "safer" ? "success" : p.alternateSpread.riskLevel === "aggressive" ? "danger" : "default"}>
                      {p.alternateSpread.riskLevel}
                    </Chip>
                    <span className="font-semibold">
                      {p.alternateSpread.spread > 0 ? "+" : ""}{p.alternateSpread.spread.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {p.alternateSpread.reason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Key Factors */}
      {p.keyFactors && p.keyFactors.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Key Factors</h3>
          </CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {p.keyFactors.map((factor, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span className="text-gray-700 dark:text-gray-300">{factor}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* Model Trace */}
      {p.predictionTrace && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Model Details</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Model Path</div>
                <div className="font-medium">{p.predictionTrace.modelPath}</div>
              </div>
              <div>
                <div className="text-gray-500">Total Score</div>
                <div className="font-medium">{p.predictionTrace.totalScore.toFixed(3)}</div>
              </div>
              <div>
                <div className="text-gray-500">Home Advantage</div>
                <div className="font-medium">{p.predictionTrace.homeAdvantage.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-500">Raw Win Prob</div>
                <div className="font-medium">{(p.predictionTrace.homeWinProbRaw * 100).toFixed(1)}%</div>
              </div>
              {p.predictionTrace.fourFactorsScore !== undefined && (
                <div>
                  <div className="text-gray-500">Four Factors Score</div>
                  <div className="font-medium">{p.predictionTrace.fourFactorsScore.toFixed(3)}</div>
                </div>
              )}
              {p.predictionTrace.efficiencyScore !== undefined && (
                <div>
                  <div className="text-gray-500">Efficiency Score</div>
                  <div className="font-medium">{p.predictionTrace.efficiencyScore.toFixed(3)}</div>
                </div>
              )}
              <div>
                <div className="text-gray-500">Recalibration</div>
                <div className="font-medium">{p.predictionTrace.recalibrationApplied ? "Applied" : "Not Applied"}</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Line Movement */}
      {(p.openingSpread !== null || oddsHistory.length > 0) && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Line Movement & CLV</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
              <div>
                <div className="text-gray-500">Opening Spread</div>
                <div className="font-medium">
                  {p.openingSpread !== null ? `${p.openingSpread > 0 ? "+" : ""}${p.openingSpread.toFixed(1)}` : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Closing Spread</div>
                <div className="font-medium">
                  {p.closingSpread !== null ? `${p.closingSpread > 0 ? "+" : ""}${p.closingSpread.toFixed(1)}` : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Line Movement</div>
                <div className={`font-medium ${p.lineMovement && p.lineMovement > 0 ? "text-blue-500" : p.lineMovement && p.lineMovement < 0 ? "text-purple-500" : ""}`}>
                  {p.lineMovement !== null ? `${p.lineMovement > 0 ? "+" : ""}${p.lineMovement.toFixed(1)}` : "-"}
                </div>
              </div>
              <div>
                <div className="text-gray-500">CLV (Spread)</div>
                <div className={`font-medium ${p.clvSpread && p.clvSpread > 0 ? "text-green-500" : p.clvSpread && p.clvSpread < 0 ? "text-red-500" : ""}`}>
                  {p.clvSpread !== null ? `${p.clvSpread > 0 ? "+" : ""}${p.clvSpread.toFixed(2)}` : "-"}
                </div>
              </div>
            </div>

            {oddsHistory.length > 0 && (
              <>
                <Divider className="my-4" />
                <div className="text-sm text-gray-500 mb-2">Odds Capture History</div>
                <Table aria-label="Odds history" removeWrapper>
                  <TableHeader>
                    <TableColumn>Time</TableColumn>
                    <TableColumn>Spread</TableColumn>
                    <TableColumn>Total</TableColumn>
                    <TableColumn>Flags</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {oddsHistory.slice(0, 10).map((oh) => (
                      <TableRow key={oh.id}>
                        <TableCell>
                          {new Date(oh.capturedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          {oh.consensusSpread != null ? `${oh.consensusSpread > 0 ? "+" : ""}${oh.consensusSpread.toFixed(1)}` : "-"}
                        </TableCell>
                        <TableCell>{oh.consensusTotal?.toFixed(1) ?? "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {oh.isOpening && <Chip size="sm" color="primary" variant="flat">Opening</Chip>}
                            {oh.isClosing && <Chip size="sm" color="success" variant="flat">Closing</Chip>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {/* Prediction History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Prediction History</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <Chip size="sm" color={
                    h.changeType === "created" ? "primary" :
                    h.changeType === "regenerated" ? "warning" :
                    h.changeType === "validated" ? "success" : "default"
                  } variant="flat">
                    {h.changeType}
                  </Chip>
                  <div className="flex-1">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {h.reason || `Prediction ${h.changeType}`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(h.createdAt).toLocaleString()} 
                      {h.triggeredBy && ` • ${h.triggeredBy}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Metadata</h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Prediction ID</div>
              <div className="font-mono text-xs break-all">{p.id}</div>
            </div>
            <div>
              <div className="text-gray-500">Game ID</div>
              <div className="font-mono text-xs break-all">{p.gameId}</div>
            </div>
            <div>
              <div className="text-gray-500">Created</div>
              <div className="font-medium">{new Date(p.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Updated</div>
              <div className="font-medium">{new Date(p.updatedAt).toLocaleString()}</div>
            </div>
            {p.validatedAt && (
              <div>
                <div className="text-gray-500">Validated At</div>
                <div className="font-medium">{new Date(p.validatedAt).toLocaleString()}</div>
              </div>
            )}
            {trackedGame && (
              <>
                <div>
                  <div className="text-gray-500">Discovered</div>
                  <div className="font-medium">{new Date(trackedGame.discoveredAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Game Status</div>
                  <Chip size="sm" color={trackedGame.status === "completed" ? "success" : "default"}>
                    {trackedGame.status}
                  </Chip>
                </div>
              </>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
