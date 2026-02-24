"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Input,
  Select,
  SelectItem,
  Chip,
  Tooltip as NextUITooltip,
} from "@nextui-org/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import {
  ArrowPathIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

function InfoBubble({ content }: { content: string }) {
  return (
    <NextUITooltip content={content} className="max-w-xs text-xs">
      <button
        type="button"
        className="inline-flex p-0 m-0 bg-transparent border-0 cursor-help text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 align-middle"
        aria-label="More info"
      >
        <QuestionMarkCircleIcon className="h-3.5 w-3.5" />
      </button>
    </NextUITooltip>
  );
}

interface CalibrationBin {
  bucket: string;
  predicted: number;
  actual: number;
  count: number;
}

interface Config {
  recalibration: {
    A: number;
    B: number;
    metadata?: {
      trainedAt: string;
      validatedCount: number;
      metrics?: { brierScore?: number; logLoss?: number; winnerAccuracy?: number };
    };
  } | null;
  biasCorrection: {
    homeTeamBias?: number;
    awayTeamBias?: number;
    scoreBias?: number;
  } | null;
}

interface ModelPerformanceData {
  dataset: {
    count: number;
    dateRange: { min: string; max: string };
    sportBreakdown: Record<string, number>;
    hasTraceCount: number;
    withMarketLinesCount: number;
  };
  evaluation: {
    brierScore: number;
    logLoss: number;
    winnerAccuracy: number;
    spreadMAE: number;
    totalMAE: number;
    ats?: { wins: number; losses: number; pushes: number; winRate: number };
    overUnder?: { overWins: number; underWins: number; totalAccuracy: number };
  } | null;
  calibrationChart: CalibrationBin[];
  calibrationMetrics: {
    brierScore: number;
    expectedCalibrationError: number;
  } | null;
  trends: Array<{
    period: string;
    gameCount: number;
    metrics: { accuracy: { winner: number }; meanAbsoluteError: { spread: number } };
  }>;
  bySport: Array<{
    sport: string;
    gameCount: number;
    winnerAccuracy: number;
    spreadMAE: number;
    ats?: { wins: number; losses: number; winRate: number };
  }>;
  config: Config;
}

const SPORT_OPTIONS = [
  { value: "", label: "All Sports" },
  { value: "basketball_ncaab", label: "CBB" },
  { value: "basketball_nba", label: "NBA" },
  { value: "icehockey_nhl", label: "NHL" },
  { value: "baseball_mlb", label: "MLB" },
];

function formatSport(key: string) {
  const m: Record<string, string> = {
    basketball_ncaab: "CBB",
    basketball_nba: "NBA",
    icehockey_nhl: "NHL",
    baseball_mlb: "MLB",
  };
  return m[key] ?? key;
}

