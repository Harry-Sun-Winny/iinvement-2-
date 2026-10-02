import YahooFinanceClass from "yahoo-finance2";

const yahooFinance = new YahooFinanceClass();

const CACHE_TTL_MS = 60_000;

const CRYPTO_ID_BY_SYMBOL: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  LTC: "litecoin",
  TRX: "tron",
  SHIB: "shiba-inu",
  USDT: "tether",
  USDC: "usd-coin",
};

function coinGeckoIdForSymbol(symbol: string) {
  const normalized = symbol
    .trim()
    .toUpperCase()
    .replace(/[-_/](USD|USDT|USDC)$/, "");

  return CRYPTO_ID_BY_SYMBOL[normalized] ?? null;
}

async function fetchCoinGeckoSnapshot(symbol: string) {
  const coinId = coinGeckoIdForSymbol(symbol);
  const apiKey = process.env.COINGECKO_API_KEY;

  if (!coinId || !apiKey) return null;

  const isPro = process.env.COINGECKO_API_PLAN?.toLowerCase() === "pro";
  const endpoint = isPro
    ? "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";

  const headerName = isPro
    ? "x-cg-pro-api-key"
    : "x-cg-demo-api-key";

  const url = new URL(`${endpoint}/simple/price`);
  url.searchParams.set("ids", coinId);
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_market_cap", "true");
  url.searchParams.set("include_24hr_vol", "true");
  url.searchParams.set("include_24hr_change", "true");
  url.searchParams.set("include_last_updated_at", "true");

  const response = await fetch(url, {
    headers: { [headerName]: apiKey },
    next: { revalidate: 20 },
  });

  if (!response.ok) {
    throw new Error(`CoinGecko ${response.status}`);
  }

  const data = (await response.json())?.[coinId];

  if (typeof data?.usd !== "number" || data.usd <= 0) {
    throw new Error("CoinGecko returned no USD price");
  }

  return {
    price: data.usd as number,
    marketCap: finiteNumber(data.usd_market_cap),
    volume: finiteNumber(data.usd_24h_vol),
    changePercent: finiteNumber(data.usd_24h_change),
    updatedAt: finiteNumber(data.last_updated_at),
  };
}

function roundCryptoPrice(value: number) {
  if (!Number.isFinite(value)) return null;

  const decimals =
    Math.abs(value) < 1 ? 8 :
    Math.abs(value) < 100 ? 4 :
    2;

  return Number(value.toFixed(decimals));
}
interface CacheEntry {
  data: any;
  expiresAt: number;
}

const quoteCache = new Map<string, CacheEntry>();
const quotePromiseCache = new Map<string, Promise<any>>();

const quoteBatchQueue = new Set<string>();
let quoteBatchPromise: Promise<Map<string, any>> | null = null;

export function getQuoteBatched(symbol: string): Promise<any> {
  quoteBatchQueue.add(symbol);

  if (!quoteBatchPromise) {
    quoteBatchPromise = new Promise((resolve, reject) => {
      setTimeout(async () => {
        const symbolsToFetch = Array.from(quoteBatchQueue);
        quoteBatchQueue.clear();
        quoteBatchPromise = null;

        try {
          let results: any = await yahooFinance.quote(symbolsToFetch);
          if (!Array.isArray(results)) {
            results = [results];
          }

          const map = new Map<string, any>();
          for (const result of results) {
            if (result?.symbol) {
              map.set(result.symbol, result);
            }
          }

          resolve(map);
        } catch (error) {
          reject(error);
        }
      }, 40);
    });
  }

  return quoteBatchPromise.then((map) => {
    const result = map.get(symbol);
    if (!result) {
      throw new Error(`Quote missing in batch for ${symbol}`);
    }
    return result;
  });
}

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

type SupportedRange = "1d" | "5d" | "1m" | "6m" | "ytd" | "1y";

type RangeSeries = {
  startPrice: number | null;
  endPrice: number | null;
  sparkline: number[];
  asOf: string | null;
  tradingDate: string | null;
};

const MAX_SOURCE_DEVIATION_PERCENT = 1;
const MAX_DAILY_MOVE_PERCENT = 5000;

