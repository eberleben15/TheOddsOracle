"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, CardHeader } from "@nextui-org/card";
import { Spinner } from "@nextui-org/spinner";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@nextui-org/table";

interface PerformanceData {
  configVersion: number;
  performance: {
    avgPositions: number;
    portfolioWinRate: number;
    avgNetUnits: number;
    vsControl: { improvement: number };
    runCount: number;
  };
  recentRuns: Array<{
    id: string;
    timestamp: string;
    selectedCount: number;
    actualATS: number | null;
    actualNetUnits: number | null;
    maxDrawdown: number | null;
    sport: string;
  }>;
}

export default function DecisionEnginePerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/decision-engine/performance")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setData(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card>
          <CardBody>
            <p className="text-danger">Error: {error || "Failed to load data"}</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const { performance, recentRuns, configVersion } = data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Decision Engine Performance</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Portfolio-level performance for config version {configVersion}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-600">Portfolio Win Rate</h3>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold">
              {performance.portfolioWinRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {performance.runCount} runs
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-600">Avg Net Units</h3>
          </CardHeader>
          <CardBody>
            <p className={`text-3xl font-bold ${performance.avgNetUnits >= 0 ? "text-success" : "text-danger"}`}>
              {performance.avgNetUnits >= 0 ? "+" : ""}
              {performance.avgNetUnits.toFixed(2)}u
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Per run
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-600">Avg Positions</h3>
          </CardHeader>
          <CardBody>
            <p className="text-3xl font-bold">
              {performance.avgPositions.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Per slate
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-600">vs Previous Version</h3>
          </CardHeader>
          <CardBody>
            <p className={`text-3xl font-bold ${performance.vsControl.improvement >= 0 ? "text-success" : "text-danger"}`}>
              {performance.vsControl.improvement >= 0 ? "+" : ""}
              {performance.vsControl.improvement.toFixed(2)}u
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Improvement
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Recent Runs</h3>
        </CardHeader>
        <CardBody>
          {recentRuns.length === 0 ? (
            <p className="text-gray-500">No runs found for this config version.</p>
          ) : (
            <Table aria-label="Recent decision engine runs">
              <TableHeader>
                <TableColumn>TIMESTAMP</TableColumn>
                <TableColumn>SPORT</TableColumn>
                <TableColumn>POSITIONS</TableColumn>
                <TableColumn>ATS WIN RATE</TableColumn>
                <TableColumn>NET UNITS</TableColumn>
                <TableColumn>MAX DRAWDOWN</TableColumn>
              </TableHeader>
              <TableBody>
                {recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{new Date(run.timestamp).toLocaleDateString()}</TableCell>
                    <TableCell>{run.sport}</TableCell>
                    <TableCell>{run.selectedCount}</TableCell>
                    <TableCell>
                      {run.actualATS != null ? `${run.actualATS.toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={run.actualNetUnits != null && run.actualNetUnits >= 0 ? "text-success" : "text-danger"}>
                        {run.actualNetUnits != null 
                          ? `${run.actualNetUnits >= 0 ? "+" : ""}${run.actualNetUnits.toFixed(2)}u`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {run.maxDrawdown != null ? `${run.maxDrawdown.toFixed(2)}u` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
