import YahooFinanceClass from 'yahoo-finance2';
const yahooFinance = new YahooFinanceClass();
import { NextRequest, NextResponse } from 'next/server';
import { marketRequestCache } from '../_lib/async-ttl-cache';

const DIVIDEND_TTL_MS = 6 * 60 * 60_000;
const DIVIDEND_RESPONSE_HEADERS = {
  'Cache-Control': 'public, max-age=1800, s-maxage=21600, stale-while-revalidate=86400',
};

interface DividendRecord {
  symbol: string;
  recordDate: string;
  paymentDate: string;
  dividendRate: number;
  type: string;
}

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

function getSymbolCandidates(symbol: string) {
  const raw = symbol.trim().toUpperCase();
  const normalized = raw.replace(/[\s.,]+$/, "");
  const alias = SYMBOL_ALIASES[normalized] ?? normalized;
  const candidates: string[] = [];

  const addCandidate = (cand?: string | null) => {
    if (!cand) return;
    const clean = cand.trim().toUpperCase();
    if (clean && !candidates.includes(clean)) candidates.push(clean);
  };

  if (raw !== normalized) addCandidate(normalized);
  addCandidate(alias);
  if (alias.includes(".")) {
    addCandidate(alias.replace(/\./g, "-"));
    addCandidate(alias.replace(/\./g, ""));
    return candidates;
  }
  if (/^\d{4,6}$/.test(alias)) {
    addCandidate(`${alias}.TW`);
    addCandidate(`${alias}.TWO`);
    addCandidate(alias);
    return candidates;
  }
  addCandidate(alias);
  addCandidate(`${alias}.VN`);
  return candidates;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const startDate = searchParams.get('startDate');

  if (!symbol || !startDate) {
    return NextResponse.json(
      { error: 'Missing required query parameters: symbol, startDate' },
      { status: 400 }
    );
  }

  try {
    const period1 = new Date(startDate);
    const period2 = new Date();

    if (isNaN(period1.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startDate format. Use ISO date string (e.g. 2018-01-01).' },
        { status: 400 }
      );
    }

    let lastError: unknown = null;
    for (const candidate of getSymbolCandidates(symbol)) {
      try {
        const result = await marketRequestCache.getOrCreate(
          `dividends:${candidate}:${startDate}`,
          DIVIDEND_TTL_MS,
          () => yahooFinance.chart(candidate, {
            period1,
            period2,
            interval: '1mo',
          }),
        );

        const dividendEvents = result?.events?.dividends;

        if (!dividendEvents || dividendEvents.length === 0) {
          return NextResponse.json([], { headers: DIVIDEND_RESPONSE_HEADERS });
        }

        const dividends: DividendRecord[] = dividendEvents.map(
          (event: { date: Date; amount: number }) => {
            const exDividendDate = new Date(event.date).toISOString().split('T')[0];

            return {
              symbol: symbol.toUpperCase(),
              recordDate: exDividendDate,
              paymentDate: exDividendDate,
              dividendRate: parseFloat(event.amount.toFixed(4)),
              type: 'CASH',
            };
          }
        );

        return NextResponse.json(dividends, { headers: DIVIDEND_RESPONSE_HEADERS });
      } catch (error) {
        lastError = error;
      }
    }

    console.error(`[stock-dividends] Failed to fetch dividends for ${symbol}:`, lastError);
    return NextResponse.json([], { headers: DIVIDEND_RESPONSE_HEADERS });
  } catch (error) {
    console.error(`[stock-dividends] Outer failure for ${symbol}:`, error);
    return NextResponse.json([], { headers: DIVIDEND_RESPONSE_HEADERS });
  }
}
