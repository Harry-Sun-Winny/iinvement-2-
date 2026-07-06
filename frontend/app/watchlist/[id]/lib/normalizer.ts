import { DashboardData } from "./types";
import { adaptYahooHistory } from "./adapters/yahoo";
import { adaptFinnhubPrice, adaptFinnhubProfile } from "./adapters/finnhub";
import { adaptFmpIncome, adaptFmpValuation } from "./adapters/fmp";
import { validatePriceData, validateProfileData, validateHistoryData } from "./validation";
import { DashboardError } from "./error-model";

export function normalizeDashboardData(
  symbol: string,
  rawPrice: any,
  rawProfile: any,
  rawHistory: any,
  rawFmpIncome: any,
  rawFmpValuation: any,
  rawNews: any
): DashboardData {
  // 1. Validation Layer
  try {
    validatePriceData(rawPrice);
  } catch (e) {
    console.warn("[Normalizer] Price validation failed:", e);
  }

  try {
    validateProfileData(rawProfile);
  } catch (e) {
    console.warn("[Normalizer] Profile validation failed:", e);
  }

  try {
    validateHistoryData(rawHistory);
  } catch (e) {
    console.warn("[Normalizer] History validation failed:", e);
  }

  // 2. Adapter Layer
  const quote = rawPrice ? adaptFinnhubPrice(rawPrice) : { price: null, change: null, changePercent: null };
  const profile = rawProfile ? adaptFinnhubProfile(rawProfile) : { logo: "", marketCap: null, name: symbol, currency: "USD", sector: "Unknown", country: "Unknown", website: "" };
  const history = rawHistory ? adaptYahooHistory(rawHistory) : { points: [], fundamentals: [] };
  const income = rawFmpIncome ? adaptFmpIncome(rawFmpIncome) : { revenue: null, grossProfit: null, netIncome: null, ebitda: null };
  const valuation = rawFmpValuation ? adaptFmpValuation(rawFmpValuation) : { enterpriseValue: null, peRatio: null, priceToSalesRatio: null, pbRatio: null, pegRatio: null };

  const currency = profile.currency || "USD";

  // 3. Build Metrics dynamic KV store
  const metrics: Record<string, number | null> = {
    price: quote.price,
    revenue: income.revenue,
    grossProfit: income.grossProfit,
    netIncome: income.netIncome,
    ebitda: income.ebitda,
    enterpriseValue: valuation.enterpriseValue,
    peRatio: valuation.peRatio,
    priceToSalesRatio: valuation.priceToSalesRatio,
    pbRatio: valuation.pbRatio,
    pegRatio: valuation.pegRatio,
  };

  // 4. Transform chart points with moving averages
  const validHistory = history.points.filter(p => p.adjustedClose != null || p.close != null);
  const prices = validHistory.map(p => p.adjustedClose ?? p.close ?? 0);
  const lastPrice = prices[prices.length - 1] || 0;
  const marketCapValue = profile.marketCap || 0;

  function movingAverage(values: number[], window: number, index: number) {
    const start = Math.max(0, index - window + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  }

  let fundamentalIndex = -1;
  let currentFundamentals: any = null;

  const chartPoints = validHistory.map((point, index) => {
    const adjustedPrice = prices[index];
    while (fundamentalIndex + 1 < history.fundamentals.length && history.fundamentals[fundamentalIndex + 1].date <= point.date) {
      fundamentalIndex += 1;
      currentFundamentals = history.fundamentals[fundamentalIndex];
    }
    return {
      date: point.date,
      price: adjustedPrice,
      volume: point.volume,
      ma50: movingAverage(prices, 50, index),
      ma200: movingAverage(prices, 200, index),
      revenue: currentFundamentals?.revenue ?? null,
      ebitda: currentFundamentals?.ebitda ?? null,
      netIncome: currentFundamentals?.netIncome ?? null,
      marketCap: marketCapValue && lastPrice > 0 ? marketCapValue * (adjustedPrice / lastPrice) : null,
    };
  });

  const news = Array.isArray(rawNews) ? rawNews.map((n: any) => ({
    title: n.title || "",
    summary: n.summary || "",
    url: n.url || "",
    source: n.source || "",
    publishedAt: n.publishedAt || "",
  })) : [];


  return {
    symbol,
    name: profile.name || symbol,
    assetClass: symbol.includes("-USD") ? "CRYPTO" : "EQUITY", // basic heuristic fallback
    currency,
    quote: {
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      volume: quote.price && chartPoints[chartPoints.length - 1]?.volume ? chartPoints[chartPoints.length - 1].volume : null,
    },
    profile: {
      logo: profile.logo,
      marketCap: profile.marketCap,
      sector: profile.sector,
      industry: profile.sector,
      country: profile.country,
      website: profile.website,
    },
    metrics,
    chartPoints,
    peers: [],
    news,
  };
}
