"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Select,
  SelectItem,
  Checkbox,
  Input,
  Spinner,
  Divider,
} from "@nextui-org/react";
import {
  ArrowPathIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

interface SyncStats {
  totalTracked: number;
  pending: number;
  predicted: number;
  completed: number;
  bySport: Record<string, number>;
}

interface BackfillPreview {
  totalGames: number;
  totalNeedsPrediction: number;
  bySport: Record<string, { total: number; needsPrediction: number; games: string[] }>;
}

interface RegeneratePreview {
  total: number;
  willRegenerate: number;
  bySport: Record<string, number>;
  samplePredictions: Array<{
    id: string;
    gameId: string;
    matchup: string;
    sport: string;
    date: string;
    validated: boolean;
  }>;
}

const SPORTS = [
  { key: "basketball_ncaab", label: "College Basketball" },
  { key: "basketball_nba", label: "NBA" },
  { key: "icehockey_nhl", label: "NHL" },
  { key: "baseball_mlb", label: "MLB" },
];

export function PredictionPipelineClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync stats
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Backfill state
  const [backfillPreview, setBackfillPreview] = useState<BackfillPreview | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>([...SPORTS.map(s => s.key)]);

  // Regenerate state
  const [regenPreview, setRegenPreview] = useState<RegeneratePreview | null>(null);
  const [regenFilter, setRegenFilter] = useState<"pending" | "all" | "validated">("pending");
  const [regenLimit, setRegenLimit] = useState("100");

  // Fetch sync stats
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/sync-games");
      const data = await res.json();
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      setError("Failed to fetch stats");
    } finally {
      setStatsLoading(false);
    }
  };

  // Run manual sync
  const runSync = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/sync-games", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Sync complete: ${data.result.newGames} new games, ${data.result.predictionsGenerated} predictions generated`);
        setStats(data.currentStats);
      } else {
        setError(data.error || "Sync failed");
      }
    } catch (err) {
      setError("Failed to run sync");
    } finally {
      setLoading(false);
    }
  };

  // Preview backfill
  const previewBackfill = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedSports.length < SPORTS.length) {
        params.set("sports", selectedSports.join(","));
      }
      const res = await fetch(`/api/admin/predictions/backfill?${params}`);
      const data = await res.json();
      setBackfillPreview(data);
    } catch (err) {
      setError("Failed to preview backfill");
    } finally {
      setLoading(false);
    }
  };

  // Run backfill
  const runBackfill = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/predictions/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sports: selectedSports.length < SPORTS.length ? selectedSports : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Backfill complete: ${data.totalGenerated} predictions generated, ${data.totalSkipped} skipped`);
        setBackfillPreview(null);
        fetchStats();
      } else {
        setError(data.error || "Backfill failed");
      }
    } catch (err) {
      setError("Failed to run backfill");
    } finally {
      setLoading(false);
    }
  };

  // Preview regenerate
  const previewRegenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("filter", regenFilter);
      params.set("limit", regenLimit);
      if (selectedSports.length < SPORTS.length) {
        params.set("sports", selectedSports.join(","));
      }
      const res = await fetch(`/api/admin/predictions/regenerate?${params}`);
      const data = await res.json();
      setRegenPreview(data);
    } catch (err) {
      setError("Failed to preview regenerate");
    } finally {
      setLoading(false);
    }
  };

  // Run regenerate
  const runRegenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/predictions/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: regenFilter,
          limit: parseInt(regenLimit, 10),
          sports: selectedSports.length < SPORTS.length ? selectedSports : undefined,
        }),
      });
      const data = await res.json();
      if (data.success !== false) {
        setSuccess(`Regeneration complete: ${data.regenerated} regenerated, ${data.skipped} skipped, ${data.errors} errors`);
        setRegenPreview(null);
        fetchStats();
      } else {
        setError(data.error || "Regeneration failed");
      }
    } catch (err) {
      setError("Failed to run regeneration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Pipeline Stats */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Prediction Pipeline Stats</h3>
          </div>
          <Button
            size="sm"
            variant="flat"
            startContent={statsLoading ? <Spinner size="sm" /> : <ArrowPathIcon className="w-4 h-4" />}
            onClick={fetchStats}
            isDisabled={statsLoading}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold">{stats.totalTracked}</div>
                <div className="text-sm text-gray-500">Total Tracked</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.predicted}</div>
                <div className="text-sm text-gray-500">Predicted</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                <div className="text-sm text-gray-500">Completed</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              Click Refresh to load stats
            </div>
          )}
        </CardBody>
      </Card>

      {/* Sport Selection */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Sport Selection</h3>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            {SPORTS.map((sport) => (
              <Checkbox
                key={sport.key}
                isSelected={selectedSports.includes(sport.key)}
                onValueChange={(checked) => {
                  if (checked) {
                    setSelectedSports([...selectedSports, sport.key]);
                  } else {
                    setSelectedSports(selectedSports.filter(s => s !== sport.key));
                  }
                }}
              >
                {sport.label}
              </Checkbox>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Manual Sync */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Manual Sync</h3>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-600 mb-4">
            Run the game sync pipeline manually. This will discover new games and generate predictions for any that don&apos;t have one.
          </p>
          <Button
            color="primary"
            startContent={loading ? <Spinner size="sm" /> : <PlayIcon className="w-4 h-4" />}
            onClick={runSync}
            isDisabled={loading}
          >
            Run Sync Now
          </Button>
        </CardBody>
      </Card>

      {/* Backfill Predictions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Backfill Predictions</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-gray-600">
            Fetch all games from the Odds API and generate predictions for any that are missing.
          </p>

          <div className="flex gap-2">
            <Button
              variant="flat"
              onClick={previewBackfill}
              isDisabled={loading || selectedSports.length === 0}
            >
              Preview
            </Button>
            <Button
              color="warning"
              startContent={loading ? <Spinner size="sm" /> : <PlayIcon className="w-4 h-4" />}
              onClick={runBackfill}
              isDisabled={loading || selectedSports.length === 0}
            >
              Run Backfill
            </Button>
          </div>

          {backfillPreview && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="font-medium mb-2">Preview</h4>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <span className="text-gray-500">Total Games:</span>
                <span className="font-medium">{backfillPreview.totalGames}</span>
                <span className="text-gray-500">Need Prediction:</span>
                <span className="font-medium text-yellow-600">{backfillPreview.totalNeedsPrediction}</span>
              </div>
              <Divider className="my-2" />
              <div className="space-y-2">
                {Object.entries(backfillPreview.bySport).map(([sport, data]) => (
                  <div key={sport} className="flex justify-between items-center text-sm">
                    <span>{sport}</span>
                    <Chip size="sm" color={data.needsPrediction > 0 ? "warning" : "success"}>
                      {data.needsPrediction} / {data.total}
                    </Chip>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Regenerate Predictions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Regenerate Predictions</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-gray-600">
            Re-run the prediction algorithm on existing predictions. Useful when the model has been updated.
          </p>

          <div className="flex flex-wrap gap-4">
            <Select
              label="Filter"
              selectedKeys={[regenFilter]}
              onChange={(e) => setRegenFilter(e.target.value as typeof regenFilter)}
              className="max-w-[200px]"
            >
              <SelectItem key="pending">Pending Only</SelectItem>
              <SelectItem key="validated">Validated Only</SelectItem>
              <SelectItem key="all">All</SelectItem>
            </Select>

            <Input
              type="number"
              label="Limit"
              value={regenLimit}
              onChange={(e) => setRegenLimit(e.target.value)}
              className="max-w-[120px]"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="flat"
              onClick={previewRegenerate}
              isDisabled={loading || selectedSports.length === 0}
            >
              Preview
            </Button>
            <Button
              color="danger"
              startContent={loading ? <Spinner size="sm" /> : <ArrowPathIcon className="w-4 h-4" />}
              onClick={runRegenerate}
              isDisabled={loading || selectedSports.length === 0}
            >
              Regenerate
            </Button>
          </div>

          {regenPreview && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="font-medium mb-2">Preview</h4>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <span className="text-gray-500">Total Matching:</span>
                <span className="font-medium">{regenPreview.total}</span>
                <span className="text-gray-500">Will Regenerate:</span>
                <span className="font-medium text-orange-600">{regenPreview.willRegenerate}</span>
              </div>
              <Divider className="my-2" />
              <div className="space-y-1 text-sm">
                <span className="text-gray-500">Sample predictions:</span>
                {regenPreview.samplePredictions.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex justify-between items-center text-xs">
                    <span>{p.matchup}</span>
                    <Chip size="sm" variant="flat">{p.sport}</Chip>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
