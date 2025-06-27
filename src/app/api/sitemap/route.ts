import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch sitemap" }, { status: 400 });
    }
    const xml = await res.text();
    return new NextResponse(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    });
  } catch {
    return NextResponse.json({ error: "Error fetching sitemap" }, { status: 500 });
  }
}
