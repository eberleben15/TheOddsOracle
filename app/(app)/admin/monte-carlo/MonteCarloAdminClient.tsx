"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardBody, CardHeader, Spinner, Chip, Link, Button, Input } from "@nextui-org/react";
import {
  ChartBarIcon,
  CpuChipIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface MonteCarloData {
  varianceModel: { baseVariance?: number; estimatedAt?: number } | null;
  numSimulations: number;
}

export function MonteCarloAdminClient() {
  const [data, setData] = useState<MonteCarloData | null>(null);
  const [numSimEdit, setNumSimEdit] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    fetch("/api/admin/model-performance")
      .then((res) => res.json())
      .then((d) => {
        setData({
          varianceModel: d?.varianceModel ?? null,
          numSimulations: typeof d?.numSimulations === "number" ? d.numSimulations : 10000,
        });
        setNumSimEdit("");
      })
      .catch(() => setData(null));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveNumSimulations = () => {
    const n = parseInt(numSimEdit, 10);
    if (Number.isNaN(n) || n < 1000 || n > 50000) return;
    setSaving(true);
    fetch("/api/admin/model-performance/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numSimulations: n }),
    })
      .then((res) => (res.ok ? load() : Promise.reject()))
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  const vm = data?.varianceModel;
  const numSim = data?.numSimulations ?? 10000;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-dark)]">Monte Carlo Simulation</h1>
        <p className="text-[var(--text-body)] mt-1">
          Score and outcome uncertainty from {numSim.toLocaleString()}-run simulations per prediction
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-[var(--border-color)]">
          <CardHeader className="flex flex-row items-center gap-2">
            <CpuChipIcon className="h-5 w-5 text-gray-500" />
            <span className="font-semibold">Engine Status</span>
          </CardHeader>
          <CardBody className="pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-body)]">Integration</span>
              <Chip color="success" size="sm">Active</Chip>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-body)]">Variance model</span>
              {data === null ? (
                <Spinner size="sm" />
              ) : vm ? (
                <Chip color="success" size="sm">Loaded</Chip>
              ) : (
                <Chip color="default" size="sm">Default</Chip>
              )}
            </div>
            {vm?.baseVariance != null && (
              <div className="text-xs text-[var(--text-body)]">
                baseVariance: {vm.baseVariance.toFixed(4)}
                {vm.estimatedAt && (
                  <> · Est. {new Date(vm.estimatedAt).toLocaleDateString()}</>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 pt-2">
              <Input
                type="number"
                label="Runs per simulation"
                placeholder={String(numSim)}
                value={numSimEdit}
                onValueChange={setNumSimEdit}
                min={1000}
                max={50000}
                size="sm"
                className="max-w-[140px]"
              />
              <Button
                size="sm"
                color="primary"
                onPress={saveNumSimulations}
                isDisabled={
                  saving ||
                  !numSimEdit ||
                  parseInt(numSimEdit, 10) === numSim ||
                  parseInt(numSimEdit, 10) < 1000 ||
                  parseInt(numSimEdit, 10) > 50000
                }
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-[var(--border-color)]">
          <CardHeader className="flex flex-row items-center gap-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-500" />
            <span className="font-semibold">Where it runs</span>
          </CardHeader>
          <CardBody className="pt-0 space-y-2 text-sm text-[var(--text-body)]">
            <div>• <Link href="/matchup" className="text-blue-600 hover:underline">Matchup page</Link> — under predicted score</div>
            <div>• <code className="text-xs bg-gray-100 px-1 rounded">/api/matchup-prediction</code></div>
            <div>• <code className="text-xs bg-gray-100 px-1 rounded">/api/predictions/[gameId]</code></div>
          </CardBody>
        </Card>
      </div>

      <Card className="border border-[var(--border-color)]">
        <CardHeader className="flex flex-row items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-gray-500" />
          <span className="font-semibold">Outputs</span>
        </CardHeader>
        <CardBody className="pt-0">
          <ul className="text-sm text-[var(--text-body)] space-y-2 list-disc list-inside">
            <li>Score range (25th–75th percentile) per team</li>
            <li>80% confidence intervals for spread and total</li>
            <li>Simulation-derived win probability</li>
          </ul>
        </CardBody>
      </Card>

      <Card className="border border-[var(--border-color)]">
        <CardHeader>
          <span className="font-semibold">Configure variance & calibration</span>
        </CardHeader>
        <CardBody className="pt-0">
          <Link
            href="/admin/model-performance"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            Model Performance
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </Link>
          <p className="text-xs text-[var(--text-body)] mt-1">
            Train variance from validated predictions and tune recalibration
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
