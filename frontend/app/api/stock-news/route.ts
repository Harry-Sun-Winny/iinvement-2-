import { NextRequest, NextResponse } from "next/server";

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

// RSS feeds cho từng nguồn
const RSS_SOURCES = [
  { name: "Reuters", url: (_q: string) => `https://feeds.reuters.com/reuters/businessNews` },
  { name: "CNBC", url: (_q: string) => `https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114` },
  { name: "Bloomberg", url: (_q: string) => `https://feeds.bloomberg.com/markets/news.rss` },
];

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
    `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
  );
  if (!res.ok) throw new Error("Finnhub failed");
  const data = await res.json();
  return (data as any[]).slice(0, 5).map((n: any) => ({
    title: n.headline,
    summary: n.summary || "",
    url: n.url,
    source: n.source || "Finnhub",
    publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : new Date().toISOString(),
    symbol,
  }));
}

async function parseRSS(xml: string, sourceName: string, symbol: string) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 3);
  return items.map(m => {
    const content = m[1];
    const title =
      content.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ??
      content.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
    const url =
      content.match(/<link>(.*?)<\/link>/)?.[1] ??
      content.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] ?? "";
    const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? "";
    const desc =
      content.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ??
      content.match(/<description>(.*?)<\/description>/)?.[1] ?? "";
    return {
      title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
      summary: desc.replace(/<[^>]+>/g, "").slice(0, 200),
      url,
      source: sourceName,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      symbol,
    };
  }).filter(n => n.title && n.url);
}

async function fetchRSSNews(symbol: string): Promise<NewsItem[]> {
  const results: NewsItem[] = [];
  await Promise.all(RSS_SOURCES.map(async (src) => {
    try {
      const res = await fetch(src.url(symbol), {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 1800 },
      });
      if (!res.ok) return;
      const xml = await res.text();
      const items = await parseRSS(xml, src.name, symbol);
      results.push(...items);
    } catch {}
  }));
  return results;
}

async function crawlPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
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

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const withCrawl = req.nextUrl.searchParams.get("crawl") === "1";
  const compact = req.nextUrl.searchParams.get("compact") === "1";

  if (!symbol) return NextResponse.json({ error: "No symbol" }, { status: 400 });

  // Nếu crawl=1 → trả về profile data (tên, logo, marketCap)
  if (withCrawl) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=summaryProfile,price`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      const data = await res.json();
        const price = data.quoteSummary?.result?.[0]?.price;
      const profile = data.quoteSummary?.result?.[0]?.summaryProfile;
      return NextResponse.json({
        name: price?.longName ?? price?.shortName ?? symbol,
        logo: getLogoUrl(profile?.website),
        marketCap: price?.marketCap?.raw ? Math.round(price.marketCap.raw / 1_000_000) : 0,
        currency: price?.currency ?? "USD",
      } as SymbolProfile);
    } catch {
      return NextResponse.json({ name: symbol, logo: "", marketCap: 0, currency: "USD" });
    }
  }

  // Mặc định → trả về tin tức
  let news: any[] = [];

  try {
    news = await fetchFinnhubNews(symbol);
  } catch {}

  if (news.length < 3) {
    try {
      const rssNews = await fetchRSSNews(symbol);
      news = [...news, ...rssNews];
    } catch {}
  }

  // Crawl thêm nội dung chi tiết nếu cần
  if (news.length > 0 && !compact) {
    const enriched = await Promise.all(news.slice(0, 5).map(async (n) => {
      if (n.summary && n.summary.length > 100) return n;
      const content = await crawlPage(n.url);
      return { ...n, summary: content || n.summary };
    }));
    news = [...enriched, ...news.slice(5)];
  }

  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  news = news.filter((item) => {
    const publishedAt = new Date(item.publishedAt).getTime();
    return Number.isFinite(publishedAt) && publishedAt >= twelveHoursAgo;
  });
  news.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return NextResponse.json(news.slice(0, 8));
}
