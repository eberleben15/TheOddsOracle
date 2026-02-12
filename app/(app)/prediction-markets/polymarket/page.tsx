"use client";

import Link from "next/link";
import { PolymarketBrowseClient } from "../_components/PolymarketBrowseClient";

export default function PolymarketPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-dark mb-2">Polymarket</h1>
          <p className="text-text-body">
            Browse Polymarket prediction markets. Prices in cents (0–100).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link
            href="/prediction-markets/portfolio"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Portfolio Risk
          </Link>
          <a
            href="https://polymarket.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Open Polymarket
          </a>
        </div>
      </div>

      <PolymarketBrowseClient />
    </div>
  );
}
