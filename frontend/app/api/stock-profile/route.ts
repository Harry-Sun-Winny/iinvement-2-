import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "No symbol" }, { status: 400 });

  const key = process.env.FINNHUB_API_KEY;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${key}`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    return NextResponse.json({
      logo: data.logo || "",
      marketCap: data.marketCapitalization || 0,
      name: data.name || symbol,
      currency: data.currency || "USD",
      sector: data.finnhubIndustry || "Unknown",
      country: data.country || "Unknown",
    });
  } catch {
    return NextResponse.json({ logo: "", marketCap: 0 });
  }
}
