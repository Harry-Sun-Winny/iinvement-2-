import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://financialmodelingprep.com/stable";
const TTL = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; value: unknown }>();
const numberOrNull = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

async function fetchFmp(path: string, symbol: string, apiKey: string) {
  const response = await fetch(`${BASE_URL}/${path}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`, { cache: "no-store" });
  if (response.status === 429) throw new Error("FMP rate limit reached. Please try again shortly.");
  if (response.status === 401 || response.status === 403) throw new Error("FMP API key is invalid or unauthorized.");
  if (!response.ok) throw new Error(`FMP request failed (${response.status}).`);
  const data = await response.json();
  return Array.isArray(data) ? data[0] : null;
}

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol")?.trim().toUpperCase() ?? "";
  const type = request.nextUrl.searchParams.get("type");
  if (!/^[A-Z0-9.-]{1,15}$/.test(symbol)) return NextResponse.json({ error: "Invalid ticker symbol." }, { status: 400 });
  if (type !== "income" && type !== "valuation") return NextResponse.json({ error: "Invalid FMP request type." }, { status: 400 });
  const apiKey = process.env.FMP_API_KEY?.trim().replace(/^apikey=/i, "");
  if (!apiKey) return NextResponse.json({ error: "FMP_API_KEY is not configured." }, { status: 503 });
  const key = `${type}:${symbol}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.value);

  try {
    let value;
    if (type === "income") {
      const row = await fetchFmp("income-statement", symbol, apiKey);
      if (!row) return NextResponse.json({ error: `No FMP data found for ${symbol}.` }, { status: 404 });
      value = { revenue: numberOrNull(row.revenue), grossProfit: numberOrNull(row.grossProfit), netIncome: numberOrNull(row.netIncome), ebitda: numberOrNull(row.ebitda) };
    } else {
      const [metrics, ratios] = await Promise.all([fetchFmp("key-metrics", symbol, apiKey), fetchFmp("ratios", symbol, apiKey)]);
      if (!metrics && !ratios) return NextResponse.json({ error: `No FMP data found for ${symbol}.` }, { status: 404 });
      value = {
        enterpriseValue: numberOrNull(metrics?.enterpriseValue), peRatio: numberOrNull(metrics?.peRatio),
        priceToSalesRatio: numberOrNull(metrics?.priceToSalesRatio), pbRatio: numberOrNull(metrics?.pbRatio),
        pegRatio: numberOrNull(ratios?.priceToEarningsGrowthRatio ?? metrics?.pegRatio),
      };
    }
    cache.set(key, { expiresAt: Date.now() + TTL, value });
    return NextResponse.json(value);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load FMP data." }, { status: 502 });
  }
}
