import { NextResponse } from "next/server";
import { loadManualMappingsFromFile } from "@/lib/team-mapping";
import manualMappings from "@/lib/team-mappings.json";

export async function GET() {
  try {
    loadManualMappingsFromFile(manualMappings);
    return NextResponse.json({ 
      success: true, 
      message: `Loaded ${Object.keys(manualMappings).length} manual mappings` 
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

