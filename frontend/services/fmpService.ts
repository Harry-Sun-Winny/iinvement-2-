export interface FmpIncomeStatement {
  revenue: number | null;
  grossProfit: number | null;
  netIncome: number | null;
  ebitda: number | null;
}

export interface FmpValuationMetrics {
  enterpriseValue: number | null;
  peRatio: number | null;
  priceToSalesRatio: number | null;
  pbRatio: number | null;
  pegRatio: number | null;
}

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; value: unknown }>();

async function requestFmp<T>(ticker: string, type: "income" | "valuation"): Promise<T> {
  const symbol = ticker.trim().toUpperCase();
  const key = `${type}:${symbol}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  const response = await fetch(`/api/fmp?symbol=${encodeURIComponent(symbol)}&type=${type}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Unable to load FMP ${type} data.`);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL, value: payload });
  return payload as T;
}

export const fetchIncomeStatement = (ticker: string) => requestFmp<FmpIncomeStatement>(ticker, "income");
export const fetchValuationMetrics = (ticker: string) => requestFmp<FmpValuationMetrics>(ticker, "valuation");
