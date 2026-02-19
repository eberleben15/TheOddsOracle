/**
 * Admin Predictions Dashboard
 * 
 * Shows prediction performance metrics, validation results, and analytics
 * Admin-only access
 */

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-utils";
import { generatePerformanceReport } from "@/lib/validation-dashboard";
import { getTrackingStats } from "@/lib/prediction-tracker";
import { AdminPredictionsClient } from "./AdminPredictionsClient";

export default async function AdminPredictionsPage() {
  // Check admin access
  const admin = await isAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  // Get performance report
  const report = await generatePerformanceReport(90);
  const stats = await getTrackingStats();

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Admin: Prediction Performance Dashboard</h1>
      
      <AdminPredictionsClient />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Total Predictions</h3>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Validated</h3>
          <p className="text-3xl font-bold text-green-600">{stats.validated}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Pending</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.unvalidated}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-2xl font-bold mb-4">Overall Performance (Last 90 Days)</h2>
        
        {report.overall.gameCount > 0 ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Winner Accuracy</h3>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 mr-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full"
                    style={{ width: `${report.overall.accuracy.winner}%` }}
                  />
                </div>
                <span className="text-xl font-bold">{report.overall.accuracy.winner.toFixed(1)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Score MAE</h4>
                <p className="text-2xl font-bold">{report.overall.meanAbsoluteError.total.toFixed(2)}</p>
                <p className="text-xs text-gray-500">points</p>
              </div>
              <div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Spread MAE</h4>
                <p className="text-2xl font-bold">{report.overall.meanAbsoluteError.spread.toFixed(2)}</p>
                <p className="text-xs text-gray-500">points</p>
              </div>
              <div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Spread ±3</h4>
                <p className="text-2xl font-bold">{report.overall.accuracy.spreadWithin3.toFixed(1)}%</p>
              </div>
              <div>
                <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Spread ±5</h4>
                <p className="text-2xl font-bold">{report.overall.accuracy.spreadWithin5.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No validated predictions yet. Predictions will appear here after games complete.</p>
        )}
      </div>

      {report.recent.gameCount > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
          <h2 className="text-2xl font-bold mb-4">Recent Performance (Last 7 Days)</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Games:</span>
              <span className="font-semibold">{report.recent.gameCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Winner Accuracy:</span>
              <span className="font-semibold">{report.recent.metrics.accuracy.winner.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Score MAE:</span>
              <span className="font-semibold">{report.recent.metrics.meanAbsoluteError.total.toFixed(2)} pts</span>
            </div>
          </div>
        </div>
      )}

      {report.biases && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Detected Biases</h2>
          {report.biases.homeTeamBias && (
            <div className="mb-2">
              <span className="font-semibold">Home Team:</span>{" "}
              {report.biases.homeTeamBias > 0 ? "+" : ""}
              {report.biases.homeTeamBias.toFixed(2)} points (
              {report.biases.homeTeamBias > 0 ? "over" : "under"}predicting)
            </div>
          )}
          {report.biases.awayTeamBias && (
            <div className="mb-2">
              <span className="font-semibold">Away Team:</span>{" "}
              {report.biases.awayTeamBias > 0 ? "+" : ""}
              {report.biases.awayTeamBias.toFixed(2)} points (
              {report.biases.awayTeamBias > 0 ? "over" : "under"}predicting)
            </div>
          )}
          {report.biases.scoreBias && (
            <div>
              <span className="font-semibold">Total Score:</span>{" "}
              {report.biases.scoreBias > 0 ? "+" : ""}
              {report.biases.scoreBias.toFixed(2)} points (
              {report.biases.scoreBias > 0 ? "over" : "under"}predicting)
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500">
        <p>Note: This dashboard is only visible to admins. Regular users see predictions on matchup pages only.</p>
      </div>
    </div>
  );
}