export function ModelPerformanceClient() {
  const [data, setData] = useState<ModelPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sport, setSport] = useState("");
  const [training, setTraining] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState<{
    recalA: string;
    recalB: string;
    biasHome: string;
    biasAway: string;
    biasScore: string;
  }>({ recalA: "", recalB: "", biasHome: "", biasAway: "", biasScore: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = sport ? `?sport=${encodeURIComponent(sport)}` : "";
      const res = await fetch(`/api/admin/model-performance${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
      if (json.config) {
        const r = json.config.recalibration;
        const b = json.config.biasCorrection ?? {};
        setConfigForm({
          recalA: r?.A != null ? String(r.A) : "1",
          recalB: r?.B != null ? String(r.B) : "0",
          biasHome: b.homeTeamBias != null ? String(b.homeTeamBias) : "",
          biasAway: b.awayTeamBias != null ? String(b.awayTeamBias) : "",
          biasScore: b.scoreBias != null ? String(b.scoreBias) : "",
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrain = async () => {
    setTraining(true);
    try {
      const res = await fetch("/api/admin/predictions/batch-sync?mode=train", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Train failed");
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Train failed");
    } finally {
      setTraining(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const recalA = parseFloat(configForm.recalA);
      const recalB = parseFloat(configForm.recalB);
      if (isNaN(recalA) || isNaN(recalB)) throw new Error("Invalid A/B");

      const body: Record<string, unknown> = {
        recalibration: { A: recalA, B: recalB },
      };

      const bias: Record<string, number> = {};
      if (configForm.biasHome !== "") {
        const v = parseFloat(configForm.biasHome);
        if (!isNaN(v)) bias.homeTeamBias = v;
      }
      if (configForm.biasAway !== "") {
        const v = parseFloat(configForm.biasAway);
        if (!isNaN(v)) bias.awayTeamBias = v;
      }
      if (configForm.biasScore !== "") {
        const v = parseFloat(configForm.biasScore);
        if (!isNaN(v)) bias.scoreBias = v;
      }
      if (Object.keys(bias).length > 0) body.biasCorrection = bias;

      const res = await fetch("/api/admin/model-performance/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditingConfig(false);
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardBody className="text-center py-12">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button className="mt-4" onPress={fetchData}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  const d = data!;
  const eval_ = d.evaluation;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold flex items-center gap-2">
            Model Performance
            <InfoBubble content="Evaluation metrics, calibration, and config for the prediction model. Based on validated predictions (last 90 days)." />
          </h1>
          <Select
            size="sm"
            className="w-40"
            selectedKeys={sport ? [sport] : [""]}
            onChange={(e) => setSport(e.target.value)}
          >
            {SPORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </Select>
          <Button
            size="sm"
            variant="flat"
            isIconOnly
            onPress={fetchData}
            isDisabled={loading}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <InfoBubble content="Fits Platt scaling (win prob recalibration) and bias corrections from validated predictions. Run after syncing outcomes." />
          <Button
            color="primary"
            onPress={handleTrain}
            isLoading={training}
            startContent={!training && <ArrowPathIcon className="w-4 h-4" />}
          >
            Train Model
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardBody className="py-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              Brier Score <InfoBubble content="Mean squared error of predicted vs actual outcome (0–1). Lower = more accurate probabilities." />
            </div>
            <div className="text-xl font-bold">
              {eval_ ? eval_.brierScore.toFixed(4) : "-"}
            </div>
            <div className="text-xs text-gray-400">Lower is better</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              Log Loss <InfoBubble content="Cross-entropy loss; penalizes overconfident wrong predictions. Lower = better." />
            </div>
            <div className="text-xl font-bold">
              {eval_ ? eval_.logLoss.toFixed(4) : "-"}
            </div>
            <div className="text-xs text-gray-400">Lower is better</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              Winner Accuracy <InfoBubble content="% of games where we correctly predicted the winner. 60%+ is strong." />
            </div>
            <div
              className={`text-xl font-bold ${
                eval_ && eval_.winnerAccuracy >= 60
                  ? "text-green-600"
                  : eval_ && eval_.winnerAccuracy >= 52
                  ? "text-amber-600"
                  : ""
              }`}
            >
              {eval_ ? `${eval_.winnerAccuracy.toFixed(1)}%` : "-"}
            </div>
            <div className="text-xs text-gray-400">{d.dataset.count} games</div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              Spread MAE <InfoBubble content="Mean absolute error of predicted margin (spread). Lower = more accurate score predictions." />
            </div>
            <div className="text-xl font-bold">
              {eval_ ? eval_.spreadMAE.toFixed(2) : "-"}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              ATS Win Rate <InfoBubble content="Against the spread: % of spread picks that covered. 53%+ meets performance gate for recs." />
            </div>
            <div
              className={`text-xl font-bold ${
                eval_?.ats && eval_.ats.winRate >= 53 ? "text-green-600" : ""
              }`}
            >
              {eval_?.ats
                ? `${eval_.ats.winRate.toFixed(1)}%`
                : "-"}
            </div>
            <div className="text-xs text-gray-400">
              {eval_?.ats
                ? `${eval_.ats.wins}-${eval_.ats.losses}-${eval_.ats.pushes}`
                : ""}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-4">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              O/U Accuracy <InfoBubble content="% of over/under picks correct vs market total. Based on predicted total vs closing line." />
            </div>
            <div className="text-xl font-bold">
              {eval_?.overUnder
                ? `${eval_.overUnder.totalAccuracy.toFixed(1)}%`
                : "-"}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Calibration chart */}
      {d.calibrationChart.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Calibration (Predicted vs Actual Win Rate)
              <InfoBubble content="Groups predictions by probability bin. Well-calibrated = predicted % matches actual win rate. Bars should align with diagonal." />
            </h2>
          </CardHeader>
          <CardBody>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.calibrationChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                    contentStyle={{ background: "var(--body-bg)" }}
                  />
                  <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Bar dataKey="predicted" fill="#3b82f6" name="Predicted" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#22c55e" name="Actual" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#1d4ed8"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Perfect calibration = predicted bars match actual. ECE:{" "}
              {d.calibrationMetrics?.expectedCalibrationError.toFixed(4) ?? "-"}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Trends + Sport breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {d.trends.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Winner Accuracy by Week
                <InfoBubble content="Rolling weekly accuracy. Helps spot recent performance drift." />
              </h2>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={d.trends.map((t) => ({
                      ...t,
                      winnerPct: t.metrics?.accuracy?.winner ?? 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} unit="%" />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Accuracy"]}
                      contentStyle={{ background: "var(--body-bg)" }}
                    />
                    <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="winnerPct"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Winner %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        )}

        {d.bySport.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Performance by Sport
                <InfoBubble content="Winner accuracy per sport. Use to identify sports where the model performs better or worse." />
              </h2>
            </CardHeader>
            <CardBody>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.bySport.map((s) => ({ ...s, sportLabel: formatSport(s.sport) }))} layout="vertical" margin={{ left: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="sportLabel" width={60} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Accuracy"]}
                      contentStyle={{ background: "var(--body-bg)" }}
                    />
                    <Bar dataKey="winnerAccuracy" fill="#3b82f6" name="Winner %" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Config panel */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Model Config
            <InfoBubble content="Platt scaling (A, B) recalibrates win probabilities. Bias corrections subtract systematic over/under-predictions from scores." />
          </h2>
          {!editingConfig ? (
            <Button
              size="sm"
              variant="flat"
              startContent={<PencilSquareIcon className="w-4 h-4" />}
              onPress={() => setEditingConfig(true)}
            >
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                color="default"
                startContent={<XMarkIcon className="w-4 h-4" />}
                onPress={() => setEditingConfig(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                color="primary"
                isLoading={savingConfig}
                startContent={<CheckIcon className="w-4 h-4" />}
                onPress={handleSaveConfig}
              >
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                Platt Recalibration <InfoBubble content="p_cal = 1/(1+exp(-(A*logit(p)+B))). Fits A, B to historical outcomes. A=1, B=0 = passthrough." />
              </h3>
              {editingConfig ? (
                <div className="flex gap-4">
                  <Input
                    label="A"
                    type="number"
                    step="0.01"
                    value={configForm.recalA}
                    onValueChange={(v) =>
                      setConfigForm((f) => ({ ...f, recalA: v }))
                    }
                  />
                  <Input
                    label="B"
                    type="number"
                    step="0.01"
                    value={configForm.recalB}
                    onValueChange={(v) =>
                      setConfigForm((f) => ({ ...f, recalB: v }))
                    }
                  />
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-400">
                  A={d.config.recalibration?.A ?? 1}, B=
                  {d.config.recalibration?.B ?? 0}
                  {d.config.recalibration?.metadata && (
                    <div className="text-xs mt-1 text-gray-500">
                      Trained: {new Date(d.config.recalibration.metadata.trainedAt).toLocaleString()}
                      {d.config.recalibration.metadata.metrics && (
                        <> • Brier: {d.config.recalibration.metadata.metrics.brierScore?.toFixed(4)}</>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1">
                Bias Correction (pts) <InfoBubble content="Subtract these from predictions. E.g. homeTeamBias +1.5 = we over-predict home by 1.5 pts; use -1.5 to correct." />
              </h3>
              {editingConfig ? (
                <div className="flex flex-wrap gap-2">
                  <Input
                    label="Home"
                    type="number"
                    step="0.1"
                    className="w-24"
                    placeholder="0"
                    value={configForm.biasHome}
                    onValueChange={(v) =>
                      setConfigForm((f) => ({ ...f, biasHome: v }))
                    }
                  />
                  <Input
                    label="Away"
                    type="number"
                    step="0.1"
                    className="w-24"
                    placeholder="0"
                    value={configForm.biasAway}
                    onValueChange={(v) =>
                      setConfigForm((f) => ({ ...f, biasAway: v }))
                    }
                  />
                  <Input
                    label="Total"
                    type="number"
                    step="0.1"
                    className="w-24"
                    placeholder="0"
                    value={configForm.biasScore}
                    onValueChange={(v) =>
                      setConfigForm((f) => ({ ...f, biasScore: v }))
                    }
                  />
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-400">
                  {d.config.biasCorrection &&
                  (d.config.biasCorrection.homeTeamBias != null ||
                    d.config.biasCorrection.awayTeamBias != null ||
                    d.config.biasCorrection.scoreBias != null) ? (
                    <div className="flex gap-2 flex-wrap">
                      {d.config.biasCorrection.homeTeamBias != null && (
                        <Chip size="sm" variant="flat">
                          Home: {d.config.biasCorrection.homeTeamBias > 0 ? "+" : ""}
                          {d.config.biasCorrection.homeTeamBias.toFixed(1)}
                        </Chip>
                      )}
                      {d.config.biasCorrection.awayTeamBias != null && (
                        <Chip size="sm" variant="flat">
                          Away: {d.config.biasCorrection.awayTeamBias > 0 ? "+" : ""}
                          {d.config.biasCorrection.awayTeamBias.toFixed(1)}
                        </Chip>
                      )}
                      {d.config.biasCorrection.scoreBias != null && (
                        <Chip size="sm" variant="flat">
                          Total: {d.config.biasCorrection.scoreBias > 0 ? "+" : ""}
                          {d.config.biasCorrection.scoreBias.toFixed(1)}
                        </Chip>
                      )}
                    </div>
                  ) : (
                    "None"
                  )}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
