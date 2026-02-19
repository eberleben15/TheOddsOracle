"use client";

import { useState } from "react";
import { Button } from "@nextui-org/react";

interface BatchSyncResult {
  success: boolean;
  unvalidatedChecked: number;
  datesFetched: number;
  outcomesRecorded: number;
  trainingRan: boolean;
  recalibrationParams?: { A: number; B: number };
  validatedCount: number;
  duration: number;
  errors?: string[];
  diagnostics?: {
    oddsApiCompletedCount: number;
    oddsApiMatched: number;
    espnCompletedCount: number;
    espnMatched: number;
    oddsApiErrors?: string[];
    samplePredictions?: Array<{ gameId: string; homeTeam: string; awayTeam: string; date: string }>;
  };
}

interface ModelConfigResponse {
  recalibrationParams: { A: number; B: number } | null;
  message: string;
}

export function AdminPredictionsClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchSyncResult | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfigResponse | null>(null);

  async function runBatchSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/predictions/batch-sync", { method: "POST" });
      const data: BatchSyncResult = await res.json();
      setResult(data);
      if (data.success) {
        const configRes = await fetch("/api/admin/predictions/batch-sync");
        const config: ModelConfigResponse = await configRes.json();
        setModelConfig(config);
      }
    } catch (err) {
      setResult({
        success: false,
        unvalidatedChecked: 0,
        datesFetched: 0,
        outcomesRecorded: 0,
        trainingRan: false,
        validatedCount: 0,
        duration: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadModelConfig() {
    try {
      const res = await fetch("/api/admin/predictions/batch-sync");
      const data: ModelConfigResponse = await res.json();
      setModelConfig(data);
    } catch {
      setModelConfig({ recalibrationParams: null, message: "Failed to load" });
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
      <h2 className="text-2xl font-bold mb-4">Prediction Feedback &amp; Training</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Batch job: checks all scored games for pending predictions, records outcomes, and trains the
        model (Platt scaling) from validated data. Run this to sync outcomes and update calibration.
      </p>
      <div className="flex flex-wrap gap-4 items-center">
        <Button
          color="primary"
          onPress={runBatchSync}
          isLoading={loading}
          isDisabled={loading}
        >
          {loading ? "Running..." : "Run batch sync + train"}
        </Button>
        <Button variant="flat" onPress={loadModelConfig} isDisabled={loading}>
          Check model config
        </Button>
      </div>
      {modelConfig && (
        <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm">
          {modelConfig.message}
        </div>
      )}
      {result && (
        <div className="mt-4 p-4 border rounded space-y-2">
          <h3 className="font-semibold">
            {result.success ? "✓ Batch complete" : "Batch finished with issues"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <span>Unvalidated checked:</span>
            <span>{result.unvalidatedChecked}</span>
            <span>Dates fetched:</span>
            <span>{result.datesFetched}</span>
            <span>Outcomes recorded:</span>
            <span className="font-semibold">{result.outcomesRecorded}</span>
            <span>Training ran:</span>
            <span>{result.trainingRan ? "Yes" : "No"}</span>
            <span>Validated total:</span>
            <span>{result.validatedCount}</span>
            <span>Duration:</span>
            <span>{result.duration}ms</span>
          </div>
          {result.recalibrationParams && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Recalibration: A={result.recalibrationParams.A.toFixed(3)}, B=
              {result.recalibrationParams.B.toFixed(3)}
            </p>
          )}
          {result.diagnostics && (
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mt-2">
              <div>Odds API: {result.diagnostics.oddsApiMatched} matched of {result.diagnostics.oddsApiCompletedCount} completed games</div>
              {result.diagnostics.oddsApiErrors && result.diagnostics.oddsApiErrors.length > 0 && (
                <div className="text-amber-600 dark:text-amber-400">
                  Odds API: {result.diagnostics.oddsApiErrors.join("; ")}
                </div>
              )}
              <div>ESPN fallback: {result.diagnostics.espnMatched} matched of {result.diagnostics.espnCompletedCount} completed games</div>
              {result.diagnostics.samplePredictions && result.diagnostics.samplePredictions.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Sample unvalidated predictions</summary>
                  <ul className="list-disc list-inside mt-1 text-xs">
                    {result.diagnostics.samplePredictions.map((p, i) => (
                      <li key={i}>{p.awayTeam} @ {p.homeTeam} ({p.date.slice(0, 10)}) — gameId: {p.gameId.slice(0, 8)}…</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {result.errors && result.errors.length > 0 && (
            <div className="text-sm text-amber-600 dark:text-amber-400">
              {result.errors.slice(0, 5).map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
