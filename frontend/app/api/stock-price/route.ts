import { NextRequest, NextResponse } from "next/server";
import { getMarketQuote } from "./marketData";
import { httpsGet } from "../utils";
import { mapWithConcurrency, marketRequestCache } from "../_lib/async-ttl-cache";

const LIVE_QUOTE_TTL_MS = 20_000;
const HISTORICAL_QUOTE_TTL_MS = 6 * 60 * 60_000;
const FX_RATE_TTL_MS = 15 * 60_000;
const QUOTE_RESPONSE_HEADERS = {
  "Cache-Control": "public, max-age=15, s-maxage=20, stale-while-revalidate=60",
};

const SYMBOL_ALIASES: Record<string, string> = {
  INTEL: "INTC",
  TSMC: "TSM",
  FOXCONN: "2317.TW",
  HONHAI: "2317.TW",
  "HON HAI": "2317.TW",
  MEDIATEK: "2454.TW",
  UMC: "UMC",
  ASE: "ASX",
  SANTA: "SAN",
  APPLE: "AAPL",
};

function getSymbolCandidates(symbol: string, preferredCurrency?: string | null) {
  const raw = symbol.trim().toUpperCase();
  // Strip trailing dots, commas, spaces (e.g. "AAPL." -> "AAPL")
  const normalized = raw.replace(/[\s.,]+$/, "");
  if (!normalized) return [];

  const alias = SYMBOL_ALIASES[normalized] ?? normalized;

  if (alias.includes(".")) {
    const dashed = alias.replace(/\./g, "-");
    return Array.from(new Set([alias, dashed, normalized]));
  }
  if (/^\d{4,6}$/.test(alias)) return [`${alias}.TW`, `${alias}.TWO`, alias];

  const currency = preferredCurrency?.trim().toUpperCase();
  if (currency === "VND") return [`${alias}.VN`, alias];
  if (currency === "TWD") return [`${alias}.TW`, `${alias}.TWO`, alias];

  return [alias, `${alias}.VN`];
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

  return marketRequestCache.getOrCreate(`fx:${currency}`, FX_RATE_TTL_MS, async () => {
    try {
      const data = await httpsGet(
        // Yahoo's <CURRENCY>=X quote is expressed as currency units per USD
        // (VND=X is approximately 25,400). VNDUSD=X would invert this rate.
        `https://query1.finance.yahoo.com/v8/finance/chart/${actualCurrency}=X?interval=1d&range=1d`,
        { "User-Agent": "Mozilla/5.0" },
      );
      const rate = data.chart?.result?.[0]?.meta?.regularMarketPrice ?? 1;
      return sub ? rate / sub.divisor : rate;
    } catch {
      return 1;
    }
  });
}

async function resolveQuote(
  requestedSymbol: string,
  targetCurrency: string,
  dateStr: string | null,
  preferredCurrency: string | null,
  range: string,
) {
  const candidates = getSymbolCandidates(requestedSymbol, preferredCurrency);
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const quote = await getMarketQuote(candidate, targetCurrency, dateStr, getUsdRate, range);
      return { ...quote, requestedSymbol, resolvedSymbol: candidate };
    } catch (error) {
      lastError = error;
    }
  }

  console.error("All quote sources failed for", requestedSymbol, lastError);

  return {
    symbol: requestedSymbol,
    price: null,
    currentPrice: null,
    previousClose: null,
    dayHigh: null,
    dayLow: null,
    change: 0,
    changePercent: 0,
    changeRange: null,
    changePctRange: null,
    currency: targetCurrency,
    sparkline: [],
    requestedSymbol,
    resolvedSymbol: null,
    dataQuality: {
      status: "ERROR" as const,
      checks: [String(lastError)],
      sources: [],
      unavailableSources: [],
      primarySource: "",
      fallbackUsed: false,
      maxDeviationPercent: null,
    },
  };
}

function resolveQuoteCached(
  requestedSymbol: string,
  targetCurrency: string,
  dateStr: string | null,
  preferredCurrency: string | null,
  range: string,
) {
  const cacheKey = [
    "quote",
    requestedSymbol.trim().toUpperCase(),
    targetCurrency,
    dateStr ?? "live",
    preferredCurrency?.trim().toUpperCase() ?? "",
    range,
  ].join(":");

  return marketRequestCache.getOrCreate(
    cacheKey,
    dateStr ? HISTORICAL_QUOTE_TTL_MS : LIVE_QUOTE_TTL_MS,
    () => resolveQuote(requestedSymbol, targetCurrency, dateStr, preferredCurrency, range),
  );
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  const dateStr = req.nextUrl.searchParams.get("date");
  const range = req.nextUrl.searchParams.get("range") || "1d";
  const targetCurrency = (req.nextUrl.searchParams.get("targetCurrency") || "USD").toUpperCase();
  const preferredCurrency = req.nextUrl.searchParams.get("preferredCurrency");

  if (symbolsParam) {
    const symbols = Array.from(
      new Set(
        symbolsParam
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ).slice(0, 40);

    if (symbols.length === 0) {
      return NextResponse.json({ error: "No symbols" }, { status: 400 });
    }

    const quotes = await mapWithConcurrency(
      symbols,
      8,
      (requestedSymbol) =>
        resolveQuoteCached(requestedSymbol, targetCurrency, dateStr, preferredCurrency, range),
    );

    return NextResponse.json({ quotes }, { headers: QUOTE_RESPONSE_HEADERS });
  }

  if (!symbol) {
    return NextResponse.json({ error: "No symbol" }, { status: 400 });
  }

  try {
    const quote = await resolveQuoteCached(symbol, targetCurrency, dateStr, preferredCurrency, range);
    return NextResponse.json(quote, { headers: QUOTE_RESPONSE_HEADERS });
  } catch (error) {
    console.error("Stock price error:", error);
    return NextResponse.json({ error: "Failed", details: String(error) }, { status: 500 });
  }
}

