"use client";

import { Card, CardBody, CardHeader, Chip, Button } from "@nextui-org/react";
import { FaStar, FaChartLine, FaArrowRight, FaFire } from "react-icons/fa";
import Link from "next/link";

export interface RecommendedBet {
  id: string;
  gameId: string;
  gameTitle: string;
  gameTime: string;
  type: 'moneyline' | 'spread' | 'total';
  recommendation: string;
  bookmaker: string;
  bookmakers?: string[]; // List of all books offering this bet at this price
  team?: 'away' | 'home'; // Team for moneyline/spread bets
  currentOdds: {
    decimal: number;
    american: number;
    impliedProbability: number;
  };
  ourPrediction: {
    probability: number;
    expectedValue: number;
  };
  edge: number;
  confidence: number;
  reason: string;
  valueRating: 'high' | 'medium' | 'low';
}

interface RecommendedBetsProps {
  bets: RecommendedBet[];
}

export function RecommendedBets({ bets }: RecommendedBetsProps) {
  if (bets.length === 0) {
    return (
      <Card className="bg-gray-50 border border-gray-200">
        <CardBody className="p-6 text-center">
          <p className="text-gray-600">No recommended bets found at this time.</p>
          <p className="text-sm text-gray-500 mt-2">Check back later for new opportunities.</p>
        </CardBody>
      </Card>
    );
  }

  const getValueRatingColor = (rating: 'high' | 'medium' | 'low') => {
    switch (rating) {
      case 'high':
        return 'bg-red-600 text-white';
      case 'medium':
        return 'bg-orange-500 text-white';
      case 'low':
        return 'bg-yellow-500 text-white';
    }
  };

  const getEdgeColor = (edge: number) => {
    if (edge >= 5) return 'text-red-600 font-bold';
    if (edge >= 3) return 'text-orange-500 font-semibold';
    return 'text-yellow-600';
  };

  const topBets = bets.slice(0, 5); // Show top 5 bets

  return (
    <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 shadow-lg">
      <CardHeader className="border-b border-red-200 bg-white/50">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-600 rounded-lg">
              <FaFire className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Recommended Bets</h3>
              <p className="text-sm text-gray-600">Top value opportunities identified by our AI</p>
            </div>
          </div>
          <Chip size="lg" className="bg-red-600 text-white font-semibold">
            {bets.length} Opportunities
          </Chip>
        </div>
        {bets.length > 0 && (
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div>
              Best Edge: <span className="font-bold text-red-600">{bets[0].edge.toFixed(1)}%</span>
            </div>
            <div>
              Avg Edge: <span className="font-semibold text-gray-700">
                {(bets.reduce((sum, b) => sum + b.edge, 0) / bets.length).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardBody className="p-6">
        <div className="space-y-4">
          {topBets.map((bet, idx) => (
            <div
              key={`${bet.id}-${idx}`}
              className="bg-white p-5 rounded-xl border-2 border-red-100 hover:border-red-300 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div className="font-bold text-lg text-gray-900">{bet.recommendation}</div>
                    <Chip size="sm" className={getValueRatingColor(bet.valueRating)}>
                      {bet.valueRating.toUpperCase()} VALUE
                    </Chip>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <Link 
                      href={`/matchup/${bet.gameId}`}
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {bet.gameTitle}
                    </Link>
                    <span className="text-gray-400 mx-2">•</span>
                    <span>{bet.gameTime}</span>
                  </div>
                  <div className="text-xs text-red-600 uppercase tracking-wide font-semibold mb-2">
                    {bet.type.toUpperCase()}
                    {bet.bookmakers && bet.bookmakers.length > 1 ? (
                      <span className="ml-2">
                        • Available at {bet.bookmakers.length} books: {bet.bookmakers.slice(0, 3).join(', ')}
                        {bet.bookmakers.length > 3 && ` +${bet.bookmakers.length - 3} more`}
                      </span>
                    ) : (
                      <span className="ml-2">• {bet.bookmaker}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{bet.reason}</p>
                </div>
                <div className="text-right ml-4">
                  <Chip size="md" className="bg-gray-100 text-gray-800 font-semibold">
                    {bet.confidence}% Confidence
                  </Chip>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-gray-200">
                <div>
                  <div className="text-xs text-gray-500 mb-1 font-medium">Market Odds</div>
                  <div className="text-base font-bold text-gray-800">
                    {bet.currentOdds.decimal.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-600">
                    {bet.currentOdds.american > 0 ? '+' : ''}{bet.currentOdds.american}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Implied: {bet.currentOdds.impliedProbability.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1 font-medium">Our Prediction</div>
                  <div className="text-base font-bold text-gray-800">
                    {bet.ourPrediction.probability.toFixed(1)}%
                  </div>
                  <div className={`text-sm font-bold mt-1 ${getEdgeColor(bet.edge)}`}>
                    {bet.edge > 0 ? '+' : ''}{bet.edge.toFixed(1)}% Edge
                  </div>
                  {bet.ourPrediction.expectedValue > 0 && (
                    <div className="text-xs text-green-600 font-semibold mt-1">
                      +{bet.ourPrediction.expectedValue.toFixed(1)}% EV
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  <Link href={`/matchup/${bet.gameId}`}>
                    <Button
                      size="sm"
                      className="bg-red-600 text-white hover:bg-red-700"
                      endContent={<FaArrowRight size={12} />}
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {bets.length > 5 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Showing top 5 of {bets.length} recommended bets
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

