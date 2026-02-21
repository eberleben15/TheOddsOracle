/**
 * Admin Predictions Dashboard
 * 
 * Shows prediction performance metrics, validation results, and analytics
 * Organized by sport with tabs for easy navigation
 * Admin-only access
 */

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-utils";
import { PredictionsDashboard } from "./PredictionsDashboard";

// Force dynamic rendering - no caching for admin pages
export const dynamic = "force-dynamic";

export default async function AdminPredictionsPage() {
  // Check admin access
  const admin = await isAdmin();
  if (!admin) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Prediction Feedback Dashboard</h1>
      
      {/* Main Dashboard with Sport Tabs - includes performance metrics */}
      <PredictionsDashboard />

      <div className="mt-6 text-sm text-gray-500">
        <p>This dashboard tracks every prediction change for the feedback loop. Use the sport tabs to filter by league.</p>
      </div>
    </div>
  );
}

