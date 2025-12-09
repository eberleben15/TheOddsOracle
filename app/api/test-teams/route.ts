import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const apiKey = process.env.STATS_API_KEY;
  const baseUrl = "https://v1.basketball.api-sports.io";
  
  if (!apiKey) {
    return NextResponse.json({ error: "STATS_API_KEY not set" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get("search") || "BYU";
  const league = searchParams.get("league") || "12";

  const results: any = {
    searchTerm,
    league,
    tests: [],
  };

  // Test team search endpoints
  const testEndpoints = [
    { name: "Search teams", url: `${baseUrl}/teams?search=${encodeURIComponent(searchTerm)}` },
    { name: "Search with league", url: `${baseUrl}/teams?search=${encodeURIComponent(searchTerm)}&league=${league}` },
    { name: "All teams in league", url: `${baseUrl}/teams?league=${league}` },
    { name: "Leagues list", url: `${baseUrl}/leagues` },
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
      
      results.tests.push({
        name: test.name,
        url: test.url,
        status,
        success: response.ok,
        hasData: !!data,
        responseStructure: data ? {
          keys: Object.keys(data),
          responseType: Array.isArray(data.response) ? "array" : typeof data.response,
          responseLength: Array.isArray(data.response) ? data.response.length : "N/A",
          firstItem: Array.isArray(data.response) && data.response.length > 0 
            ? {
                keys: Object.keys(data.response[0]),
                name: data.response[0].name || data.response[0].team?.name,
                id: data.response[0].id || data.response[0].team?.id,
              }
            : null,
        } : null,
        error: errorText || (data?.errors || []),
        fullResponse: data ? JSON.stringify(data).substring(0, 2000) : null,
      });
    } catch (error) {
      results.tests.push({
        name: test.name,
        url: test.url,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json(results);
}