function normalizeRange(range?: string | null): SupportedRange {
  switch ((range || "1d").toLowerCase()) {
    case "5d":
      return "5d";
    case "1m":
      return "1m";
    case "6m":
      return "6m";
    case "ytd":
      return "ytd";
    case "1y":
      return "1y";
    default:
      return "1d";
  }
}

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
    fallbackUsed: primary.source !== "yahoo-chart" && primary.source !== "yahoo-summary",
    maxDeviationPercent,
  };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round2(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function downsampleSeries(points: number[], maxPoints = 24): number[] {
  if (points.length <= maxPoints) return points;

  const step = (points.length - 1) / (maxPoints - 1);
  const sampled: number[] = [];

  for (let i = 0; i < maxPoints; i += 1) {
    const index = Math.round(i * step);
    sampled.push(points[index]);
  }

  return sampled;
}

function buildRangeWindow(range: SupportedRange) {
  const period2 = new Date();
  const period1 = new Date(period2);
  let interval: "5m" | "30m" | "1d" = "1d";

  switch (range) {
    case "1d":
      period1.setDate(period1.getDate() - 2);
      interval = "5m";
      break;
    case "5d":
      period1.setDate(period1.getDate() - 8);
      interval = "30m";
      break;
    case "1m":
      period1.setMonth(period1.getMonth() - 1);
      interval = "1d";
      break;
    case "6m":
      period1.setMonth(period1.getMonth() - 6);
      interval = "1d";
      break;
    case "ytd":
      period1.setMonth(0, 1);
      period1.setHours(0, 0, 0, 0);
      interval = "1d";
      break;
    case "1y":
      period1.setFullYear(period1.getFullYear() - 1);
      interval = "1d";
      break;
  }

  return {
    period1: Math.floor(period1.getTime() / 1000),
    period2: Math.floor(period2.getTime() / 1000),
    interval,
  };
}

async function fetchRangeSeries(symbol: string, range: SupportedRange): Promise<RangeSeries> {
  const { period1, period2, interval } = buildRangeWindow(range);
  const chart = await yahooFinance.chart(symbol, { period1, period2, interval });

  const sparkline = (chart.quotes ?? [])
    .map((point) => finiteNumber(point.close))
    .filter((value): value is number => value != null);

  if (sparkline.length === 0) {
    return {
      startPrice: null,
      endPrice: finiteNumber(chart.meta.regularMarketPrice),
      sparkline: [],
      asOf: null,
      tradingDate: null,
    };
  }

  let lastQuote: { date?: Date } | undefined;
  const quotes = chart.quotes ?? [];
  for (let index = quotes.length - 1; index >= 0; index -= 1) {
    if (finiteNumber(quotes[index].close) != null) {
      lastQuote = quotes[index];
      break;
    }
  }

  return {
    startPrice: sparkline[0] ?? null,
    endPrice: sparkline[sparkline.length - 1] ?? finiteNumber(chart.meta.regularMarketPrice),
    sparkline: downsampleSeries(sparkline),
    asOf: lastQuote?.date ? new Date(lastQuote.date).toISOString() : null,
    tradingDate: lastQuote?.date ? new Date(lastQuote.date).toISOString().slice(0, 10) : null,
  };
}

async function resolveFxFactor(
  sourceCurrency: string,
  targetCurrency: string,
  getUsdRate: (currency: string) => Promise<number>,
) {
  if (!sourceCurrency || sourceCurrency === targetCurrency) return 1;
  if (sourceCurrency === "USD") {
    return await getUsdRate(targetCurrency);
  }
  if (targetCurrency === "USD") {
    const sourceToUsd = await getUsdRate(sourceCurrency);
    return sourceToUsd > 0 ? 1 / sourceToUsd : 1;
  }

  const [sourceToUsd, targetToUsd] = await Promise.all([
    getUsdRate(sourceCurrency),
    getUsdRate(targetCurrency),
  ]);

  return sourceToUsd > 0 ? targetToUsd / sourceToUsd : targetToUsd;
}

async function resolveQuoteSnapshot(symbol: string) {
  let quoteError = "";

  try {
    const summary = await getQuoteBatched(symbol);
    const regularMarketPrice = finiteNumber(summary?.regularMarketPrice);
    const regularMarketPreviousClose = finiteNumber(summary?.regularMarketPreviousClose);

    if (regularMarketPrice != null && regularMarketPreviousClose != null) {
      return {
        primary: {
          source: "yahoo-summary",
          symbol,
          price: regularMarketPrice,
          currency: summary.currency || "USD",
        } satisfies MarketQuote,
        currentPrice: regularMarketPrice,
        previousPrice: regularMarketPreviousClose,
        dayHigh: finiteNumber(summary.regularMarketDayHigh),
        dayLow: finiteNumber(summary.regularMarketDayLow),
        sourceCurrency: summary.currency || "USD",
        exchangeName: summary.fullExchangeName || summary.exchange || "",
        marketState: summary.marketState || "",
        marketCap: finiteNumber(summary.marketCap),
        volume: finiteNumber(summary.regularMarketVolume),
        averageVolume: finiteNumber(summary.averageDailyVolume3Month) ?? finiteNumber(summary.averageDailyVolume10Day),
        fiftyTwoWeekHigh: finiteNumber(summary.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: finiteNumber(summary.fiftyTwoWeekLow),
        preMarketChangePercent: finiteNumber(summary.preMarketChangePercent),
        postMarketChangePercent: finiteNumber(summary.postMarketChangePercent),
        trailingPE: finiteNumber(summary.trailingPE),
        forwardPE: finiteNumber(summary.forwardPE),
      };
    }

    quoteError = "Missing regular market fields";
  } catch (error) {
    quoteError = error instanceof Error ? error.message : String(error);
  }

  try {
    const period2 = new Date();
    const period1 = new Date(period2);
    period1.setDate(period1.getDate() - 7);

    const chart = await yahooFinance.chart(symbol, {
      period1: Math.floor(period1.getTime() / 1000),
      period2: Math.floor(period2.getTime() / 1000),
      interval: "1d",
    });

    const currentPrice = finiteNumber(chart.meta.regularMarketPrice) ?? 0;
    const previousPrice = finiteNumber(chart.meta.chartPreviousClose) ?? currentPrice;
    const lastTwoQuotes = (chart.quotes ?? [])
      .map((point) => finiteNumber(point.close))
      .filter((value): value is number => value != null)
      .slice(-2);
    const latestSessionQuote = [...(chart.quotes ?? [])]
      .reverse()
      .find((point) => finiteNumber(point.high) != null || finiteNumber(point.low) != null);

    return {
      primary: {
        source: "yahoo-chart",
        symbol,
        price: currentPrice,
        currency: chart.meta.currency || "USD",
      } satisfies MarketQuote,
      currentPrice,
      previousPrice: lastTwoQuotes.length >= 2 ? lastTwoQuotes[0] : previousPrice,
      dayHigh: finiteNumber(latestSessionQuote?.high),
      dayLow: finiteNumber(latestSessionQuote?.low),
      sourceCurrency: chart.meta.currency || "USD",
      exchangeName: chart.meta.exchangeName || "",
      marketState: "",
      marketCap: null,
      volume: null,
      averageVolume: null,
      fiftyTwoWeekHigh: null,
      fiftyTwoWeekLow: null,
      preMarketChangePercent: null,
      postMarketChangePercent: null,
      trailingPE: null,
      forwardPE: null,
    };
  } catch (error) {
    throw new Error(`Quote failed (${quoteError}), chart fallback failed (${String(error)})`);
  }
}

export async function getMarketQuote(
  symbol: string,
  targetCurrency: string,
  dateStr: string | null,
  getUsdRate: (currency: string) => Promise<number>,
  range?: string | null,
) {
  const normalizedRange = normalizeRange(range);
  const cacheKey = `${symbol}_${targetCurrency}_${dateStr || "latest"}_${normalizedRange}`;
  const nowMs = Date.now();
  const cached = quoteCache.get(cacheKey);

  if (cached && cached.expiresAt > nowMs) {
    return cached.data;
  }

  if (quotePromiseCache.has(cacheKey)) {
    return quotePromiseCache.get(cacheKey);
  }

  const fetchTask = (async () => {
    const checks: string[] = [];

    const cryptoSnapshot = !dateStr
      ? await fetchCoinGeckoSnapshot(symbol).catch((error) => {
          checks.push(error instanceof Error ? error.message : String(error));
          return null;
        })
      : null;

    if (cryptoSnapshot) {
      const fxFactor = await resolveFxFactor(
        "USD",
        targetCurrency,
        getUsdRate,
      );

      const price = cryptoSnapshot.price * fxFactor;
      const changePercent = cryptoSnapshot.changePercent ?? 0;

      const previousPrice =
        changePercent === -100
          ? price
          : price / (1 + changePercent / 100);

      const rangeSeries = await fetchRangeSeries(
        symbol,
        normalizedRange,
      ).catch(() => null);

      const finalData = {
        symbol,
        price: roundCryptoPrice(price),
        currentPrice: roundCryptoPrice(price),
        previousClose: roundCryptoPrice(previousPrice),
        dayHigh: null,
        dayLow: null,
        change: roundCryptoPrice(price - previousPrice) ?? 0,
        changePercent: round2(changePercent) ?? 0,
        changeRange: null,
        changePctRange: null,
        currency: targetCurrency,
        sourceCurrency: "USD",
        exchangeName: "CoinGecko aggregate market",
        marketState: "OPEN_24_7",
        marketCap:
          cryptoSnapshot.marketCap == null
            ? null
            : cryptoSnapshot.marketCap * fxFactor,
        volume:
          cryptoSnapshot.volume == null
            ? null
            : cryptoSnapshot.volume * fxFactor,
        averageVolume: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        preMarketChangePercent: null,
        postMarketChangePercent: null,
        trailingPE: null,
        forwardPE: null,
        date: new Date().toISOString().slice(0, 10),
        tradingDate:
          rangeSeries?.tradingDate ??
          (cryptoSnapshot.updatedAt == null
            ? new Date().toISOString().slice(0, 10)
            : new Date(cryptoSnapshot.updatedAt * 1000).toISOString().slice(0, 10)),
        asOf:
          cryptoSnapshot.updatedAt == null
            ? new Date().toISOString()
            : new Date(cryptoSnapshot.updatedAt * 1000).toISOString(),
        sparkline: rangeSeries?.sparkline ?? [],
        dataQuality: buildHealth(
          { source: "coingecko", symbol, price },
          [],
          checks,
          [],
        ),
      };

      quoteCache.set(cacheKey, {
        data: finalData,
        expiresAt: Date.now() + 20_000,
      });

      quotePromiseCache.delete(cacheKey);
      return finalData;
    }

    const unavailableSources: string[] = [];
    const fallbacks: MarketQuote[] = [];
    let primary: MarketQuote | null = null;
    let priceOnDate = 0;
    let currentPrice = 0;
    let previousPrice = 0;
    let dayHigh: number | null = null;
    let dayLow: number | null = null;
    let sourceCurrency = "USD";
    let exchangeName = "";
    let marketState = "";
    let marketCap: number | null = null;
    let volume: number | null = null;
    let averageVolume: number | null = null;
    let fiftyTwoWeekHigh: number | null = null;
    let fiftyTwoWeekLow: number | null = null;
    let preMarketChangePercent: number | null = null;
    let postMarketChangePercent: number | null = null;
    let trailingPE: number | null = null;
    let forwardPE: number | null = null;
    let asOf: string | null = null;
    let tradingDate: string | null = null;

    if (dateStr) {
      const targetDate = new Date(dateStr);
      const period1 = new Date(targetDate);
      const period2 = new Date(targetDate);
      period1.setDate(period1.getDate() - 5);
      period2.setDate(period2.getDate() + 5);

      const chart = await yahooFinance.chart(symbol, {
        period1: Math.floor(period1.getTime() / 1000),
        period2: Math.floor(Math.min(period2.getTime(), Date.now()) / 1000),
        interval: "1d",
      });

      const quotes = chart.quotes ?? [];
      const validQuotes = quotes.filter((point) => finiteNumber(point.close) != null);

      if (validQuotes.length === 0) {
        throw new Error(`No historical quote found for ${symbol} on ${dateStr}`);
      }

      let closest = validQuotes[0];
      let closestDiff = Math.abs(new Date(validQuotes[0].date).getTime() - targetDate.getTime());

      for (const quote of validQuotes.slice(1)) {
        const diff = Math.abs(new Date(quote.date).getTime() - targetDate.getTime());
        if (diff < closestDiff) {
          closest = quote;
          closestDiff = diff;
        }
      }

      const close = finiteNumber(closest.close) ?? 0;
      primary = {
        source: "yahoo-chart",
        symbol,
        price: close,
        currency: chart.meta.currency || "USD",
      };
      currentPrice = close;
      previousPrice = close;
      dayHigh = finiteNumber(closest.high);
      dayLow = finiteNumber(closest.low);
      priceOnDate = close;
      sourceCurrency = chart.meta.currency || "USD";
      exchangeName = chart.meta.exchangeName || "";
      asOf = closest.date ? new Date(closest.date).toISOString() : null;
      tradingDate = closest.date ? new Date(closest.date).toISOString().slice(0, 10) : null;
    } else {
      const snapshot = await resolveQuoteSnapshot(symbol);
      primary = snapshot.primary;
      currentPrice = snapshot.currentPrice;
      previousPrice = snapshot.previousPrice;
      dayHigh = snapshot.dayHigh;
      dayLow = snapshot.dayLow;
      priceOnDate = snapshot.currentPrice;
      sourceCurrency = snapshot.sourceCurrency;
      exchangeName = snapshot.exchangeName;
      marketState = snapshot.marketState;
      marketCap = snapshot.marketCap;
      volume = snapshot.volume;
      averageVolume = snapshot.averageVolume;
      fiftyTwoWeekHigh = snapshot.fiftyTwoWeekHigh;
      fiftyTwoWeekLow = snapshot.fiftyTwoWeekLow;
      preMarketChangePercent = snapshot.preMarketChangePercent;
      postMarketChangePercent = snapshot.postMarketChangePercent;
      trailingPE = snapshot.trailingPE;
      forwardPE = snapshot.forwardPE;
      asOf = new Date().toISOString();
    }

    if (!primary) {
      throw new Error(`No market quote resolved for ${symbol}`);
    }

    const fxFactor = await resolveFxFactor(sourceCurrency, targetCurrency, getUsdRate);
    const rangeSeries = !dateStr ? await fetchRangeSeries(symbol, normalizedRange).catch(() => null) : null;
    const convertedCurrentPrice = currentPrice * fxFactor;
    const convertedPreviousPrice = previousPrice * fxFactor;
    const convertedDayHigh = dayHigh == null ? null : dayHigh * fxFactor;
    const convertedDayLow = dayLow == null ? null : dayLow * fxFactor;
    const convertedPrice = priceOnDate * fxFactor;

    const change = convertedCurrentPrice - convertedPreviousPrice;
    const changePercent = convertedPreviousPrice > 0 ? (change / convertedPreviousPrice) * 100 : 0;

    if (Math.abs(changePercent) > MAX_DAILY_MOVE_PERCENT) {
      checks.push(`Unusual price move ${changePercent.toFixed(2)}%`);
    }

    const rangeStartPrice = rangeSeries?.startPrice != null ? rangeSeries.startPrice * fxFactor : null;
    const rangeEndPrice = rangeSeries?.endPrice != null ? rangeSeries.endPrice * fxFactor : null;
    const changeRange = rangeStartPrice != null && rangeEndPrice != null ? rangeEndPrice - rangeStartPrice : change;
    const changePctRange = rangeStartPrice != null && rangeStartPrice > 0
      ? ((changeRange ?? 0) / rangeStartPrice) * 100
      : changePercent;

    const finalData = {
      symbol,
      price: round2(convertedPrice),
      currentPrice: round2(convertedCurrentPrice),
      previousClose: round2(convertedPreviousPrice),
      dayHigh: round2(convertedDayHigh),
      dayLow: round2(convertedDayLow),
      change: round2(change) ?? 0,
      changePercent: round2(changePercent) ?? 0,
      changeRange: round2(changeRange),
      changePctRange: round2(changePctRange),
      currency: targetCurrency,
      sourceCurrency,
      exchangeName,
      marketState,
      marketCap,
      volume,
      averageVolume,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow,
      preMarketChangePercent,
      postMarketChangePercent,
      trailingPE,
      forwardPE,
      date: dateStr || new Date().toISOString().slice(0, 10),
      tradingDate: rangeSeries?.tradingDate || tradingDate,
      asOf: rangeSeries?.asOf || asOf,
      sparkline: rangeSeries?.sparkline ?? [],
      dataQuality: buildHealth(
        { ...primary, price: convertedPrice },
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
