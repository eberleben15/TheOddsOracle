"use client";

import Link from "next/link";
import { ChartBarIcon, BeakerIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function MethodologyPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
          ← Dashboard
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BeakerIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-dark)]">How We Predict</h1>
            <p className="text-[var(--text-body)]">Our methodology in plain language</p>
          </div>
        </div>
      </div>

      <div className="space-y-6 text-[var(--text-body)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-2">Overview</h2>
          <p>
            The Odds Oracle uses team statistics, efficiency ratings, and calibrated probabilities to estimate win chances for each matchup. Our model combines <strong>Dean Oliver&apos;s Four Factors</strong> (when available) with schedule-adjusted offensive and defensive ratings, plus momentum and home-court adjustments.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-2">Calibration</h2>
          <p>
            Raw predictions are calibrated using validated game outcomes. We support two methods: <strong>Platt scaling</strong> (parametric) and <strong>Isotonic regression</strong> (nonparametric). Calibration improves the reliability of our probabilities so they better match actual results over time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-2">Continuous Improvement</h2>
          <p>
            The model is regularly updated based on completed games. Prediction accuracy is tracked, and calibration parameters are re-fitted as more validated outcomes become available. This feedback loop helps the system improve over time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-dark)] mb-2">What This Means for You</h2>
          <p>
            When we show a win probability or value bet, it reflects our best estimate given current data. Use these as one input among others—market odds, injuries, and your own judgment—when making betting decisions.
          </p>
        </section>

        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ChartBarIcon className="h-4 w-4" />
            More help and resources
          </Link>
        </div>
      </div>
    </div>
  );
}
