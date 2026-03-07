"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Button, Input, Select, SelectItem, Spinner } from "@nextui-org/react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@nextui-org/table";
import { PlayIcon, ArrowPathIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

interface BacktestRun {
  id: string;
  name: string;
  strategyType: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  sport: string | null;
  metrics: Record<string, unknown>;
  createdAt: string;
  positionCount: number;
}

export default function BacktestAdminPage() {
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [positions, setPositions] = useState<Array<{
    positionIndex: number;
    winProb: number;
    price: number;
    stakeUsd: number;
    won: boolean;
    pnlUsd: number;
    bankrollAfter: number;
  }>>([]);

  const days = "90";
  const [daysEdit, setDaysEdit] = useState(days);
  const [sportEdit, setSportEdit] = useState<string>("");
  const [bankrollEdit, setBankrollEdit] = useState("1000");
  const [strategyEdit, setStrategyEdit] = useState("flat_2");

  const loadRuns = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/backtest/runs?limit=30")
      .then((res) => res.json())
      .then((data) => {
        setRuns(data.runs ?? []);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const runBacktest = () => {
    setRunning(true);
    setError(null);
    fetch("/api/admin/backtest/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        days: parseInt(daysEdit, 10) || 90,
        sport: sportEdit || undefined,
        bankroll: parseFloat(bankrollEdit) || 1000,
        strategy: strategyEdit,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        loadRuns();
      })
      .catch((err) => setError(err.message))
      .finally(() => setRunning(false));
  };

  const loadPositions = (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setPositions([]);
      return;
    }
    fetch(`/api/admin/backtest/runs/${runId}/positions`)
      .then((res) => res.json())
      .then((data) => {
        setPositions(data.positions ?? []);
        setExpandedRunId(runId);
      })
      .catch(() => setPositions([]));
  };

  const metrics = (m: Record<string, unknown>) => ({
    winRate: typeof m?.winRate === "number" ? m.winRate : 0,
    roi: typeof m?.roi === "number" ? m.roi : 0,
    netUnits: typeof m?.netUnits === "number" ? m.netUnits : 0,
    maxDrawdown: typeof m?.maxDrawdown === "number" ? m.maxDrawdown : 0,
    totalBets: typeof m?.totalBets === "number" ? m.totalBets : 0,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Backtest</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Run strategy backtests on validated predictions and view historical runs
        </p>
      </div>

      <Card className="border border-[var(--border-color)]">
        <CardHeader>
          <h2 className="text-lg font-semibold">Run Backtest</h2>
        </CardHeader>
        <CardBody className="flex flex-row flex-wrap gap-4 items-end">
          <Input
            label="Days"
            type="number"
            value={daysEdit}
            onValueChange={setDaysEdit}
            min={1}
            max={365}
            className="max-w-[100px]"
          />
          <Select
            label="Sport"
            placeholder="All"
            selectedKeys={sportEdit ? [sportEdit] : ["__all__"]}
            onSelectionChange={(s) => {
              const v = Array.from(s)[0];
              setSportEdit(v === "__all__" || !v ? "" : String(v));
            }}
            className="max-w-[180px]"
          >
            <SelectItem key="__all__">All</SelectItem>
            <SelectItem key="basketball_ncaab">CBB</SelectItem>
            <SelectItem key="basketball_nba">NBA</SelectItem>
            <SelectItem key="icehockey_nhl">NHL</SelectItem>
            <SelectItem key="baseball_mlb">MLB</SelectItem>
          </Select>
          <Input
            label="Bankroll ($)"
            type="number"
            value={bankrollEdit}
            onValueChange={setBankrollEdit}
            className="max-w-[120px]"
          />
          <Select
            label="Strategy"
            selectedKeys={[strategyEdit]}
            onSelectionChange={(s) => setStrategyEdit(Array.from(s)[0] as string ?? "flat_2")}
            className="max-w-[180px]"
          >
            <SelectItem key="flat_2">Flat 2%</SelectItem>
            <SelectItem key="kelly_25">25% Kelly</SelectItem>
            <SelectItem key="kelly_50">50% Kelly</SelectItem>
          </Select>
          <Button
            color="primary"
            onPress={runBacktest}
            isDisabled={running}
            startContent={running ? <Spinner size="sm" /> : <PlayIcon className="h-5 w-5" />}
          >
            {running ? "Running…" : "Run"}
          </Button>
        </CardBody>
      </Card>

      {error && (
        <Card className="border border-red-500">
          <CardBody>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardBody>
        </Card>
      )}

      <Card className="border border-[var(--border-color)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">Backtest Runs</h2>
          <Button size="sm" variant="flat" onPress={loadRuns} isIconOnly>
            <ArrowPathIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : runs.length === 0 ? (
            <p className="text-gray-500">No backtest runs yet. Run one above.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => {
                const m = metrics(run.metrics);
                const isExpanded = expandedRunId === run.id;
                return (
                  <div
                    key={run.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => loadPositions(run.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <div className="flex flex-wrap gap-4">
                        <span className="font-medium">{run.name}</span>
                        <span className="text-sm text-gray-500">
                          {run.dateRangeStart.split("T")[0]} – {run.dateRangeEnd.split("T")[0]}
                        </span>
                        <span className="text-sm text-gray-500">{run.sport ?? "all"}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-sm">
                          {m.totalBets} bets · {m.winRate.toFixed(1)}% win rate
                        </span>
                        <span className={`font-medium ${m.netUnits >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {m.netUnits >= 0 ? "+" : ""}{m.netUnits.toFixed(2)}u
                        </span>
                        <span className="text-sm">
                          ROI: {m.roi >= 0 ? "+" : ""}{m.roi.toFixed(1)}%
                        </span>
                        <ChevronDownIcon
                          className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>
                    </button>
                    {isExpanded && positions.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 p-4 overflow-x-auto">
                        <Table aria-label="Positions">
                          <TableHeader>
                            <TableColumn>#</TableColumn>
                            <TableColumn>Win Prob</TableColumn>
                            <TableColumn>Price</TableColumn>
                            <TableColumn>Stake</TableColumn>
                            <TableColumn>Result</TableColumn>
                            <TableColumn>P/L</TableColumn>
                            <TableColumn>Bankroll After</TableColumn>
                          </TableHeader>
                          <TableBody>
                            {positions.slice(0, 50).map((p) => (
                              <TableRow key={p.positionIndex}>
                                <TableCell>{p.positionIndex + 1}</TableCell>
                                <TableCell>{(p.winProb * 100).toFixed(1)}%</TableCell>
                                <TableCell>{p.price.toFixed(3)}</TableCell>
                                <TableCell>${p.stakeUsd.toFixed(2)}</TableCell>
                                <TableCell>{p.won ? "Win" : "Loss"}</TableCell>
                                <TableCell className={p.pnlUsd >= 0 ? "text-green-600" : "text-red-600"}>
                                  ${p.pnlUsd >= 0 ? "+" : ""}{p.pnlUsd.toFixed(2)}
                                </TableCell>
                                <TableCell>${p.bankrollAfter.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {positions.length > 50 && (
                          <p className="text-sm text-gray-500 mt-2">Showing first 50 of {positions.length} positions</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
