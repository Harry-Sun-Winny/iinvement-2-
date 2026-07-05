import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
const yahooFinance = new YahooFinanceClass();

const USER_AGENT = "Mozilla/5.0 InvestmentPlatform/0.1";
const RANGE_MAP: Record<string, string> = {
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  YTD: "ytd",
  "1Y": "1y",
  "3Y": "3y",
  "5Y": "5y",
  Max: "max",
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
};

function getSymbolCandidates(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  const alias = SYMBOL_ALIASES[normalized] ?? normalized;
  if (alias.includes(".")) return [alias];
  if (/^\d{4,6}$/.test(alias)) return [`${alias}.TW`, `${alias}.TWO`, alias];
  return [alias];
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

interface FundamentalPoint {
  date: string;
  revenue: number | null;
  ebitda: number | null;
  netIncome: number | null;
}

async function fetchFundamentals(symbol: string): Promise<FundamentalPoint[]> {
  const period1 = Math.floor(new Date("2000-01-01").getTime() / 1000);
  const period2 = Math.floor(Date.now() / 1000) + 86_400;
  const types = ["annualTotalRevenue", "annualEBITDA", "annualNetIncome"];
  const res = await fetch(
    `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}?symbol=${encodeURIComponent(symbol)}&type=${types.join(",")}&period1=${period1}&period2=${period2}`,
    { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error(`Yahoo fundamentals ${res.status}`);

  const data = await res.json();
  const byDate = new Map<string, FundamentalPoint>();
  for (const series of data.timeseries?.result ?? []) {
    const type = series?.meta?.type?.[0] as string | undefined;
    if (!type || !types.includes(type)) continue;
    for (const value of series[type] ?? []) {
      const date = value?.asOfDate as string | undefined;
      const raw = finiteNumber(value?.reportedValue?.raw);
      if (!date || raw == null) continue;
      const point = byDate.get(date) ?? { date, revenue: null, ebitda: null, netIncome: null };
      if (type === "annualTotalRevenue") point.revenue = raw;
      if (type === "annualEBITDA") point.ebitda = raw;
      if (type === "annualNetIncome") point.netIncome = raw;
      byDate.set(date, point);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchYahooHistory(symbol: string, range: string, interval: "1d" | "1mo") {
  let period1 = new Date();
  if (range === "1mo") period1.setMonth(period1.getMonth() - 1);
  if (range === "3mo") period1.setMonth(period1.getMonth() - 3);
  if (range === "6mo") period1.setMonth(period1.getMonth() - 6);
  if (range === "ytd") period1 = new Date(period1.getFullYear(), 0, 1);
  if (range === "1y") period1.setFullYear(period1.getFullYear() - 1);
  if (range === "3y") period1.setFullYear(period1.getFullYear() - 3);
  if (range === "5y") period1.setFullYear(period1.getFullYear() - 5);
  if (range === "max") period1 = new Date("1970-01-01");

  const chart = await yahooFinance.chart(symbol, {
    period1: Math.floor(period1.getTime() / 1000),
    period2: Math.floor(Date.now() / 1000),
    interval
  });

  const quotes = chart.quotes ?? [];
  if (quotes.length === 0) throw new Error("Yahoo history missing data");

  const points = quotes
    .map((q) => {
      const close = finiteNumber(q.close);
      const adjustedClose = finiteNumber(q.adjclose) ?? close;
      const volume = finiteNumber(q.volume);
      if (close == null && adjustedClose == null) return null;
      return {
        date: new Date(q.date).toISOString().slice(0, 10),
        close,
        adjustedClose,
        volume,
      };
    })
    .filter(Boolean);

  return {
    currency: chart.meta.currency || "USD",
    exchangeName: chart.meta.exchangeName,
    points,
  };
}

async function fetchHistory(symbol: string, range: string) {
  if (range !== "max") {
    const history = await fetchYahooHistory(symbol, range, "1d");
    return { symbol, ...history };
  }

  const [longTerm, recent] = await Promise.all([
    fetchYahooHistory(symbol, "max", "1mo"),
    fetchYahooHistory(symbol, "5y", "1d"),
  ]);
  const recentStart = recent.points[0]?.date;
  const points = recentStart
    ? [...longTerm.points.filter(point => point && point.date < recentStart), ...recent.points]
    : longTerm.points;

  return {
    symbol,
    currency: recent.currency || longTerm.currency,
    exchangeName: recent.exchangeName || longTerm.exchangeName,
    points,
  };
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const rangeParam = req.nextUrl.searchParams.get("range") || "5Y";
  const range = RANGE_MAP[rangeParam] ?? RANGE_MAP["5Y"];

  if (!symbol) return NextResponse.json({ error: "No symbol" }, { status: 400 });

  let lastError: unknown = null;
  for (const candidate of getSymbolCandidates(symbol)) {
    try {
      const history = await fetchHistory(candidate, range);
      let fundamentals: FundamentalPoint[] = [];
      try {
        fundamentals = await fetchFundamentals(candidate);
      } catch {
        fundamentals = [];
      }
      return NextResponse.json({ ...history, fundamentals, requestedSymbol: symbol, resolvedSymbol: candidate });
    } catch (error) {
      lastError = error;
    }
  }

  return NextResponse.json({ error: "Failed", details: String(lastError) }, { status: 500 });
}
