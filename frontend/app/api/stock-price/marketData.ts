import YahooFinanceClass from "yahoo-finance2";
const yahooFinance = new YahooFinanceClass();

// Cache setup
const CACHE_TTL_MS = 60000; // 60 seconds TTL
interface CacheEntry {
  data: any;
  expiresAt: number;
}
const quoteCache = new Map<string, CacheEntry>();
const quotePromiseCache = new Map<string, Promise<any>>();

// --- BATCHING LOGIC FOR YAHOO QUOTE ---
const quoteBatchQueue = new Set<string>();
let quoteBatchPromise: Promise<Map<string, any>> | null = null;
let quoteBatchTimeout: NodeJS.Timeout | null = null;

export function getQuoteBatched(symbol: string): Promise<any> {
  quoteBatchQueue.add(symbol);
  
  if (!quoteBatchPromise) {
    quoteBatchPromise = new Promise((resolve, reject) => {
      // Wait 50ms to accumulate concurrent requests from the frontend
      quoteBatchTimeout = setTimeout(async () => {
        const symbolsToFetch = Array.from(quoteBatchQueue);
        quoteBatchQueue.clear();
        quoteBatchPromise = null;
        
        try {
          // Send all symbols in a single request to yahoo-finance2
          let results: any = await yahooFinance.quote(symbolsToFetch);
          if (!Array.isArray(results)) {
            results = [results];
          }
          
          const map = new Map<string, any>();
          for (const res of results) {
            if (res && res.symbol) {
              map.set(res.symbol, res);
            }
          }
          resolve(map);
        } catch (err) {
          reject(err);
        }
      }, 50);
    });
  }
  
  return quoteBatchPromise.then(map => {
    const res = map.get(symbol);
    if (!res) throw new Error(`Quote missing in batch for ${symbol}`);
    return res;
  });
}
// ---------------------------------------

type MarketQuote = {
  source: string;
  symbol: string;
  price: number;
  currency?: string;
};

export type QuoteHealth = {
  status: "OK" | "WARN" | "ERROR";
  checks: string[];
  sources: string[];
  unavailableSources: string[];
  primarySource: string;
  fallbackUsed: boolean;
  maxDeviationPercent: number | null;
};

const MAX_SOURCE_DEVIATION_PERCENT = 1;
const MAX_DAILY_MOVE_PERCENT = 5000;

function buildHealth(
  primary: MarketQuote,
  fallbacks: MarketQuote[],
  checks: string[],
  unavailableSources: string[],
): QuoteHealth {
  if (primary.price <= 0) checks.push("Price is zero or negative");
  if (!Number.isFinite(primary.price)) checks.push("Price is not finite");

  let maxDeviationPercent: number | null = null;
  if (primary.price > 0 && fallbacks.length > 0) {
    maxDeviationPercent = Math.max(
      ...fallbacks.map((quote) => Math.abs((quote.price - primary.price) / primary.price) * 100),
    );
    if (maxDeviationPercent > MAX_SOURCE_DEVIATION_PERCENT) {
      checks.push(`Source deviation ${maxDeviationPercent.toFixed(2)}% exceeds ${MAX_SOURCE_DEVIATION_PERCENT}%`);
    }
  }

  return {
    status: checks.length === 0 ? "OK" : "WARN",
    checks,
    sources: [primary, ...fallbacks].map((quote) => quote.source),
    unavailableSources,
    primarySource: primary.source,
    fallbackUsed: primary.source !== "yahoo-chart",
    maxDeviationPercent,
  };
}

