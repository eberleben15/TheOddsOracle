"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Spinner } from "@nextui-org/spinner";
import { Button } from "@nextui-org/button";
import { Chip } from "@nextui-org/chip";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@nextui-org/table";
import { Tooltip } from "@nextui-org/tooltip";

interface LineMovement {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  gameTimeFormatted: string;
  
  originalSpread: number | null;
  currentSpread: number | null;
  spreadMovement: number | null;
  
  originalTotal: number | null;
  currentTotal: number | null;
  totalMovement: number | null;
  
  significantSpreadMove: boolean;
  significantTotalMove: boolean;
  significantMlMove: boolean;
  shouldRepredict: boolean;
  
  movementReasons: string[];
  repredictionCount: number;
  lastRepredictedAtFormatted: string | null;
}

interface LineMovementData {
  thresholds: {
    spreadThreshold: number;
    totalThreshold: number;
    moneylineThreshold: number;
  };
  summary: {
    total: number;
    pendingReprediction: number;
    inCooldown: number;
    maxedOut: number;
    significantSpread: number;
    significantTotal: number;
    significantMl: number;
  };
  movements: LineMovement[];
}

export default function LineMovementPage() {
  const [data, setData] = useState<LineMovementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/line-movement");
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
        setError(null);
      }
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const triggerReprediction = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/admin/line-movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        await fetchData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger");
    }
    setTriggering(false);
  };

  const formatSport = (sport: string) => {
    const map: Record<string, string> = {
      basketball_ncaab: "NCAAB",
      basketball_nba: "NBA",
      icehockey_nhl: "NHL",
      baseball_mlb: "MLB",
      americanfootball_nfl: "NFL",
      americanfootball_ncaaf: "NCAAF",
    };
    return map[sport] || sport;
  };

  const formatSpreadDelta = (original: number | null, current: number | null) => {
    if (original == null || current == null) return "—";
    const delta = current - original;
    const direction = delta > 0 ? "↑" : delta < 0 ? "↓" : "";
    return `${original.toFixed(1)} → ${current.toFixed(1)} (${direction}${Math.abs(delta).toFixed(1)})`;
  };

  const formatTimeUntilGame = (gameTimeStr: string) => {
    const gameTime = new Date(gameTimeStr);
    const now = new Date();
    const hoursUntil = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntil < 1) {
      return `${Math.round(hoursUntil * 60)}m`;
    }
    return `${hoursUntil.toFixed(1)}h`;
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <p className="text-danger">Error: {error}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { summary, movements, thresholds } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Line Movement Monitor</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Auto re-predicts when lines move significantly
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last refresh: {lastRefresh?.toLocaleTimeString() || "—"}
          </span>
          <Button 
            color="primary" 
            isLoading={loading}
            onPress={fetchData}
          >
            Refresh
          </Button>
          <Button 
            color="success" 
            isLoading={triggering}
            onPress={triggerReprediction}
            isDisabled={summary.pendingReprediction === 0}
          >
            Trigger Re-predictions ({summary.pendingReprediction})
          </Button>
        </div>
      </div>

      {error && (
        <Card className="bg-danger-50 dark:bg-danger-900/20">
          <CardBody>
            <p className="text-danger">{error}</p>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold">{summary.total}</p>
            <p className="text-sm text-gray-500">Significant Moves</p>
          </CardBody>
        </Card>

        <Card className="bg-warning-50 dark:bg-warning-900/20">
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-warning">{summary.pendingReprediction}</p>
            <p className="text-sm text-gray-500">Pending Re-prediction</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-default-500">{summary.inCooldown}</p>
            <p className="text-sm text-gray-500">In Cooldown</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-default-400">{summary.maxedOut}</p>
            <p className="text-sm text-gray-500">Max Re-predictions</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-primary">{summary.significantSpread}</p>
            <p className="text-sm text-gray-500">Spread Moves</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-secondary">{summary.significantTotal}</p>
            <p className="text-sm text-gray-500">Total Moves</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <p className="text-3xl font-bold text-success">{summary.significantMl}</p>
            <p className="text-sm text-gray-500">ML Moves</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Active Line Movements</h3>
          <div className="text-sm text-gray-500">
            Thresholds: Spread ≥{thresholds.spreadThreshold}pts, Total ≥{thresholds.totalThreshold}pts, ML ≥{thresholds.moneylineThreshold}%
          </div>
        </CardHeader>
        <CardBody>
          {movements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No significant line movements detected for upcoming games.
            </p>
          ) : (
            <Table aria-label="Line movements" isStriped>
              <TableHeader>
                <TableColumn>GAME</TableColumn>
                <TableColumn>SPORT</TableColumn>
                <TableColumn>TIME TO GAME</TableColumn>
                <TableColumn>SPREAD MOVEMENT</TableColumn>
                <TableColumn>TOTAL MOVEMENT</TableColumn>
                <TableColumn>FLAGS</TableColumn>
                <TableColumn>STATUS</TableColumn>
                <TableColumn>RE-PREDICTIONS</TableColumn>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.gameId}>
                    <TableCell>
                      <div className="font-medium">{m.awayTeam}</div>
                      <div className="text-sm text-gray-500">@ {m.homeTeam}</div>
                    </TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat">{formatSport(m.sport)}</Chip>
                    </TableCell>
                    <TableCell>{formatTimeUntilGame(m.gameTimeFormatted)}</TableCell>
                    <TableCell>
                      {m.spreadMovement != null ? (
                        <span className={m.significantSpreadMove ? "text-warning font-medium" : ""}>
                          {formatSpreadDelta(m.originalSpread, m.currentSpread)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      {m.totalMovement != null ? (
                        <span className={m.significantTotalMove ? "text-warning font-medium" : ""}>
                          {m.originalTotal?.toFixed(1)} → {m.currentTotal?.toFixed(1)} (Δ{m.totalMovement.toFixed(1)})
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {m.significantSpreadMove && (
                          <Chip size="sm" color="primary" variant="flat">Spread</Chip>
                        )}
                        {m.significantTotalMove && (
                          <Chip size="sm" color="secondary" variant="flat">Total</Chip>
                        )}
                        {m.significantMlMove && (
                          <Chip size="sm" color="success" variant="flat">ML</Chip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.shouldRepredict ? (
                        <Chip size="sm" color="warning" variant="solid">Pending</Chip>
                      ) : m.repredictionCount > 0 ? (
                        <Tooltip content={m.movementReasons.join("; ")}>
                          <Chip size="sm" color="default" variant="flat">Cooldown</Chip>
                        </Tooltip>
                      ) : (
                        <Chip size="sm" color="default" variant="flat">—</Chip>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip content={m.lastRepredictedAtFormatted ? `Last: ${new Date(m.lastRepredictedAtFormatted).toLocaleString()}` : "Never"}>
                        <span className={m.repredictionCount > 0 ? "text-warning" : ""}>
                          {m.repredictionCount}/3
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">How It Works</h3>
        </CardHeader>
        <CardBody className="text-sm text-gray-600 dark:text-gray-400">
          <ul className="list-disc ml-5 space-y-1">
            <li>The cron job runs every 15 minutes to check for line movement</li>
            <li>When spread moves ≥{thresholds.spreadThreshold} pts, total moves ≥{thresholds.totalThreshold} pts, or moneyline changes ≥{thresholds.moneylineThreshold}%, a re-prediction is triggered</li>
            <li>Re-predictions are only generated if the new prediction materially differs (≥1pt spread or ≥5% confidence change)</li>
            <li>Each game can have up to 3 re-predictions with a 60-minute cooldown between them</li>
            <li>Games within 30 minutes of start are excluded to avoid noise</li>
            <li>All changes are logged to prediction history for auditing</li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
