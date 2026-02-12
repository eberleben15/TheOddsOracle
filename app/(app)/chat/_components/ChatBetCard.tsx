"use client";

import { Card, CardBody, CardHeader, Chip, Button, Link } from "@nextui-org/react";
import { FaStar, FaChartLine, FaArrowRight, FaFire, FaExternalLinkAlt } from "react-icons/fa";
import NextLink from "next/link";
import type { RecommendedBet } from "@/types";

// Re-export for consumers that imported from this component
export type { RecommendedBet } from "@/types";

interface ChatBetCardProps {
  bet: RecommendedBet;
}

export function ChatBetCard({ bet }: ChatBetCardProps) {
  const formatOdds = (american: number) => {
    if (american > 0) return `+${american}`;
    return `${american}`;
  };

  const getValueColor = (rating: string) => {
    switch (rating) {
      case 'high':
        return 'success';
      case 'medium':
        return 'warning';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'moneyline':
        return 'Moneyline';
      case 'spread':
        return 'Spread';
      case 'total':
        return 'Total';
      default:
        return type;
    }
  };

  const getRecommendationDisplay = () => {
    if (bet.type === 'moneyline') {
      return bet.recommendation;
    } else if (bet.type === 'spread') {
      return bet.recommendation;
    } else {
      return bet.recommendation;
    }
  };

  return (
    <Card className="w-full mb-3 hover:shadow-lg transition-shadow">
      <CardHeader className="flex justify-between items-start pb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Chip
              size="sm"
              color={getValueColor(bet.valueRating)}
              variant="flat"
            >
              {bet.valueRating.toUpperCase()} VALUE
            </Chip>
            <Chip size="sm" variant="flat">
              {getTypeLabel(bet.type)}
            </Chip>
            {bet.confidence >= 75 && (
              <Chip
                size="sm"
                color="primary"
                variant="flat"
                startContent={<FaStar className="text-xs" />}
              >
                {bet.confidence}% Confidence
              </Chip>
            )}
          </div>
          <h3 className="font-semibold text-lg">{bet.gameTitle}</h3>
          <p className="text-sm text-gray-500">{bet.gameTime}</p>
        </div>
      </CardHeader>
      <CardBody className="pt-0">
        <div className="space-y-3">
          {/* Recommendation */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Recommendation:</p>
            <p className="text-base font-semibold">{getRecommendationDisplay()}</p>
          </div>

          {/* Odds and Bookmaker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">Current Odds</p>
              <p className="text-lg font-bold">
                {formatOdds(bet.currentOdds.american)}
              </p>
              <p className="text-xs text-gray-500">
                {bet.currentOdds.decimal.toFixed(2)} decimal
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Best Book</p>
              <p className="text-sm font-semibold">{bet.bookmaker}</p>
              {bet.bookmakers && bet.bookmakers.length > 1 && (
                <p className="text-xs text-gray-500">
                  +{bet.bookmakers.length - 1} more book{bet.bookmakers.length - 1 > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Edge and Expected Value */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500 mb-1">Edge</p>
              <p className={`text-sm font-semibold ${bet.edge > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {bet.edge > 0 ? '+' : ''}{bet.edge.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Expected Value</p>
              <p className={`text-sm font-semibold ${bet.ourPrediction.expectedValue > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                {bet.ourPrediction.expectedValue > 0 ? '+' : ''}{bet.ourPrediction.expectedValue.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Why this bet:</p>
            <p className="text-sm text-gray-700">{bet.reason}</p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <NextLink href={`/matchup/${bet.gameId}`} passHref>
              <Button
                size="sm"
                color="primary"
                variant="flat"
                endContent={<FaExternalLinkAlt className="text-xs" />}
                className="w-full"
              >
                View Matchup Details
              </Button>
            </NextLink>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

interface ChatBetCardsProps {
  bets: RecommendedBet[];
  count: number;
}

export function ChatBetCards({ bets, count }: ChatBetCardsProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-3">
        Showing {bets.length} of {count} recommended betting opportunities
      </p>
      {bets.map((bet) => (
        <ChatBetCard key={bet.id} bet={bet} />
      ))}
    </div>
  );
}

