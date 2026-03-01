/**
 * Admin API: A/B Testing Management
 *
 * GET: Retrieve A/B test results and assignments
 * POST: Create or manage A/B tests
 */

import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-utils";
import {
  getABTestResults,
  listTests,
  getTestAssignments,
  calculateSignificance,
} from "@/lib/ab-testing";

export async function GET(request: NextRequest) {
  const admin = await isAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const testName = searchParams.get("test");
    
    // List all tests
    if (!testName) {
      const tests = await listTests();
      return NextResponse.json({ tests });
    }
    
    // Get specific test results
    const results = await getABTestResults(testName);
    const assignments = await getTestAssignments(testName);
    
    // Calculate statistical significance
    const significance = calculateSignificance(
      results.control.wins,
      results.control.losses,
      results.treatment.wins,
      results.treatment.losses
    );
    
    return NextResponse.json({
      testName,
      results,
      assignments: {
        control: assignments.filter(a => a.variant === "control").length,
        treatment: assignments.filter(a => a.variant === "treatment").length,
      },
      significance,
    });
  } catch (error) {
    console.error("A/B test API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
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
    const action = body.action as string;
    
    if (action === "create") {
      // Future: Implement test creation logic
      // Would store test metadata and enable A/B mode in config
      return NextResponse.json({
        message: "A/B test creation not yet implemented",
      });
    }
    
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("A/B test POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