export async function getMarketQuote(
  symbol: string,
  targetCurrency: string,
  dateStr: string | null,
  getUsdRate: (currency: string) => Promise<number>,
) {
  // Check cache first
  const cacheKey = `${symbol}_${targetCurrency}_${dateStr || "latest"}`;
  const nowMs = Date.now();
  const cached = quoteCache.get(cacheKey);
  if (cached && cached.expiresAt > nowMs) {
    return cached.data;
  }

  // Check promise cache to prevent thundering herd
  if (quotePromiseCache.has(cacheKey)) {
    return quotePromiseCache.get(cacheKey);
  }

  const fetchTask = (async () => {
    const checks: string[] = [];
    const unavailableSources: string[] = [];
    let primary: MarketQuote | null = null;
    
    let priceOnDate: number = 0;
    let currentPrice: number = 0;
    let previousPrice: number = 0;
    let sourceCurrency = "USD";
    let exchangeName = "";

    if (dateStr) {
      // Historical data requested -> must use chart
      const targetDate = new Date(dateStr);
      const startDate = new Date(targetDate);
      startDate.setDate(startDate.getDate() - 5);
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + 5);
      const now = new Date();
      const cappedEndDate = endDate > now ? now : endDate;

      try {
        const chartResult = await yahooFinance.chart(symbol, {
          period1: Math.floor(startDate.getTime() / 1000),
          period2: Math.floor(cappedEndDate.getTime() / 1000),
          interval: "1d"
        });
        
        primary = {
          source: "yahoo-chart",
          symbol,
          price: chartResult.meta.regularMarketPrice ?? 0,
          currency: chartResult.meta.currency || "USD"
        };
        
        sourceCurrency = chartResult.meta.currency || "USD";
        exchangeName = chartResult.meta.exchangeName || "";
        currentPrice = chartResult.meta.regularMarketPrice ?? 0;
        priceOnDate = currentPrice;
        previousPrice = chartResult.meta.chartPreviousClose ?? currentPrice;

        const quotes = chartResult.quotes ?? [];
        if (quotes.length > 0) {
          const targetTime = targetDate.getTime();
          let closestIdx = 0;
          let minDiff = Math.abs(new Date(quotes[0].date).getTime() - targetTime);
          for (let i = 1; i < quotes.length; i++) {
            const diff = Math.abs(new Date(quotes[i].date).getTime() - targetTime);
            if (diff < minDiff) {
              minDiff = diff;
              closestIdx = i;
            }
          }
          const closeVal = quotes[closestIdx].close;
          if (closeVal !== null && closeVal !== undefined && !isNaN(closeVal)) {
            priceOnDate = closeVal;
          }
          if (quotes.length >= 2) {
            const prevCloseVal = quotes[quotes.length - 2].close;
            if (prevCloseVal !== null && prevCloseVal !== undefined && !isNaN(prevCloseVal)) {
              previousPrice = prevCloseVal;
            }
          }
        }
      } catch (error) {
        throw new Error(`Chart source failed: ${error}`);
      }
    } else {
      // Current price requested -> try quote first for speed
      let quoteSuccess = false;
      let quoteErrorStr = "";
      try {
        const summary = await getQuoteBatched(symbol);
        // Only consider it a success if it has a valid price
        if (typeof summary.regularMarketPrice === 'number' && summary.regularMarketPrice > 0) {
          primary = {
            source: "yahoo-summary",
            symbol,
            price: summary.regularMarketPrice,
            currency: summary.currency || "USD"
          };
          
          sourceCurrency = summary.currency || "USD";
          exchangeName = summary.fullExchangeName || summary.exchange || "";
          currentPrice = summary.regularMarketPrice;
          priceOnDate = currentPrice;
          
        // Fallback to chart if previous close is missing to calculate daily change correctly
        if (typeof summary.regularMarketPreviousClose === 'number') {
          previousPrice = summary.regularMarketPreviousClose;
          quoteSuccess = true;
        } else {
          quoteErrorStr = "Missing regularMarketPreviousClose";
        }
      } else {
        quoteErrorStr = "Missing regularMarketPrice";
      }
    } catch (error: any) {
      quoteErrorStr = error?.message || String(error);
    }

    if (!quoteSuccess) {
        // Fallback to chart if quote failed or was missing previous close
        const targetDate = new Date();
        const startDate = new Date(targetDate);
        startDate.setDate(startDate.getDate() - 5);
        const endDate = new Date(targetDate);
        endDate.setDate(endDate.getDate() + 5);
        const cappedEndDate = endDate > new Date() ? new Date() : endDate;

        try {
          const chartResult = await yahooFinance.chart(symbol, {
            period1: Math.floor(startDate.getTime() / 1000),
            period2: Math.floor(cappedEndDate.getTime() / 1000),
            interval: "1d"
          });
          
          primary = {
            source: "yahoo-chart",
            symbol,
            price: chartResult.meta.regularMarketPrice ?? 0,
            currency: chartResult.meta.currency || "USD"
          };
          
          sourceCurrency = chartResult.meta.currency || "USD";
          exchangeName = chartResult.meta.exchangeName || "";
          currentPrice = chartResult.meta.regularMarketPrice ?? 0;
          priceOnDate = currentPrice;
          previousPrice = chartResult.meta.chartPreviousClose ?? currentPrice;

          const quotes = chartResult.quotes ?? [];
          if (quotes.length >= 2) {
            const prevCloseVal = quotes[quotes.length - 2].close;
            if (prevCloseVal !== null && prevCloseVal !== undefined && !isNaN(prevCloseVal)) {
              previousPrice = prevCloseVal;
            }
          }
        } catch (error: any) {
          throw new Error(`Quote failed (${quoteErrorStr}), AND Chart failed (${error?.message || String(error)})`);
        }
      }
    }

    const fallbacks: MarketQuote[] = [];
    const fxRate = targetCurrency === "USD" ? await getUsdRate(sourceCurrency) : 1;
    
    const price = priceOnDate * fxRate;
    const finalCurrentPrice = currentPrice * fxRate;
    const finalPreviousPrice = previousPrice * fxRate;

    const change = finalCurrentPrice - finalPreviousPrice;
    const changePercent = finalPreviousPrice > 0 ? (change / finalPreviousPrice) * 100 : 0;
    
    if (Math.abs(changePercent) > MAX_DAILY_MOVE_PERCENT) {
      checks.push(`Unusual price move ${changePercent.toFixed(2)}%`);
    }

    if (!primary) {
      throw new Error(`No primary market quote resolved for ${symbol}`);
    }

    const finalData = {
      symbol,
      price,
      currentPrice: finalCurrentPrice,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      changeRange: change,
      currency: targetCurrency === "USD" ? "USD" : sourceCurrency,
      sourceCurrency,
      exchangeName,
      date: dateStr || new Date().toISOString().slice(0, 10),
      dataQuality: buildHealth(
        { ...primary, price },
        fallbacks,
        checks,
        unavailableSources,
      ),
    };

    quoteCache.set(cacheKey, { data: finalData, expiresAt: Date.now() + CACHE_TTL_MS });
    quotePromiseCache.delete(cacheKey);
    return finalData;
  })();

  quotePromiseCache.set(cacheKey, fetchTask);
  return fetchTask;
}
