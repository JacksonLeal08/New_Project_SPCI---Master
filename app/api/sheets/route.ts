import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const sheetId = "1iHsWsiGe95f-JGur-h5aPihmELZ5dCHmRlpm7g7NmwQ";
    const gid = "35114233";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    
    const response = await fetch(url, {
      next: { revalidate: 60 } // Cache for 1 minute
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet content: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    return new NextResponse(csvText, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error: any) {
    console.error("Sheets Proxy Endpoint Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch spreadsheet database" },
      { status: 500 }
    );
  }
}
