"use client";

import Link from "next/link";
import { SeriesBrowseClient } from "../_components/SeriesBrowseClient";

export default function KalshiPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-dark mb-2">Kalshi</h1>
          <p className="text-text-body">
            Browse Kalshi prediction markets. Prices in cents (0–100).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/prediction-markets/portfolio"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Portfolio Risk
          </Link>
          <Link
            href="/prediction-markets/all"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            View all Kalshi
          </Link>
        </div>
      </div>

      <SeriesBrowseClient />
    </div>
  );
}
