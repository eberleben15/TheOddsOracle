"use client";

import { Card, CardBody, CardHeader, Button } from "@nextui-org/react";
import { FaLock, FaCrown, FaArrowRight } from "react-icons/fa";
import Link from "next/link";

interface PremiumGateProps {
  feature: "predictions" | "recommended_bets" | "advanced_analytics";
  title?: string;
  message?: string;
}

export function PremiumGate({ feature, title, message }: PremiumGateProps) {
  const defaultMessages = {
    predictions: "AI-Powered Predictions",
    recommended_bets: "Recommended Bets",
    advanced_analytics: "Advanced Analytics",
  };

  const defaultTitles = {
    predictions: "Unlock AI-Powered Predictions",
    recommended_bets: "Unlock Recommended Bets",
    advanced_analytics: "Unlock Advanced Analytics",
  };

  const featureTitle = title || defaultTitles[feature];
  const featureMessage = message || getPremiumMessage(feature);

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-lg">
      <CardHeader className="border-b border-yellow-200 bg-white/50">
        <div className="flex items-center gap-3 w-full">
          <div className="p-2 bg-yellow-500 rounded-lg">
            <FaLock className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{featureTitle}</h3>
            <p className="text-sm text-gray-600">Premium Feature</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500 rounded-full">
            <FaCrown className="text-white" size={16} />
            <span className="text-white font-semibold text-sm">PREMIUM</span>
          </div>
        </div>
      </CardHeader>
      <CardBody className="p-6">
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">{featureMessage}</p>
          
          <div className="bg-white p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-2">Premium Benefits:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">✓</span>
                <span>AI-powered win probability predictions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">✓</span>
                <span>Recommended value bets with edge analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">✓</span>
                <span>Advanced matchup analytics and insights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-1">✓</span>
                <span>Real-time prediction updates</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Link href="/pricing" className="flex-1">
              <Button
                className="w-full bg-yellow-500 text-white font-semibold hover:bg-yellow-600"
                size="lg"
                endContent={<FaArrowRight size={14} />}
              >
                Upgrade to Premium
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                variant="bordered"
                className="border-gray-300"
                size="lg"
              >
                Continue Browsing
              </Button>
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function getPremiumMessage(feature: "predictions" | "recommended_bets" | "advanced_analytics"): string {
  const messages = {
    predictions: "AI-powered predictions are available for Premium members. Upgrade to unlock advanced analytics and win probability calculations.",
    recommended_bets: "Recommended bets are available for Premium members. Upgrade to see our top value betting opportunities.",
    advanced_analytics: "Advanced analytics are available for Premium members. Upgrade to unlock detailed matchup analysis.",
  };
  return messages[feature];
}

