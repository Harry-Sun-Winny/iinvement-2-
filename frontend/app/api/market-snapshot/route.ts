import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Quote = { symbol: string; price: number | null; change: number | null; changePercent: number | null; volume: number | null };
type Snapshot = { quotes: Record<string, Quote>; updatedAt: string; };

const TTL_MS = 20_000;
const pending = new Map<string, Promise<Quote[]>>();
const snapshots = new Map<string, { expiresAt: number; snapshot: Snapshot }>();

function safeSymbols(value: string | null) {
  return [...new Set((value ?? "").split(",").map((symbol) => symbol.trim().toUpperCase()))].filter(Boolean);
}

async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const query = new URLSearchParams({ symbols: symbols.join(",") });
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000"}/api/finance/quote?${query}`);
  if (!response.ok) throw new Error("Quote provider unavailable");
  const payload = await response.json();
  const records = Array.isArray(payload) ? payload : payload.data || [];
  return records.map((item: Record<string, unknown>) => ({
    symbol: String(item.symbol ?? "").toUpperCase(),
    price: Number(item.price) || null,
    change: Number(item.change) || null,
    changePercent: Number(item.changePercent) || null,
    volume: Number(item.volume) || null,
  }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbols = safeSymbols(searchParams.get("symbols"));
  
  if (symbols.length === 0) {
    return NextResponse.json({ error: "Missing or invalid symbols" }, { status: 400 });
  }

  const now = Date.now();
  const missing: string[] = [];
  const result: Record<string, Quote> = {};

  for (const sym of symbols) {
    const cached = snapshots.get(sym);
    if (cached && cached.expiresAt > now) {
      result[sym] = cached.snapshot.quotes[sym];
    } else {
      missing.push(sym);
    }
  }

  if (missing.length > 0) {
    const batchKey = missing.join(",");
    let fetchPromise = pending.get(batchKey);
    
    if (!fetchPromise) {
      fetchPromise = fetchQuotes(missing).finally(() => pending.delete(batchKey));
      pending.set(batchKey, fetchPromise);
    }

    try {
      const fetched = await fetchPromise;
      for (const quote of fetched) {
        result[quote.symbol] = quote;
        snapshots.set(quote.symbol, {
          expiresAt: now + TTL_MS,
          snapshot: { quotes: { [quote.symbol]: quote }, updatedAt: new Date().toISOString() }
        });
      }
    } catch (error) {
      console.error("[market-snapshot] fetchQuotes error:", error);
    }
  }

  return NextResponse.json({
    quotes: result,
    updatedAt: new Date().toISOString(),
  } satisfies Snapshot);
}
