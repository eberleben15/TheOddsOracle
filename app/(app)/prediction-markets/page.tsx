"use client";

import Link from "next/link";

export default function PredictionMarketsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-dark mb-2">
          Prediction Markets
        </h1>
        <p className="text-text-body">
          Dashboard, portfolio risk, and browse by platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mb-8">
        <Link
          href="/dashboard"
          className="flex flex-col p-6 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
        >
          <h2 className="text-lg font-semibold text-text-dark mb-1">Dashboard</h2>
          <p className="text-sm text-text-body">
            At-a-glance portfolio summary, factor exposure, and risk.
          </p>
          <span className="text-sm font-medium text-emerald-700 mt-3">View dashboard →</span>
        </Link>
        <Link
          href="/prediction-markets/kalshi"
          className="flex flex-col p-6 rounded-xl border border-[var(--border-color)] bg-white hover:border-gray-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-text-dark mb-1">Kalshi</h2>
          <p className="text-sm text-text-body">
            Browse Kalshi markets and series. Sync in Portfolio Risk.
          </p>
          <span className="text-sm font-medium text-gray-600 mt-3">Browse Kalshi →</span>
        </Link>
        <Link
          href="/prediction-markets/polymarket"
          className="flex flex-col p-6 rounded-xl border border-[var(--border-color)] bg-white hover:border-gray-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-text-dark mb-1">Polymarket</h2>
          <p className="text-sm text-text-body">
            Browse Polymarket events. Add wallet in Portfolio Risk.
          </p>
          <span className="text-sm font-medium text-gray-600 mt-3">Browse Polymarket →</span>
        </Link>
      </div>
    </div>
  );
}
