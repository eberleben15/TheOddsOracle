"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Select,
  SelectItem,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Divider,
} from "@nextui-org/react";
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

interface SegmentationResult {
  segment: string;
  value: string;
  sampleCount: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
}

interface FeatureImportance {
  feature: string;
  importance: number;
  direction: "positive" | "negative" | "neutral";
  sampleCount: number;
}

interface Recommendation {
  type: "disable" | "downweight" | "recalibrate" | "investigate";
  target: string;
  reason: string;
  severity: "high" | "medium" | "low";
  suggestedAction?: string;
}

interface BiasAnalysis {
  segment: string;
  value: string;
  sampleCount: number;
  wins: number;
  losses: number;
  winRate: number;
  weightedContribution: number;
  netUnits: number;
}

interface ATSFeedbackReport {
  overall: {
    sampleCount: number;
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    netUnits: number;
  };
  featureImportance: FeatureImportance[];
  segmentations: {
    bySport: SegmentationResult[];
    byModelPath: SegmentationResult[];
    byConfidenceBand: SegmentationResult[];
    byHomeFavorite: SegmentationResult[];
    bySpreadMagnitude: SegmentationResult[];
    byTotalBucket: SegmentationResult[];
  };
  biasAnalysis: BiasAnalysis[];
  recommendations: Recommendation[];
}

interface PipelineConfig {
  version: number;
  updatedAt: string;
  sports: Record<string, { enabled: boolean; confidenceMultiplier: number }>;
  spreadMagnitude: Record<string, { enabled: boolean; confidenceMultiplier: number }>;
  totalBucket: Record<string, { enabled: boolean; confidenceMultiplier: number }>;
  confidenceBands: Record<string, { enabled: boolean; confidenceMultiplier: number }>;
}

