import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.STATS_API_KEY;
  const baseUrl = "https://v1.basketball.api-sports.io";
  
  if (!apiKey) {
    return NextResponse.json({ error: "STATS_API_KEY not set" }, { status: 500 });
  }

  const results: any[] = [];
  
  // Test various endpoint structures
  const testEndpoints = [
    { name: "Teams list", url: `${baseUrl}/teams` },
    { name: "Teams with league", url: `${baseUrl}/teams?league=12` },
    { name: "Teams search", url: `${baseUrl}/teams?search=Duke` },
    { name: "Teams name", url: `${baseUrl}/teams?name=Duke` },
    { name: "Leagues", url: `${baseUrl}/leagues` },
    { name: "Seasons", url: `${baseUrl}/seasons` },
  ];

  for (const test of testEndpoints) {
    try {
      const response = await fetch(test.url, {
        headers: {
          "x-apisports-key": apiKey,
        },
      });
      
      const status = response.status;
      let data: any = null;
      let errorText = "";
      
      try {
        const text = await response.text();
        if (text) {
          data = JSON.parse(text);
        }
      } catch (e) {
        errorText = "Failed to parse JSON";
      }
      
      results.push({
        name: test.name,
        url: test.url,
        status,
        success: response.ok,
        hasData: !!data,
        responseKeys: data ? Object.keys(data) : [],
        error: errorText || (data?.errors || []),
      });
    } catch (error) {
      results.push({
        name: test.name,
        url: test.url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ results });
}

