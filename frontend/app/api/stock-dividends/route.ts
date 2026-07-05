process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import YahooFinanceClass from 'yahoo-finance2';
const yahooFinance = new YahooFinanceClass();
import { NextRequest, NextResponse } from 'next/server';

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
  const normalized = symbol.trim().toUpperCase();
  const alias = SYMBOL_ALIASES[normalized] ?? normalized;
  if (alias.includes(".")) return [alias];
  if (/^\d{4,6}$/.test(alias)) return [`${alias}.TW`, `${alias}.TWO`, alias];
  return [alias, `${alias}.VN`];
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
        const result = await yahooFinance.chart(candidate, {
          period1,
          period2,
          interval: '1mo',
        });

        const dividendEvents = result?.events?.dividends;

        if (!dividendEvents || dividendEvents.length === 0) {
          return NextResponse.json([]);
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

        return NextResponse.json(dividends);
      } catch (error) {
        lastError = error;
      }
    }

    console.error(`[stock-dividends] Failed to fetch dividends for ${symbol}:`, lastError);
    return NextResponse.json([]);
  } catch (error) {
    console.error(`[stock-dividends] Outer failure for ${symbol}:`, error);
    return NextResponse.json([]);
  }
}
