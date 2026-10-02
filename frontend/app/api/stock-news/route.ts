import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
import { marketRequestCache } from "../_lib/async-ttl-cache";
const yahooFinance = new YahooFinanceClass();
type NewsItem = {
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  symbol: string;
};

type SymbolProfile = {
  name: string;
  logo: string;
  marketCap: number;
  currency: string;
};

const FINNHUB_KEY = process.env.FINNHUB_API_KEY?.trim() ?? "";
const NEWS_TTL_MS = 5 * 60_000;
const PROFILE_TTL_MS = 60 * 60_000;
const NEWS_RESPONSE_HEADERS = {
  "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800",
};

function getLogoUrl(website?: string) {
  if (!website) return "";
  const normalized = website.replace(/https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  return normalized ? `https://logo.clearbit.com/${normalized}` : "";
}

async function fetchFinnhubNews(symbol: string): Promise<NewsItem[]> {
  if (!FINNHUB_KEY) throw new Error("Finnhub API key missing");
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const res = await fetch(
    `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`,
    { next: { revalidate: 900 }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error("Finnhub failed");
  const data = await res.json();
  return (data as any[]).slice(0, 5).map((n: any) => ({
    title: n.headline,
    summary: n.summary || "",
    url: n.url,
    source: n.source || "Finnhub",
    publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : "",
    symbol,
  }));
}

async function fetchYahooNews(symbol: string): Promise<NewsItem[]> {
  const data = await yahooFinance.search(symbol, { quotesCount: 5, newsCount: 8 });
  return ((data as any).news ?? []).map((item: any) => ({
    title: String(item.title ?? "").trim(),
    summary: String(item.summary ?? "").trim(),
    url: String(item.link ?? item.url ?? "").trim(),
    source: String(item.publisher ?? "Yahoo Finance").trim(),
    publishedAt: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : "",
    symbol,
  })).filter((item: NewsItem) => item.title && item.url && item.publishedAt);
}

async function crawlPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      signal: AbortSignal.timeout(6000),
    });
    const html = await res.text();
    const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
      .map(m => m[1].replace(/<[^>]+>/g, "").trim())
      .filter(p => p.length > 50)
      .slice(0, 5)
      .join(" ");
    return paragraphs.slice(0, 500);
  } catch {
    return "";
  }
}

async function loadNews(symbol: string, compact: boolean): Promise<NewsItem[]> {
  let news: NewsItem[] = [];

  try { news = await fetchFinnhubNews(symbol); } catch {}
  if (news.length < 3) {
    try { news = [...news, ...(await fetchYahooNews(symbol))]; } catch {}
  }

  if (news.length > 0 && !compact) {
    const enriched = await Promise.all(news.slice(0, 5).map(async (item) => {
      if (item.summary && item.summary.length > 100) return item;
      const content = await crawlPage(item.url);
      return { ...item, summary: content || item.summary };
    }));
    news = [...enriched, ...news.slice(5)];
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  news = news.filter((item) => {
    const publishedAt = new Date(item.publishedAt).getTime();
    return Number.isFinite(publishedAt) && publishedAt >= sevenDaysAgo;
  });
  news.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return Array.from(
    new Map(news.map((item) => [item.url.replace(/[?#].*$/, ""), item])).values(),
  ).slice(0, 8);
}

export async function GET(req: NextRequest) {
  const rawSymbol = req.nextUrl.searchParams.get("symbol");
  const withCrawl = req.nextUrl.searchParams.get("crawl") === "1";
  const compact = req.nextUrl.searchParams.get("compact") === "1";

  if (!rawSymbol) return NextResponse.json({ error: "No symbol" }, { status: 400 });
  const normalizedSymbol = rawSymbol.trim().toUpperCase().replace(/[\s.,]+$/, "");

  // Nếu crawl=1 → trả về profile data (tên, logo, marketCap)
  if (withCrawl) {
    try {
      const data = await marketRequestCache.getOrCreate(
        `news-profile:${normalizedSymbol}`,
        PROFILE_TTL_MS,
        () => yahooFinance.quoteSummary(normalizedSymbol, { modules: ['summaryProfile', 'price'] }),
      );
      const price = data.price;
      const profile = data.summaryProfile;
      return NextResponse.json({
        name: price?.longName ?? price?.shortName ?? normalizedSymbol,
        logo: getLogoUrl(profile?.website),
        marketCap: price?.marketCap ? Math.round(price.marketCap / 1_000_000) : 0,
        currency: price?.currency ?? "USD",
      } as SymbolProfile);
    } catch {
      return NextResponse.json({ name: normalizedSymbol, logo: "", marketCap: 0, currency: "USD" });
    }
  }

  const news = await marketRequestCache.getOrCreate(
    `news:${normalizedSymbol}:${compact ? "compact" : "full"}`,
    NEWS_TTL_MS,
    () => loadNews(normalizedSymbol, compact),
  );
  return NextResponse.json(news, { headers: NEWS_RESPONSE_HEADERS });
}
