/**
 * Admin API: Bet Records CRUD
 * 
 * GET - List bet records with filters
 * POST - Create a new bet record
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const result = searchParams.get("result"); // "pending", "win", "loss", "push", "all"
    const sport = searchParams.get("sport");
    const days = parseInt(searchParams.get("days") || "30", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereClause: Record<string, unknown> = {
      createdAt: { gte: startDate },
    };

    if (result && result !== "all") {
      whereClause.result = result;
    }

    if (sport) {
      whereClause.sport = sport;
    }

    const [records, total] = await Promise.all([
      prisma.betRecord.findMany({
        where: whereClause,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.betRecord.count({ where: whereClause }),
    ]);

    // Calculate summary stats
    const allRecords = await prisma.betRecord.findMany({
      where: whereClause,
      select: { result: true, stake: true, actualPayout: true },
    });

    const stats = {
      total: allRecords.length,
      pending: allRecords.filter(r => r.result === "pending" || !r.result).length,
      wins: allRecords.filter(r => r.result === "win").length,
      losses: allRecords.filter(r => r.result === "loss").length,
      pushes: allRecords.filter(r => r.result === "push").length,
      totalStaked: allRecords.reduce((sum, r) => sum + (r.stake || 0), 0),
      totalPnL: allRecords.reduce((sum, r) => sum + (r.actualPayout || 0), 0),
    };

    stats.totalStaked = Math.round(stats.totalStaked * 100) / 100;
    stats.totalPnL = Math.round(stats.totalPnL * 100) / 100;

    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats,
    });
  } catch (error) {
    console.error("Error fetching bet records:", error);
    return NextResponse.json(
      { error: "Failed to fetch bet records" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      predictionId,
      gameId,
      date,
      sport,
      homeTeam,
      awayTeam,
      betType,
      betSide,
      line,
      odds,
      stake,
      confidence,
      edge,
      notes,
    } = body;

    // Validate required fields
    if (!predictionId || !gameId || !betType || !betSide || !odds || !stake) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate potential payout based on American odds
    const decimalOdds = odds < 0 ? 1 + (100 / Math.abs(odds)) : 1 + (odds / 100);
    const potentialPayout = stake * (decimalOdds - 1);

    const record = await prisma.betRecord.create({
      data: {
        predictionId,
        gameId,
        date: new Date(date),
        sport,
        homeTeam,
        awayTeam,
        betType,
        betSide,
        line: line ?? null,
        odds,
        stake,
        potentialPayout: Math.round(potentialPayout * 100) / 100,
        confidence,
        edge: edge ?? null,
        notes: notes ?? null,
        result: "pending",
      },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Error creating bet record:", error);
    return NextResponse.json(
      { error: "Failed to create bet record" },
      { status: 500 }
    );
  }
}
