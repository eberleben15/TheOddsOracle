/**
 * Admin API: Fetch paginated predictions list
 * 
 * GET /api/admin/predictions/list?page=1&limit=20&filter=all|validated|pending
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

export interface AlternateSpread {
  spread: number;
  direction: 'buy' | 'sell';
  team: 'home' | 'away';
  reason: string;
  confidence: number;
  riskLevel: 'safer' | 'standard' | 'aggressive';
}

export interface PredictionListItem {
  id: string;
  gameId: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  sport: string | null;
  predictedScore: { home: number; away: number };
  predictedSpread: number;
  alternateSpread: AlternateSpread | null;
  predictedTotal: number | null;
  winProbability: { home: number; away: number };
  confidence: number;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualWinner: string | null;
  actualTotal: number | null;
  validated: boolean;
  validatedAt: string | null;
  createdAt: string;
  // CLV (Closing Line Value) fields
  openingSpread: number | null;
  closingSpread: number | null;
  clvSpread: number | null;
  lineMovement: number | null;
}

export interface PredictionListResponse {
  predictions: PredictionListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await isAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const filter = searchParams.get("filter") || "all";
    const sortOrder = (searchParams.get("sort") || "desc") as "asc" | "desc";
    const sport = searchParams.get("sport");

    const where: Record<string, unknown> = {};
    
    if (filter === "validated") {
      where.validated = true;
    } else if (filter === "pending") {
      where.validated = false;
    }
    
    if (sport) {
      where.sport = sport;
    }

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        orderBy: { date: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          gameId: true,
          date: true,
          homeTeam: true,
          awayTeam: true,
          sport: true,
          predictedScore: true,
          predictedSpread: true,
          alternateSpread: true,
          predictedTotal: true,
          winProbability: true,
          confidence: true,
          actualHomeScore: true,
          actualAwayScore: true,
          actualWinner: true,
          actualTotal: true,
          validated: true,
          validatedAt: true,
          createdAt: true,
          // CLV fields
          openingSpread: true,
          closingSpread: true,
          clvSpread: true,
          lineMovement: true,
        },
      }),
      prisma.prediction.count({ where }),
    ]);

    const response: PredictionListResponse = {
      predictions: predictions.map((p) => ({
        id: p.id,
        gameId: p.gameId,
        date: p.date.toISOString(),
        homeTeam: p.homeTeam,
        awayTeam: p.awayTeam,
        sport: p.sport,
        predictedScore: p.predictedScore as { home: number; away: number },
        predictedSpread: p.predictedSpread,
        alternateSpread: p.alternateSpread as AlternateSpread | null,
        predictedTotal: p.predictedTotal,
        winProbability: p.winProbability as { home: number; away: number },
        confidence: p.confidence,
        actualHomeScore: p.actualHomeScore,
        actualAwayScore: p.actualAwayScore,
        actualWinner: p.actualWinner,
        actualTotal: p.actualTotal,
        validated: p.validated,
        validatedAt: p.validatedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        // CLV fields
        openingSpread: p.openingSpread,
        closingSpread: p.closingSpread,
        clvSpread: p.clvSpread,
        lineMovement: p.lineMovement,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching predictions list:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
