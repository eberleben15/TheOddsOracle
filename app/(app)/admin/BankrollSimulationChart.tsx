"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Spinner,
  Select,
  SelectItem,
  Input,
  Chip,
  Divider,
} from "@nextui-org/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";

interface SimulationDataPoint {
  date: string;
  bankroll: number;
  bets: number;
  wins: number;
  losses: number;
  dailyPnL: number;
}

interface SimulationSummary {
  startingBankroll: number;
  endingBankroll: number;
  totalPnL: number;
  roi: number;
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  maxDrawdown: number;
  avgBetSize: number;
}

interface SimulationSettings {
  days: number;
  unitSizePercent: number;
  confidenceThreshold: number;
  sport: string | null;
}

interface SimulationResponse {
  chartData: SimulationDataPoint[];
  summary: SimulationSummary;
  settings: SimulationSettings;
}

const TIMEFRAME_OPTIONS = [
  { value: "30", label: "Last 30 Days" },
  { value: "60", label: "Last 60 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "180", label: "Last 6 Months" },
  { value: "365", label: "Last Year" },
];

const SPORT_OPTIONS = [
  { value: "", label: "All Sports" },
  { value: "basketball_ncaab", label: "College Basketball" },
  { value: "basketball_nba", label: "NBA" },
  { value: "icehockey_nhl", label: "NHL" },
  { value: "baseball_mlb", label: "MLB" },
];

export function BankrollSimulationChart() {
  const [data, setData] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [days, setDays] = useState("90");
  const [startingBankroll, setStartingBankroll] = useState("500");
  const [unitSize, setUnitSize] = useState("2");
  const [confidenceThreshold, setConfidenceThreshold] = useState("60");
  const [sport, setSport] = useState("");

  const fetchSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        days,
        startingBankroll,
        unitSize,
        confidenceThreshold,
      });
      if (sport) params.set("sport", sport);

      const res = await fetch(`/api/admin/bankroll-simulation?${params}`);
      if (!res.ok) throw new Error("Failed to fetch simulation");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [days, startingBankroll, unitSize, confidenceThreshold, sport]);

  useEffect(() => {
    fetchSimulation();
  }, [fetchSimulation]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: SimulationDataPoint }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="font-semibold text-sm">{formatDate(data.date)}</p>
        <p className="text-lg font-bold text-blue-600">{formatCurrency(data.bankroll)}</p>
        {data.bets > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            <p>{data.bets} bets: {data.wins}W / {data.losses}L</p>
            <p className={data.dailyPnL >= 0 ? "text-green-600" : "text-red-600"}>
              P&L: {data.dailyPnL >= 0 ? "+" : ""}{formatCurrency(data.dailyPnL)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Bankroll Simulation</h3>
          <p className="text-sm text-gray-500">
            How your bankroll would perform using our predictions
          </p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <Select
              label="Timeframe"
              size="sm"
              selectedKeys={[days]}
              onChange={(e) => setDays(e.target.value)}
            >
              {TIMEFRAME_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select
              label="Sport"
              size="sm"
              selectedKeys={[sport]}
              onChange={(e) => setSport(e.target.value)}
            >
              {SPORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="w-32">
            <Input
              label="Starting $"
              size="sm"
              type="number"
              value={startingBankroll}
              onValueChange={setStartingBankroll}
              startContent={<span className="text-gray-400 text-sm">$</span>}
            />
          </div>
          <div className="w-28">
            <Input
              label="Unit Size"
              size="sm"
              type="number"
              value={unitSize}
              onValueChange={setUnitSize}
              endContent={<span className="text-gray-400 text-sm">%</span>}
            />
          </div>
          <div className="w-32">
            <Input
              label="Min Conf."
              size="sm"
              type="number"
              value={confidenceThreshold}
              onValueChange={setConfidenceThreshold}
              endContent={<span className="text-gray-400 text-sm">%</span>}
            />
          </div>
        </div>

        {/* Summary Stats */}
        {data?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Ending Bankroll</div>
              <div className={`text-lg font-bold ${data.summary.endingBankroll >= data.summary.startingBankroll ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(data.summary.endingBankroll)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Total P&L</div>
              <div className={`text-lg font-bold ${data.summary.totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                {data.summary.totalPnL >= 0 ? "+" : ""}{formatCurrency(data.summary.totalPnL)}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">ROI</div>
              <div className={`text-lg font-bold ${data.summary.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                {data.summary.roi >= 0 ? "+" : ""}{data.summary.roi.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Win Rate</div>
              <div className={`text-lg font-bold ${data.summary.winRate >= 52.4 ? "text-green-600" : data.summary.winRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {data.summary.winRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Record</div>
              <div className="text-lg font-bold">
                <span className="text-green-600">{data.summary.wins}</span>
                <span className="text-gray-400">-</span>
                <span className="text-red-600">{data.summary.losses}</span>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">Max Drawdown</div>
              <div className="text-lg font-bold text-orange-600">
                -{data.summary.maxDrawdown.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-80">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              {error}
            </div>
          ) : data?.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="bankrollGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${v}`}
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={['dataMin - 50', 'dataMax + 50']}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={parseFloat(startingBankroll)}
                  stroke="#9CA3AF"
                  strokeDasharray="5 5"
                  label={{
                    value: `Start: $${startingBankroll}`,
                    position: "right",
                    fill: "#9CA3AF",
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bankroll"
                  stroke="none"
                  fill="url(#bankrollGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="bankroll"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: "#3B82F6" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No betting data available for this period
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <Chip size="sm" variant="flat">Simulation</Chip>
          <span>
            Based on {data?.summary.totalBets ?? 0} bets using {unitSize}% unit sizing.
            Assumes -110 odds. Past performance does not guarantee future results.
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
