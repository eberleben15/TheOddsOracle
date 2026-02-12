import Link from "next/link";
import { PredictionMarketsClient } from "../_components/PredictionMarketsClient";

export const revalidate = 60;

export default function PredictionMarketsAllPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-body mb-1">
            <Link href="/prediction-markets" className="hover:text-text-dark">
              Prediction Markets
            </Link>
            <span>/</span>
            <span className="text-text-dark font-medium">All markets</span>
          </div>
          <h1 className="text-2xl font-bold text-text-dark">
            All open markets
          </h1>
          <p className="text-text-body text-sm mt-1">
            Every open market on Kalshi. Use status filters or browse by category from the main page.
          </p>
        </div>
        <Link
          href="/prediction-markets"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shrink-0"
        >
          Browse by category
        </Link>
      </div>
      <PredictionMarketsClient />
    </div>
  );
}
