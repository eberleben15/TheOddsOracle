/**
 * Admin API: Bankroll Simulation
 * 
 * Calculates how a bankroll would grow/shrink based on validated predictions
 * using configurable betting rules.
 * 
 * GET /api/admin/bankroll-simulation
 * Query params:
 * - startingBankroll: Initial bankroll (default: 500)
 * - unitSize: Percentage of bankroll per bet (default: 2%)
 * - days: Number of days to simulate (default: 90)
 * - sport: Filter by sport (optional)
 * - confidenceThreshold: Minimum confidence to place bet (default: 60)
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

interface SimulationDataPoint {
  date: string;
  bankroll: number;
  bets: number;
  wins: number;
  losses: number;
  dailyPnL: number;
}

interface BetResult {
  date: Date;
  won: boolean;
  odds: number;
  stake: number;
  pnl: number;
  confidence: number;
  gameId: string;
}

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startingBankroll = parseFloat(searchParams.get("startingBankroll") || "500");
    const unitSizePercent = parseFloat(searchParams.get("unitSize") || "2");
    const days = parseInt(searchParams.get("days") || "90", 10);
    const sport = searchParams.get("sport");
    const confidenceThreshold = parseFloat(searchParams.get("confidenceThreshold") || "60");

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch validated predictions within date range
    const whereClause: Record<string, unknown> = {
      validated: true,
      validatedAt: {
        gte: startDate,
        lte: endDate,
      },
      actualHomeScore: { not: null },
      actualAwayScore: { not: null },
    };

    if (sport) {
      whereClause.sport = sport;
    }

    const predictions = await prisma.prediction.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
      select: {
        id: true,
        gameId: true,
        date: true,
        predictedSpread: true,
        confidence: true,
        winProbability: true,
        actualHomeScore: true,
        actualAwayScore: true,
        predictedScore: true,
      },
    });

    // Convert predictions to bet results
    const betResults: BetResult[] = [];

    for (const pred of predictions) {
      // Normalize confidence (handle both 0-1 and 0-100 formats)
      const confidence = pred.confidence > 1 ? pred.confidence : pred.confidence * 100;
      
      // Skip low confidence predictions
      if (confidence < confidenceThreshold) continue;

      // Determine if prediction was correct
      const actualSpread = (pred.actualAwayScore ?? 0) - (pred.actualHomeScore ?? 0);
      const predictedSpread = pred.predictedSpread;
      
      // We predicted home team to cover by predictedSpread
      // Positive predictedSpread means home favored
      // Check if home team covered the spread
      const predictedHomeCovers = predictedSpread > 0;
      const actualHomeCovered = actualSpread < -predictedSpread; // Home won by more than spread
      
      // Simple win/loss based on winner prediction
      const predictedScore = pred.predictedScore as { home: number; away: number } | null;
      const predictedWinner = predictedScore 
        ? (predictedScore.home > predictedScore.away ? "home" : "away")
        : (predictedSpread > 0 ? "home" : "away");
      const actualWinner = (pred.actualHomeScore ?? 0) > (pred.actualAwayScore ?? 0) ? "home" : 
                          (pred.actualAwayScore ?? 0) > (pred.actualHomeScore ?? 0) ? "away" : "tie";
      
      const won = predictedWinner === actualWinner;
      
      // Calculate implied odds from win probability
      // Higher confidence = lower odds (safer bet), lower payout
      const winProb = pred.winProbability as { home: number; away: number } | null;
      const impliedProb = predictedWinner === "home" 
        ? (winProb?.home ?? 0.5) 
        : (winProb?.away ?? 0.5);
      const normalizedProb = impliedProb > 1 ? impliedProb / 100 : impliedProb;
      
      // Standard -110 odds for spread bets (bet 110 to win 100)
      const odds = -110;
      const decimalOdds = odds < 0 ? 1 + (100 / Math.abs(odds)) : 1 + (odds / 100);

      betResults.push({
        date: new Date(pred.date),
        won,
        odds: decimalOdds,
        stake: 0, // Will be calculated during simulation
        pnl: 0,   // Will be calculated during simulation
        confidence,
        gameId: pred.gameId,
      });
    }

    // Run bankroll simulation
    let currentBankroll = startingBankroll;
    const dailyData: Map<string, SimulationDataPoint> = new Map();

    // Initialize daily data for all days in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      dailyData.set(dateStr, {
        date: dateStr,
        bankroll: currentBankroll,
        bets: 0,
        wins: 0,
        losses: 0,
        dailyPnL: 0,
      });
    }

    // Process bets chronologically
    for (const bet of betResults) {
      const dateStr = bet.date.toISOString().split("T")[0];
      const dayData = dailyData.get(dateStr);
      if (!dayData) continue;

      // Calculate stake based on current bankroll and unit size
      // Kelly-lite: scale unit size by confidence
      const confidenceMultiplier = Math.min(2, bet.confidence / 70); // Max 2x at high confidence
      const stake = currentBankroll * (unitSizePercent / 100) * confidenceMultiplier;
      bet.stake = stake;

      if (bet.won) {
        // Win: profit = stake * (odds - 1)
        const profit = stake * (bet.odds - 1);
        bet.pnl = profit;
        currentBankroll += profit;
        dayData.wins++;
      } else {
        // Loss: lose stake
        bet.pnl = -stake;
        currentBankroll -= stake;
        dayData.losses++;
      }

      dayData.bets++;
      dayData.dailyPnL += bet.pnl;
    }

    // Update bankroll values to be cumulative through each day
    let runningBankroll = startingBankroll;
    const sortedDates = Array.from(dailyData.keys()).sort();
    for (const dateStr of sortedDates) {
      const dayData = dailyData.get(dateStr)!;
      runningBankroll += dayData.dailyPnL;
      dayData.bankroll = runningBankroll;
    }

    // Convert to array and filter to days with activity or periodic checkpoints
    const chartData: SimulationDataPoint[] = [];
    let lastBankroll = startingBankroll;
    
    for (const dateStr of sortedDates) {
      const dayData = dailyData.get(dateStr)!;
      // Include if there were bets or bankroll changed or every 7th day
      const dayIndex = sortedDates.indexOf(dateStr);
      if (dayData.bets > 0 || dayData.bankroll !== lastBankroll || dayIndex % 7 === 0 || dayIndex === sortedDates.length - 1) {
        chartData.push(dayData);
        lastBankroll = dayData.bankroll;
      }
    }

    // Calculate summary stats
    const totalBets = betResults.length;
    const totalWins = betResults.filter(b => b.won).length;
    const totalLosses = totalBets - totalWins;
    const winRate = totalBets > 0 ? (totalWins / totalBets) * 100 : 0;
    const totalPnL = currentBankroll - startingBankroll;
    const roi = (totalPnL / startingBankroll) * 100;
    const maxDrawdown = calculateMaxDrawdown(chartData, startingBankroll);

    return NextResponse.json({
      chartData,
      summary: {
        startingBankroll,
        endingBankroll: currentBankroll,
        totalPnL,
        roi,
        totalBets,
        wins: totalWins,
        losses: totalLosses,
        winRate,
        maxDrawdown,
        avgBetSize: totalBets > 0 ? betResults.reduce((sum, b) => sum + b.stake, 0) / totalBets : 0,
      },
      settings: {
        days,
        unitSizePercent,
        confidenceThreshold,
        sport,
      },
    });
  } catch (error) {
    console.error("Error calculating bankroll simulation:", error);
    return NextResponse.json(
      { error: "Failed to calculate simulation" },
      { status: 500 }
    );
  }
}

function calculateMaxDrawdown(data: SimulationDataPoint[], startingBankroll: number): number {
  let peak = startingBankroll;
  let maxDrawdown = 0;

  for (const point of data) {
    if (point.bankroll > peak) {
      peak = point.bankroll;
    }
    const drawdown = ((peak - point.bankroll) / peak) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}
