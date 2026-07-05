import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
const yahooFinance = new YahooFinanceClass();
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ sector: "KhÃ¡c" });

  try {
    const quote = await yahooFinance.quoteSummary(symbol, { modules: ['summaryProfile'] });
    const sector = quote.summaryProfile?.sector ?? quote.summaryProfile?.industry ?? "KhÃ¡c";
    return NextResponse.json({ sector, raw: quote });
  } catch (e) {
    return NextResponse.json({ sector: "KhÃ¡c", error: String(e) });
  }
}
