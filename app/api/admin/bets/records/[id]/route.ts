/**
 * Admin API: Individual Bet Record Operations
 * 
 * GET - Get a single bet record
 * PATCH - Update bet record (settle, update result, notes)
 * DELETE - Remove a bet record
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const record = await prisma.betRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ record });
  } catch (error) {
    console.error("Error fetching bet record:", error);
    return NextResponse.json(
      { error: "Failed to fetch bet record" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { result, actualPayout, notes } = body;

    const existingRecord = await prisma.betRecord.findUnique({
      where: { id },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Calculate actual payout if result is provided but payout isn't
    let calculatedPayout = actualPayout;
    if (result && calculatedPayout === undefined) {
      if (result === "win") {
        calculatedPayout = existingRecord.potentialPayout;
      } else if (result === "loss") {
        calculatedPayout = -existingRecord.stake;
      } else if (result === "push") {
        calculatedPayout = 0;
      }
    }

    const updateData: Record<string, unknown> = {};
    
    if (result !== undefined) {
      updateData.result = result;
      if (result !== "pending") {
        updateData.settledAt = new Date();
      }
    }
    
    if (calculatedPayout !== undefined) {
      updateData.actualPayout = calculatedPayout;
    }
    
    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const record = await prisma.betRecord.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Error updating bet record:", error);
    return NextResponse.json(
      { error: "Failed to update bet record" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.betRecord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bet record:", error);
    return NextResponse.json(
      { error: "Failed to delete bet record" },
      { status: 500 }
    );
  }
}
