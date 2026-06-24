import { NextRequest, NextResponse } from "next/server";
import { getMarketQuote } from "./marketData";

const SYMBOL_ALIASES: Record<string, string> = {
  INTEL: "INTC",
  TSMC: "TSM",
  FOXCONN: "2317.TW",
  HONHAI: "2317.TW",
  "HON HAI": "2317.TW",
  MEDIATEK: "2454.TW",
  UMC: "UMC",
  ASE: "ASX",
};

function getSymbolCandidates(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  const alias = SYMBOL_ALIASES[normalized] ?? normalized;
  if (alias.includes(".")) return [alias];
  if (/^\d{4,6}$/.test(alias)) return [`${alias}.TW`, `${alias}.TWO`, alias];
  return [alias];
}

async function getUsdRate(currency: string): Promise<number> {
  if (!currency || currency === "USD") return 1;

  const subunitMap: Record<string, { parent: string; divisor: number }> = {
    GBp: { parent: "GBP", divisor: 100 },
    ZAc: { parent: "ZAR", divisor: 100 },
    ILA: { parent: "ILS", divisor: 100 },
    AUc: { parent: "AUD", divisor: 100 },
    NZc: { parent: "NZD", divisor: 100 },
    CAc: { parent: "CAD", divisor: 100 },
    HKc: { parent: "HKD", divisor: 100 },
    SGc: { parent: "SGD", divisor: 100 },
    MYs: { parent: "MYR", divisor: 100 },
    THS: { parent: "THB", divisor: 100 },
    INp: { parent: "INR", divisor: 100 },
    PKp: { parent: "PKR", divisor: 100 },
    BDt: { parent: "BDT", divisor: 100 },
    LKc: { parent: "LKR", divisor: 100 },
    AEf: { parent: "AED", divisor: 100 },
    BHf: { parent: "BHD", divisor: 1000 },
    KWf: { parent: "KWD", divisor: 1000 },
    OMb: { parent: "OMR", divisor: 1000 },
    JDp: { parent: "JOD", divisor: 1000 },
    SAr: { parent: "SAR", divisor: 100 },
    QAr: { parent: "QAR", divisor: 100 },
    BRc: { parent: "BRL", divisor: 100 },
    MXc: { parent: "MXN", divisor: 100 },
    ARc: { parent: "ARS", divisor: 100 },
    CLc: { parent: "CLP", divisor: 100 },
    COc: { parent: "COP", divisor: 100 },
    PEc: { parent: "PEN", divisor: 100 },
    TRk: { parent: "TRY", divisor: 100 },
    RUb: { parent: "RUB", divisor: 100 },
    UAk: { parent: "UAH", divisor: 100 },
    PLg: { parent: "PLN", divisor: 100 },
    CZh: { parent: "CZK", divisor: 100 },
    HUf: { parent: "HUF", divisor: 100 },
    ROb: { parent: "RON", divisor: 100 },
    CNf: { parent: "CNY", divisor: 100 },
    JPs: { parent: "JPY", divisor: 1 },
    KRW: { parent: "KRW", divisor: 1 },
    VND: { parent: "VND", divisor: 1 },
    IDR: { parent: "IDR", divisor: 1 },
    TWc: { parent: "TWD", divisor: 100 },
  };

  const sub = subunitMap[currency];
  const actualCurrency = sub ? sub.parent : currency;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${actualCurrency}USD=X?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 60 } },
    );
    const data = await res.json();
    const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice ?? 1;
    return sub ? rate / sub.divisor : rate;
  } catch {
    return 1;
  }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const dateStr = req.nextUrl.searchParams.get("date");
  const targetCurrency = (req.nextUrl.searchParams.get("targetCurrency") || "USD").toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "No symbol" }, { status: 400 });
  }

  try {
    const candidates = getSymbolCandidates(symbol);
    let lastError: unknown = null;
    for (const candidate of candidates) {
      try {
        const quote = await getMarketQuote(candidate, targetCurrency, dateStr, getUsdRate);
        return NextResponse.json({ ...quote, requestedSymbol: symbol, resolvedSymbol: candidate });
      } catch (error) {
        lastError = error;
      }
    }
    console.error("All quote sources failed for", symbol, lastError);
    // Return a safe default so frontend can render stable UI instead of 500
    return NextResponse.json(
      {
        symbol,
        price: null,
        currentPrice: null,
        change: 0,
        changePercent: 0,
        currency: targetCurrency,
        requestedSymbol: symbol,
        resolvedSymbol: null,
        dataQuality: { status: "ERROR", checks: [String(lastError)], sources: [], unavailableSources: [], primarySource: "", fallbackUsed: false, maxDeviationPercent: null },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Stock price error:", error);
    return NextResponse.json({ error: "Failed", details: String(error) }, { status: 500 });
  }
}
