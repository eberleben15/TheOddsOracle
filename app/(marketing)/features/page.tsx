import Link from "next/link";
import {
  ChartBarIcon,
  BoltIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@nextui-org/react";

export const metadata = {
  title: "Features - The Odds Oracle",
  description: "Explore features and capabilities of The Odds Oracle.",
};

const features = [
  {
    title: "Advanced Analytics",
    description: "Deep dive into team statistics, recent form, and head-to-head history.",
    icon: ChartBarIcon,
  },
  {
    title: "Real-Time Odds",
    description: "Live odds from multiple sportsbooks with best value recommendations.",
    icon: BoltIcon,
  },
  {
    title: "AI-Powered Insights",
    description: "Custom betting strategies and recommendations tailored to your preferences.",
    icon: SparklesIcon,
  },
  {
    title: "Bankroll Management",
    description: "Track your bets, manage your portfolio, and optimize your bankroll.",
    icon: ShieldCheckIcon,
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <Link
          href="/"
          className="text-sm text-gray-600 hover:text-gray-900 mb-6 inline-block"
        >
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Features</h1>
        <p className="text-lg text-gray-600 mb-10">
          Everything you need to bet smarter — from live odds to AI-driven insights.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h2>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/pricing">
            <Button color="primary" size="lg" endContent={<ArrowRightIcon className="h-5 w-5" />}>
              View pricing
            </Button>
          </Link>
          <Link href="/auth/signin">
            <Button variant="bordered" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      </div>

      <footer className="bg-gray-900 text-gray-300 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <Link href="/" className="hover:text-white">
            The Odds Oracle
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          {" · "}
          <Link href="/pricing" className="hover:text-white">
            Pricing
          </Link>
          <p className="mt-2">&copy; {new Date().getFullYear()} The Odds Oracle. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
