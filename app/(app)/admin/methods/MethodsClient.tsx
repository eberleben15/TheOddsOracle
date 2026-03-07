"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
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
  ComposedChart,
  ReferenceLine,
} from "recharts";
import {
  ArrowPathIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { MetricExplanationPanel, MetricInfoButton } from "@/components/MetricExplanationPanel";
import {
  FACTOR_CONTRIBUTIONS_SECTIONS,
  CALIBRATION_RELIABILITY_SECTIONS,
  ECE_SECTIONS,
} from "@/lib/model-insights-content";

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

interface MethodMetadata {
  id: string;
  version: string;
  name: string;
  description: string;
  formula?: string;
  references?: string[];
  parameters?: Record<string, number | string>;
}

interface MethodsData {
  methods: {
    calibration: MethodMetadata[];
    winProb: MethodMetadata;
    spreadCover: MethodMetadata;
    totalOverUnder: MethodMetadata;
  };
  calibration: {
    activeMethod: "platt" | "isotonic";
    platt: { A: number; B: number } | null;
    isotonic: { binCount: number } | null;
    metadata: {
      trainedAt?: string;
      validatedCount?: number;
      brierScore?: number;
      logLoss?: number;
    } | null;
  };
  calibrationChart: Array<{ bucket: string; predicted: number; actual: number; count: number }>;
  calibrationMetrics: { brierScore: number; expectedCalibrationError: number } | null;
  factorContributions?: Array<{ factor: string; value: number }>;
  methodComparison?: {
    platt: { brierScore: number; logLoss: number };
    isotonic: { brierScore: number; logLoss: number };
  };
  traceSampleCount: number;
}

export function MethodsClient() {
  const [data, setData] = useState<MethodsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/methods");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSwitchCalibration = async (method: "platt" | "isotonic") => {
    if (!data || data.calibration.activeMethod === method) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      const res = await fetch("/api/admin/methods/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeMethod: method }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to switch");
      }
      await fetchData();
    } catch (e) {
      setSwitchError(e instanceof Error ? e.message : "Switch failed");
    } finally {
      setSwitching(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          Prediction Methods
          <InfoBubble content="Documentation and configuration of prediction pipeline methods. Auditable for funding and validation." />
        </h1>
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

      {/* Overview */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Pipeline Overview
            <InfoBubble content="Data flows through win probability model, calibration, then spread/total and recommendations." />
          </h2>
        </CardHeader>
        <CardBody>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p>
              <strong>Data</strong> → <strong>Win Prob</strong> (Four Factors / Efficiency) →{" "}
              <strong>Calibration</strong> (Platt or Isotonic) → <strong>Spread / Total</strong> → Recommendations
            </p>
            <div className="flex gap-2 mt-2">
              <span className="text-gray-500">See docs/PREDICTION_METHODOLOGY.md</span>
              <span className="text-gray-400">|</span>
              <Link
                href="/admin/predictions"
                className="text-blue-600 hover:underline"
              >
                View Predictions
              </Link>
              <span className="text-gray-400">|</span>
              <Link
                href="/admin/model-performance"
                className="text-blue-600 hover:underline"
              >
                Model Performance
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Win Probability */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Win Probability
            <InfoBubble content={d.methods.winProb.description} />
          </h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-3 rounded">
            {d.methods.winProb.formula}
          </p>
          {d.methods.winProb.parameters && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Coefficients</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(d.methods.winProb.parameters).map(([k, v]) => (
                  <Chip key={k} size="sm" variant="flat">{`${k}: ${v}`}</Chip>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Calibration */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Calibration
            <InfoBubble content="Recalibrate raw win probabilities to match historical outcomes. Platt = parametric, Isotonic = nonparametric." />
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {switchError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300">
              {switchError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {d.methods.calibration.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-lg border-2 ${
                  d.calibration.activeMethod === m.id
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{m.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                    <p className="text-xs font-mono mt-2 text-gray-600 dark:text-gray-400">{m.formula}</p>
                  </div>
                  {(m.id === "isotonic" && !d.calibration.isotonic) ? (
                    <NextUITooltip content="Run Train Model (Model Performance) or batch sync first. Need 20+ validated predictions.">
                      <span>
                        <Button
                          size="sm"
                          color="default"
                          variant="flat"
                          isDisabled
                        >
                          Use
                        </Button>
                      </span>
                    </NextUITooltip>
                  ) : (
                    <Button
                      size="sm"
                      color={d.calibration.activeMethod === m.id ? "primary" : "default"}
                      variant={d.calibration.activeMethod === m.id ? "solid" : "flat"}
                      onPress={() => handleSwitchCalibration(m.id as "platt" | "isotonic")}
                      isDisabled={switching}
                    >
                      {d.calibration.activeMethod === m.id ? "Active" : "Use"}
                    </Button>
                  )}
                </div>
                {m.id === "platt" && d.calibration.platt && (
                  <p className="text-xs mt-2">
                    A={d.calibration.platt.A.toFixed(2)}, B={d.calibration.platt.B.toFixed(2)}
                  </p>
                )}
                {m.id === "isotonic" && d.calibration.isotonic && (
                  <p className="text-xs mt-2">{d.calibration.isotonic.binCount} bins</p>
                )}
              </div>
            ))}
          </div>
          {d.calibration.metadata && (
            <p className="text-xs text-gray-500">
              Trained: {d.calibration.metadata.trainedAt
                ? new Date(d.calibration.metadata.trainedAt).toLocaleString()
                : "-"}{" "}
              | n={d.calibration.metadata.validatedCount ?? "-"} | Brier:{" "}
              {d.calibration.metadata.brierScore?.toFixed(4) ?? "-"}
            </p>
          )}
          {d.methodComparison && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs font-medium text-gray-500 mb-2">Platt vs Isotonic (same validation set)</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Platt</p>
                  <p>Brier: {d.methodComparison.platt.brierScore.toFixed(4)}</p>
                  <p>Log Loss: {d.methodComparison.platt.logLoss.toFixed(4)}</p>
                </div>
                <div>
                  <p className="font-medium">Isotonic</p>
                  <p>Brier: {d.methodComparison.isotonic.brierScore.toFixed(4)}</p>
                  <p>Log Loss: {d.methodComparison.isotonic.logLoss.toFixed(4)}</p>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Factor Contribution Chart */}
      {d.factorContributions && d.factorContributions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Factor Contributions (avg magnitude)
              <MetricExplanationPanel
                tooltip="Open learning guide"
                badge="Learn"
                sections={FACTOR_CONTRIBUTIONS_SECTIONS}
              />
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              Which model inputs drive predictions most. Higher bars = larger typical impact. Based on {d.traceSampleCount} predictions with trace.
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.factorContributions} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="factor" width={80} />
                  <Tooltip
                    formatter={(value: number | undefined) => [value?.toFixed(3) ?? "", "Avg |value|"]}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Calibration Chart */}
      {d.calibrationChart.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Calibration Reliability
              <MetricExplanationPanel
                tooltip="Open learning guide"
                badge="Learn"
                sections={CALIBRATION_RELIABILITY_SECTIONS}
              />
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
              Do our predicted win % match reality? Blue = predicted, green = actual. Bars should align for well-calibrated probabilities.
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.calibrationChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip
                    formatter={(value: number | undefined) => [`${value != null ? value.toFixed(1) : ""}%`, ""]}
                    contentStyle={{ background: "var(--body-bg)" }}
                  />
                  <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Bar dataKey="predicted" fill="#3b82f6" name="Predicted" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#22c55e" name="Actual" radius={[4, 4, 0, 0]} />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <p className="text-sm text-gray-500">
                <strong>ECE:</strong> {d.calibrationMetrics?.expectedCalibrationError.toFixed(4) ?? "-"}
                <span className="ml-1 text-xs">(lower is better; &lt;0.03 = good)</span>
              </p>
              <MetricInfoButton
                tooltip="What is ECE?"
                sections={ECE_SECTIONS}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* Spread & Total */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Spread Cover & Total
            <InfoBubble content="Current heuristics. Future: fitted GLM." />
          </h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <h3 className="text-sm font-medium">{d.methods.spreadCover.name}</h3>
            <p className="text-xs text-gray-500">{d.methods.spreadCover.description}</p>
            <p className="text-xs font-mono mt-1">{d.methods.spreadCover.formula}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium">{d.methods.totalOverUnder.name}</h3>
            <p className="text-xs text-gray-500">{d.methods.totalOverUnder.description}</p>
            <p className="text-xs font-mono mt-1">{d.methods.totalOverUnder.formula}</p>
          </div>
          <p className="text-xs italic text-gray-500">
            Future: replace with fitted GLM for improved accuracy.
          </p>
        </CardBody>
      </Card>

      {/* Method Versions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Method Registry
            <InfoBubble content="All methods with version. Trace stores method used per prediction." />
          </h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Method</th>
                  <th className="text-left py-2">Version</th>
                  <th className="text-left py-2">ID</th>
                </tr>
              </thead>
              <tbody>
                {d.methods.calibration.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2">{m.name}</td>
                    <td className="py-2">{m.version}</td>
                    <td className="py-2 font-mono text-xs">{m.id}</td>
                  </tr>
                ))}
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2">{d.methods.winProb.name}</td>
                  <td className="py-2">{d.methods.winProb.version}</td>
                  <td className="py-2 font-mono text-xs">{d.methods.winProb.id}</td>
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2">{d.methods.spreadCover.name}</td>
                  <td className="py-2">{d.methods.spreadCover.version}</td>
                  <td className="py-2 font-mono text-xs">{d.methods.spreadCover.id}</td>
                </tr>
                <tr>
                  <td className="py-2">{d.methods.totalOverUnder.name}</td>
                  <td className="py-2">{d.methods.totalOverUnder.version}</td>
                  <td className="py-2 font-mono text-xs">{d.methods.totalOverUnder.id}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {d.traceSampleCount} predictions with trace available.{" "}
            <Link href="/admin/predictions" className="text-blue-600 hover:underline">
              View sample trace
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
