import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";

const yahooFinance = new YahooFinanceClass();

export async function GET(req: NextRequest) {
  const rawSymbol = req.nextUrl.searchParams.get("symbol");
  if (!rawSymbol) return NextResponse.json({ sector: "Other", industry: "" });
  const symbol = rawSymbol.trim().toUpperCase().replace(/[\s.,]+$/, "");

  try {
    const quote = await yahooFinance.quoteSummary(symbol, { modules: ["summaryProfile", "price"] });
    const profile = quote.summaryProfile;
    const price = quote.price;
    return NextResponse.json({
      name: price?.longName ?? price?.shortName ?? symbol,
      sector: profile?.sector ?? "Other",
      industry: profile?.industry ?? "",
    });
  } catch (error) {
    return NextResponse.json({ sector: "Other", industry: "", error: String(error) });
  }
}
