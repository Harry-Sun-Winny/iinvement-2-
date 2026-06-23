import { getPortfolios, getStockPrice, getTransactions } from "@/app/lib/api";
import type { HistoryPoint, FundamentalPoint, NewsContext, StockData } from "@/types/analysis";

async function getJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

export const marketService = {
  getPortfolios,
  getTransactions,
  async getPrices(symbols: string[]) {
    const entries = await Promise.all(symbols.map(async symbol => [symbol, await getStockPrice(symbol)] as const));
    return Object.fromEntries(entries.filter((entry): entry is readonly [string, StockData] => Boolean(entry[1])));
  },
  getHistory(symbol: string) {
    return getJson<{ points: HistoryPoint[]; fundamentals: FundamentalPoint[]; currency?: string }>(`/api/stock-history?symbol=${encodeURIComponent(symbol)}&range=1Y`, 10_000);
  },
  getNews(symbol: string) {
    return getJson<NewsContext[]>(`/api/stock-news?symbol=${encodeURIComponent(symbol)}&compact=1`, 10_000);
  },
  getProfile(symbol: string) {
    return getJson<{ marketCap?: number; currency?: string }>(`/api/stock-profile?symbol=${encodeURIComponent(symbol)}`, 10_000);
  },
};
