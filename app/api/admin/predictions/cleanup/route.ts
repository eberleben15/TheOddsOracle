/**
 * Admin API: Delete predictions before a specific date
 * 
 * DELETE /api/admin/predictions/cleanup?before=2026-02-18
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const beforeDate = searchParams.get("before");

  if (!beforeDate) {
    return NextResponse.json({ error: "Missing 'before' date parameter (format: YYYY-MM-DD)" }, { status: 400 });
  }

  const cutoffDate = new Date(beforeDate);
  if (isNaN(cutoffDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  // Set to start of day
  cutoffDate.setHours(0, 0, 0, 0);

  try {
    // First count how many will be deleted
    const countToDelete = await prisma.prediction.count({
      where: {
        date: {
          lt: cutoffDate,
        },
      },
    });

    if (countToDelete === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: `No predictions found before ${beforeDate}`,
      });
    }

    // Delete predictions
    const result = await prisma.prediction.deleteMany({
      where: {
        date: {
          lt: cutoffDate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Deleted ${result.count} predictions before ${beforeDate}`,
    });
  } catch (error) {
    console.error("Error deleting predictions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete predictions" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const beforeDate = searchParams.get("before");

  if (!beforeDate) {
    return NextResponse.json({ error: "Missing 'before' date parameter (format: YYYY-MM-DD)" }, { status: 400 });
  }

  const cutoffDate = new Date(beforeDate);
  if (isNaN(cutoffDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format. Use YYYY-MM-DD" }, { status: 400 });
  }

  cutoffDate.setHours(0, 0, 0, 0);

  try {
    const count = await prisma.prediction.count({
      where: {
        date: {
          lt: cutoffDate,
        },
      },
    });

    return NextResponse.json({
      count,
      message: `${count} predictions would be deleted before ${beforeDate}`,
      hint: "Use DELETE method to actually delete them",
    });
  } catch (error) {
    console.error("Error counting predictions:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to count predictions" },
      { status: 500 }
    );
  }
}