interface ATSFeedbackData {
  report: ATSFeedbackReport | null;
  message?: string;
  datasetStats?: {
    total: number;
    withMarketSpread: number;
    withAnalytics: number;
  };
  currentConfig: PipelineConfig | null;
  suggestedConfig?: PipelineConfig;
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

function formatSegmentValue(value: string): string {
  const mappings: Record<string, string> = {
    "basketball_ncaab": "College Basketball",
    "basketball_nba": "NBA",
    "icehockey_nhl": "NHL",
    "baseball_mlb": "MLB",
    "home_favorite": "Home Favorite",
    "away_favorite": "Away Underdog",
    "small(<3)": "Small Spread (< 3 pts)",
    "medium(3-7)": "Medium Spread (3-7 pts)",
    "large(7-12)": "Large Spread (7-12 pts)",
    "very_large(>=12)": "Very Large Spread (12+ pts)",
    "low(<130)": "Low Total (< 130)",
    "medium(130-145)": "Medium Total (130-145)",
    "high(145-160)": "High Total (145-160)",
    "very_high(>=160)": "Very High Total (160+)",
    "low(<50)": "Low Confidence (< 50%)",
    "medium(50-70)": "Medium Confidence (50-70%)",
    "high(>=70)": "High Confidence (70%+)",
    "fourFactors": "Four Factors Model",
    "fallback": "Fallback Model",
  };
  return mappings[value] || value.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function WinRateChip({ winRate, n }: { winRate: number; n: number }) {
  const color = n < 10 ? "default" : winRate >= 52.4 ? "success" : winRate < 40 ? "danger" : "warning";
  return (
    <Chip size="sm" color={color} variant="flat">
      {winRate.toFixed(1)}%
    </Chip>
  );
}

function NetUnitsChip({ units }: { units: number }) {
  const positive = units >= 0;
  return (
    <Chip size="sm" color={positive ? "success" : "danger"} variant="flat">
      {positive ? "+" : ""}{units.toFixed(2)}u
    </Chip>
  );
}

function SeverityIcon({ severity }: { severity: "high" | "medium" | "low" }) {
  if (severity === "high") return <XCircleIcon className="h-5 w-5 text-red-500" />;
  if (severity === "medium") return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
  return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
}

export function ATSFeedbackClient() {
  const [data, setData] = useState<ATSFeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sport, setSport] = useState("");
  const [applying, setApplying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [configChanges, setConfigChanges] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/ats-feedback?sport=${sport}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateConfig = async () => {
    try {
      const res = await fetch("/api/admin/ats-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", sport }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setConfigChanges(json.changes || []);
      if (data) {
        setData({ ...data, suggestedConfig: json.config });
      }
      onOpen();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleApplyConfig = async () => {
    if (!data?.suggestedConfig) return;
    setApplying(true);
    try {
      const res = await fetch("/api/admin/ats-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", config: data.suggestedConfig }),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  const handleResetConfig = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/admin/ats-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResetting(false);
    }
  };

  const report = data?.report;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">ATS Feedback Analysis</h1>
          <p className="text-sm text-default-500">
            Analyze features pushing/pulling ATS performance and configure adjustments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            size="sm"
            selectedKeys={[sport]}
            onChange={(e) => setSport(e.target.value)}
            className="w-32"
            aria-label="Sport filter"
          >
            {SPORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} textValue={o.label}>
                {o.label}
              </SelectItem>
            ))}
          </Select>
          <Button
            size="sm"
            variant="flat"
            startContent={<ArrowPathIcon className="h-4 w-4" />}
            onPress={() => fetchData()}
            isLoading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="bg-danger-50 border-danger-200">
          <CardBody className="text-danger">{error}</CardBody>
        </Card>
      )}

      {loading && !data && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {data && !report && (
        <Card>
          <CardBody className="text-center py-12 text-default-500">
            {data.message || "No data available"}
          </CardBody>
        </Card>
      )}

      {report && (
        <>
          {/* Overall Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardBody className="text-center">
                <div className="text-3xl font-bold">
                  {report.overall.wins}-{report.overall.losses}-{report.overall.pushes}
                </div>
                <div className="text-sm text-default-500">ATS Record</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="text-3xl font-bold">
                  <WinRateChip winRate={report.overall.winRate} n={report.overall.sampleCount} />
                </div>
                <div className="text-sm text-default-500 mt-1">Win Rate</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="text-3xl font-bold">
                  <NetUnitsChip units={report.overall.netUnits} />
                </div>
                <div className="text-sm text-default-500 mt-1">Net Units</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center">
                <div className="text-3xl font-bold">{report.overall.sampleCount}</div>
                <div className="text-sm text-default-500">Samples</div>
              </CardBody>
            </Card>
          </div>

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <Card>
              <CardHeader className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
                <span className="font-semibold">Recommendations</span>
              </CardHeader>
              <CardBody className="space-y-3">
                {report.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-default-100 rounded-lg">
                    <SeverityIcon severity={rec.severity} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Chip size="sm" variant="flat" color="primary">{rec.type.toUpperCase()}</Chip>
                        <span className="font-medium">{rec.target}</span>
                      </div>
                      <p className="text-sm text-default-600 mt-1">{rec.reason}</p>
                      {rec.suggestedAction && (
                        <p className="text-sm text-primary mt-1">{rec.suggestedAction}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Pipeline Config Actions */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cog6ToothIcon className="h-5 w-5" />
                <span className="font-semibold">Pipeline Configuration</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={handleResetConfig}
                  isLoading={resetting}
                >
                  Reset to Default
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  startContent={<BoltIcon className="h-4 w-4" />}
                  onPress={handleGenerateConfig}
                >
                  Generate Config from Analysis
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {data.currentConfig ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium mb-2">Sports</div>
                    {Object.entries(data.currentConfig.sports).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span>{formatSport(k)}</span>
                        <span className={v.enabled ? "" : "text-danger"}>
                          {v.enabled ? `${v.confidenceMultiplier.toFixed(2)}x` : "OFF"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="font-medium mb-2">Spread Magnitude</div>
                    {Object.entries(data.currentConfig.spreadMagnitude).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="truncate">{k}</span>
                        <span className={v.enabled ? "" : "text-danger"}>
                          {v.enabled ? `${v.confidenceMultiplier.toFixed(2)}x` : "OFF"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="font-medium mb-2">Total Bucket</div>
                    {Object.entries(data.currentConfig.totalBucket).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="truncate">{k}</span>
                        <span className={v.enabled ? "" : "text-danger"}>
                          {v.enabled ? `${v.confidenceMultiplier.toFixed(2)}x` : "OFF"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="font-medium mb-2">Confidence Bands</div>
                    {Object.entries(data.currentConfig.confidenceBands).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span>{k}</span>
                        <span className={v.enabled ? "" : "text-danger"}>
                          {v.enabled ? `${v.confidenceMultiplier.toFixed(2)}x` : "OFF"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-default-500">No config applied yet. Using defaults.</p>
              )}
              {data.currentConfig && (
                <p className="text-xs text-default-400 mt-4">
                  Version {data.currentConfig.version} • Updated {new Date(data.currentConfig.updatedAt).toLocaleString()}
                </p>
              )}
            </CardBody>
          </Card>

          {/* Segmentations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SegmentCard title="By Sport" segments={report.segmentations.bySport} />
            <SegmentCard title="By Home/Away Favorite" segments={report.segmentations.byHomeFavorite} />
            <SegmentCard title="By Spread Magnitude" segments={report.segmentations.bySpreadMagnitude} />
            <SegmentCard title="By Total Bucket" segments={report.segmentations.byTotalBucket} />
            <SegmentCard title="By Confidence Band" segments={report.segmentations.byConfidenceBand} />
            <SegmentCard title="By Model Path" segments={report.segmentations.byModelPath} />
          </div>

          {/* Feature Importance */}
          <Card>
            <CardHeader className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              <span className="font-semibold">Feature Importance (by correlation with ATS)</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {report.featureImportance.slice(0, 15).map((f) => (
                  <div key={f.feature} className="flex items-center justify-between p-2 bg-default-50 rounded">
                    <span className="text-sm truncate">{f.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${f.direction === "positive" ? "text-success" : f.direction === "negative" ? "text-danger" : "text-default-400"}`}>
                        {f.direction === "positive" ? "↑" : f.direction === "negative" ? "↓" : "·"}
                      </span>
                      <span className="text-sm font-mono">{f.importance.toFixed(3)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Worst Segments */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-danger-100 rounded-lg">
                  <XCircleIcon className="h-5 w-5 text-danger" />
                </div>
                <div>
                  <span className="font-semibold">Worst Performing Segments</span>
                  <p className="text-xs text-default-400">Segments losing money (min 10 bets)</p>
                </div>
              </div>
              <Chip size="sm" variant="flat" color="danger">
                {report.biasAnalysis.filter((b) => b.wins + b.losses >= 10 && b.winRate < 52.4).length} underperforming
              </Chip>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-3">
                {report.biasAnalysis
                  .filter((b) => b.wins + b.losses >= 10)
                  .sort((a, b) => a.winRate - b.winRate)
                  .slice(0, 8)
                  .map((b, i) => {
                    const targetWinRate = 52.4;
                    const gapToTarget = targetWinRate - b.winRate;
                    const severity = b.winRate < 35 ? "critical" : b.winRate < 45 ? "warning" : "caution";
                    const barColor = severity === "critical" ? "bg-red-500" : severity === "warning" ? "bg-orange-400" : "bg-yellow-400";
                    const bgColor = severity === "critical" ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900" : 
                                    severity === "warning" ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900" : 
                                    "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900";
                    
                    return (
                      <div 
                        key={i} 
                        className={`p-4 rounded-xl border ${bgColor} transition-all hover:shadow-md`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium uppercase tracking-wide text-default-400">
                                {b.segment}
                              </span>
                              {severity === "critical" && (
                                <Chip size="sm" color="danger" variant="flat" className="h-5">Critical</Chip>
                              )}
                            </div>
                            <span className="font-semibold text-default-800">{formatSegmentValue(b.value)}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-default-800">{b.winRate.toFixed(1)}%</div>
                            <div className="text-xs text-default-400">
                              {gapToTarget > 0 ? `-${gapToTarget.toFixed(1)}%` : `+${Math.abs(gapToTarget).toFixed(1)}%`} vs target
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${barColor} rounded-full transition-all`}
                              style={{ width: `${Math.min(100, (b.winRate / targetWinRate) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-default-400">
                            <span>0%</span>
                            <span className="font-medium">Target: {targetWinRate}%</span>
                            <span>100%</span>
                          </div>
                        </div>
                        
                        {/* Stats row */}
                        <div className="flex items-center justify-between pt-2 border-t border-default-200">
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-default-400">Record: </span>
                              <span className="font-medium">{b.wins}-{b.losses}</span>
                            </div>
                            <div>
                              <span className="text-default-400">Bets: </span>
                              <span className="font-medium">{b.sampleCount}</span>
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${b.netUnits >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {b.netUnits >= 0 ? "+" : ""}{b.netUnits.toFixed(2)}u
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardBody>
          </Card>
        </>
      )}

      {/* Apply Config Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader>Apply Generated Config</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600 mb-4">
              The following changes will be applied based on the ATS analysis:
            </p>
            {configChanges.length > 0 ? (
              <div className="space-y-2">
                {configChanges.map((change, i) => (
                  <div key={i} className="p-2 bg-default-100 rounded text-sm font-mono">
                    {change}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-default-500">No changes suggested (current config is optimal)</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>Cancel</Button>
            <Button color="primary" onPress={handleApplyConfig} isLoading={applying}>
              Apply Config
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

function SegmentCard({ title, segments }: { title: string; segments: SegmentationResult[] }) {
  return (
    <Card>
      <CardHeader>
        <span className="font-semibold text-sm">{title}</span>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="space-y-1">
          {segments.map((s) => {
            const netUnits = s.wins * 0.91 - s.losses;
            return (
              <div key={s.value} className="flex items-center justify-between text-sm">
                <span className="truncate">{s.value}</span>
                <div className="flex items-center gap-2">
                  <span className="text-default-500">{s.wins}-{s.losses}</span>
                  <WinRateChip winRate={s.winRate} n={s.sampleCount} />
                  <span className={`text-xs ${netUnits >= 0 ? "text-success" : "text-danger"}`}>
                    {netUnits >= 0 ? "+" : ""}{netUnits.toFixed(1)}u
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
