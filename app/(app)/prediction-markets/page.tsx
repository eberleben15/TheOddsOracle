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
          Browse by platform. Connect accounts in Portfolio Risk to sync positions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <Link
          href="/prediction-markets/kalshi"
          className="flex flex-col p-6 rounded-xl border border-[var(--border-color)] bg-white hover:border-gray-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-text-dark mb-1">Kalshi</h2>
          <p className="text-sm text-text-body">
            Browse Kalshi markets and series. Sync positions in Portfolio Risk.
          </p>
          <span className="text-sm font-medium text-gray-600 mt-3">Browse Kalshi →</span>
        </Link>
        <Link
          href="/prediction-markets/polymarket"
          className="flex flex-col p-6 rounded-xl border border-[var(--border-color)] bg-white hover:border-gray-300 hover:shadow-md transition-all"
        >
          <h2 className="text-lg font-semibold text-text-dark mb-1">Polymarket</h2>
          <p className="text-sm text-text-body">
            Browse Polymarket events. Add your wallet in Portfolio Risk to sync.
          </p>
          <span className="text-sm font-medium text-gray-600 mt-3">Browse Polymarket →</span>
        </Link>
      </div>
    </div>
  );
}
