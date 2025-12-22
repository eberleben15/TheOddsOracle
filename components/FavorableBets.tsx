"use client";

import { Card, CardBody, CardHeader, Chip } from "@nextui-org/react";
import { FavorableBet, FavorableBetAnalysis } from "@/lib/favorable-bet-engine";
import { FaLightbulb, FaChartLine, FaStar } from "react-icons/fa";

interface FavorableBetsProps {
  analysis: FavorableBetAnalysis;
}

export function FavorableBets({ analysis }: FavorableBetsProps) {
  if (analysis.totalValueBets === 0) {
    return null;
  }

  const getValueRatingColor = (rating: 'high' | 'medium' | 'low') => {
    switch (rating) {
      case 'high':
        return 'bg-value text-white';
      case 'medium':
        return 'bg-value/80 text-white';
      case 'low':
        return 'bg-value/60 text-white';
    }
  };

  const getEdgeColor = (edge: number) => {
    if (edge >= 5) return 'text-value font-bold';
    if (edge >= 3) return 'text-value';
    return 'text-gray-600';
  };

  return (
    <Card className="bg-value-light border-2 border-value/30 shadow-lg">
      <CardHeader className="border-b border-value/20">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <FaStar className="text-value" size={20} />
            <h3 className="text-xl font-semibold text-text-dark">Favorable Bet Opportunities</h3>
          </div>
          <Chip size="sm" className="bg-value text-white">
            {analysis.totalValueBets} Found
          </Chip>
        </div>
        {analysis.bestBet && (
          <div className="mt-2 text-sm text-gray-600">
            Best Edge: <span className="font-semibold text-value">{analysis.highestEdge.toFixed(1)}%</span> • 
            Avg Edge: <span className="font-semibold text-gray-700">{analysis.averageEdge.toFixed(1)}%</span>
          </div>
        )}
      </CardHeader>
      <CardBody className="p-6">
        <div className="space-y-4">
          {analysis.bets.map((bet, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-lg border border-value/30 hover:border-value/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FaLightbulb className="text-value" size={16} />
                    <div className="font-semibold text-text-dark">{bet.recommendation}</div>
                    {bet.valueRating === 'high' && (
                      <Chip size="sm" className="bg-value text-white text-xs">
                        High Value
                      </Chip>
                    )}
                  </div>
                  <div className="text-xs text-value uppercase tracking-wide font-medium mb-1">
                    {bet.type.toUpperCase()}
                    {bet.bookmakers && bet.bookmakers.length > 1 ? (
                      <span className="ml-2 normal-case">
                        • Best price available at {bet.bookmakers.length} books
                      </span>
                    ) : (
                      <span className="ml-2 normal-case">• {bet.bookmaker}</span>
                    )}
                  </div>
                  {bet.bookmakers && bet.bookmakers.length > 1 && (
                    <div className="mt-1 mb-2 flex flex-wrap gap-1">
                      {bet.bookmakers.slice(0, 5).map((bookmaker, idx) => (
                        <Chip 
                          key={idx}
                          size="sm" 
                          variant="flat"
                          className="bg-gray-100 text-gray-700 text-xs"
                        >
                          {bookmaker}
                        </Chip>
                      ))}
                      {bet.bookmakers.length > 5 && (
                        <Chip 
                          size="sm" 
                          variant="flat"
                          className="bg-gray-100 text-gray-700 text-xs"
                        >
                          +{bet.bookmakers.length - 5} more
                        </Chip>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-text-body">{bet.reason}</p>
                </div>
                <div className="text-right ml-4">
                  <Chip size="sm" className={getValueRatingColor(bet.valueRating)}>
                    {bet.confidence}% Confidence
                  </Chip>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div>
                  <div className="text-xs text-gray-500 mb-1">
                    Market Odds
                    {bet.bookmakers && bet.bookmakers.length > 1 && (
                      <span className="ml-1 text-value">(Best Price)</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-700">
                    {bet.currentOdds.decimal.toFixed(2)} ({bet.currentOdds.american > 0 ? '+' : ''}{bet.currentOdds.american})
                  </div>
                  <div className="text-xs text-gray-500">
                    Implied: {bet.currentOdds.impliedProbability.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Our Prediction</div>
                  <div className="text-sm font-semibold text-gray-700">
                    {bet.ourPrediction.probability.toFixed(1)}% Win Prob
                  </div>
                  <div className={`text-xs font-medium ${getEdgeColor(bet.edge)}`}>
                    {bet.edge > 0 ? '+' : ''}{bet.edge.toFixed(1)}% Edge
                  </div>
                </div>
              </div>

              {bet.ourPrediction.expectedValue > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <FaChartLine className="text-value" size={14} />
                    <span className="text-xs text-gray-600">
                      Expected Value: <span className="font-semibold text-value">+{bet.ourPrediction.expectedValue.toFixed(1)}%</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

