import { NextRequest, NextResponse } from "next/server";
import { CalendarCategory, CalendarImpact, MarketCalendarEvent } from "@/types/calendar";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function impact(value: unknown): CalendarImpact {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("high") || normalized === "3") return "High";
  if (normalized.includes("medium") || normalized === "2") return "Medium";
  return "Low";
}

function id(category: string, date: string, name: string, index: number) {
  return `${category}-${date}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`;
}

function baseEvent(
  category: CalendarCategory,
  date: string,
  event: string,
  index: number,
  overrides: Partial<MarketCalendarEvent> = {},
): MarketCalendarEvent {
  return {
    id: id(category, date, event, index),
    category,
    date,
    time: "08:30",
    event,
    country: "United States",
    countryCode: "US",
    impact: "Medium",
    sector: "Broad Market",
    eventType: category,
    volatilityScore: 55,
    affectedSectors: ["Broad Market"],
    ...overrides,
  };
}

function fallbackEvents(category: CalendarCategory, from: string, to: string): MarketCalendarEvent[] {
  const dates = [from, addDays(from, 1), addDays(from, 2), addDays(from, 3)].map(date => date > to ? to : date);

  if (category === "economic") {
    return [
      baseEvent(category, dates[0], "Consumer Price Index (CPI)", 0, { time: "08:30", impact: "High", forecast: "0.3%", previous: "0.2%", eventType: "Inflation", volatilityScore: 92, affectedSectors: ["Technology", "Banks", "Utilities"] }),
      baseEvent(category, dates[0], "Initial Jobless Claims", 1, { time: "08:30", forecast: "238K", previous: "242K", eventType: "Employment", volatilityScore: 64, affectedSectors: ["Consumer", "Industrials"] }),
      baseEvent(category, dates[0], "Manufacturing PMI", 2, { time: "10:00", impact: "Medium", forecast: "51.2", previous: "50.9", eventType: "PMI", volatilityScore: 58, affectedSectors: ["Industrials", "Materials"] }),
      baseEvent(category, dates[1], "FOMC Interest Rate Decision", 3, { time: "14:00", impact: "High", forecast: "4.50%", previous: "4.50%", eventType: "Central Bank", volatilityScore: 98, affectedSectors: ["Technology", "Banks", "Real Estate"] }),
      baseEvent(category, dates[1], "Retail Sales", 4, { time: "08:30", impact: "Medium", forecast: "0.4%", previous: "0.1%", eventType: "Consumption", volatilityScore: 61, affectedSectors: ["Consumer", "Retail"] }),
      baseEvent(category, dates[2], "GDP Growth Rate", 5, { time: "08:30", impact: "High", forecast: "2.4%", previous: "2.1%", eventType: "Growth", volatilityScore: 84, affectedSectors: ["Broad Market"] }),
    ];
  }

  if (category === "earnings") {
    return [
      baseEvent(category, dates[0], "NVIDIA Quarterly Earnings", 0, { time: "16:05", symbol: "NVDA", company: "NVIDIA Corporation", session: "After Market Close", epsEstimate: 0.93, revenueEstimate: 43_200_000_000, impact: "High", sector: "Technology", eventType: "Earnings", volatilityScore: 94, affectedSectors: ["Semiconductors", "Technology"] }),
      baseEvent(category, dates[0], "Microsoft Quarterly Earnings", 1, { time: "16:10", symbol: "MSFT", company: "Microsoft Corporation", session: "After Market Close", epsEstimate: 3.22, revenueEstimate: 68_400_000_000, impact: "High", sector: "Technology", eventType: "Earnings", volatilityScore: 88, affectedSectors: ["Software", "Cloud"] }),
      baseEvent(category, dates[1], "Apple Quarterly Earnings", 2, { time: "16:30", symbol: "AAPL", company: "Apple Inc.", session: "After Market Close", epsEstimate: 1.62, revenueEstimate: 94_100_000_000, impact: "High", sector: "Technology", eventType: "Earnings", volatilityScore: 91, affectedSectors: ["Hardware", "Technology"] }),
      baseEvent(category, dates[1], "JPMorgan Quarterly Earnings", 3, { time: "07:00", symbol: "JPM", company: "JPMorgan Chase & Co.", session: "Before Market Open", epsEstimate: 4.12, revenueEstimate: 41_800_000_000, impact: "Medium", sector: "Financials", eventType: "Earnings", volatilityScore: 72, affectedSectors: ["Banks", "Financials"] }),
    ];
  }

  if (category === "dividends") {
    return [
      baseEvent(category, dates[0], "Apple Dividend Ex-Date", 0, { symbol: "AAPL", company: "Apple Inc.", exDate: dates[0], payDate: addDays(dates[0], 14), dividend: 0.25, yield: 0.42, sector: "Technology", eventType: "Dividend", volatilityScore: 28, affectedSectors: ["Technology"] }),
      baseEvent(category, dates[1], "Microsoft Dividend Ex-Date", 1, { symbol: "MSFT", company: "Microsoft Corporation", exDate: dates[1], payDate: addDays(dates[1], 21), dividend: 0.83, yield: 0.69, sector: "Technology", eventType: "Dividend", volatilityScore: 31, affectedSectors: ["Technology"] }),
      baseEvent(category, dates[2], "JPMorgan Dividend Ex-Date", 2, { symbol: "JPM", company: "JPMorgan Chase & Co.", exDate: dates[2], payDate: addDays(dates[2], 18), dividend: 1.25, yield: 2.14, sector: "Financials", eventType: "Dividend", volatilityScore: 35, affectedSectors: ["Banks"] }),
    ];
  }

  if (category === "splits") {
    return [
      baseEvent(category, dates[1], "Broadcom Stock Split", 0, { symbol: "AVGO", company: "Broadcom Inc.", ratio: "10:1", exDate: dates[1], impact: "Medium", sector: "Technology", eventType: "Stock Split", volatilityScore: 57, affectedSectors: ["Semiconductors"] }),
      baseEvent(category, dates[2], "Chipotle Stock Split", 1, { symbol: "CMG", company: "Chipotle Mexican Grill", ratio: "50:1", exDate: dates[2], impact: "Medium", sector: "Consumer", eventType: "Stock Split", volatilityScore: 49, affectedSectors: ["Restaurants"] }),
    ];
  }

  if (category === "ipo") {
    return [
      baseEvent(category, dates[1], "Technology Growth IPO", 0, { symbol: "TGRO", company: "Technology Growth Holdings", exchange: "NASDAQ", priceRange: "$18 - $21", impact: "Medium", sector: "Technology", eventType: "IPO", volatilityScore: 68, affectedSectors: ["Technology"] }),
      baseEvent(category, dates[3], "Healthcare Innovation IPO", 1, { symbol: "HCIN", company: "Healthcare Innovation Labs", exchange: "NYSE", priceRange: "$14 - $17", impact: "Low", sector: "Healthcare", eventType: "IPO", volatilityScore: 52, affectedSectors: ["Healthcare"] }),
    ];
  }

  if (category === "options") {
    return [
      baseEvent(category, dates[0], "Monthly Options Expiration (OPEX)", 0, { time: "16:00", impact: "High", eventType: "Monthly OPEX", volatilityScore: 86, affectedSectors: ["Broad Market"] }),
      baseEvent(category, dates[2], "Quarterly Index Rebalancing", 1, { time: "16:00", impact: "High", eventType: "Quarterly OPEX", volatilityScore: 89, affectedSectors: ["Indices", "Broad Market"] }),
      baseEvent(category, dates[3], "LEAPS Expiration", 2, { time: "16:00", impact: "Medium", eventType: "LEAPS", volatilityScore: 66, affectedSectors: ["Broad Market"] }),
    ];
  }

  return [
    baseEvent(category, dates[0], "NYSE Market Holiday", 0, { country: "United States", countryCode: "US", exchange: "NYSE / NASDAQ", impact: "Low", eventType: "Market Holiday", volatilityScore: 18 }),
    baseEvent(category, dates[1], "London Stock Exchange Holiday", 1, { country: "United Kingdom", countryCode: "GB", exchange: "LSE", impact: "Low", eventType: "Market Holiday", volatilityScore: 16 }),
    baseEvent(category, dates[2], "Tokyo Stock Exchange Holiday", 2, { country: "Japan", countryCode: "JP", exchange: "TSE", impact: "Low", eventType: "Market Holiday", volatilityScore: 20 }),
  ];
}

async function fetchFinnhub(category: CalendarCategory, from: string, to: string, token: string): Promise<MarketCalendarEvent[]> {
  const endpoint = category === "economic" ? "calendar/economic" : category === "earnings" ? "calendar/earnings" : category === "ipo" ? "calendar/ipo" : null;
  if (!endpoint) return [];
  const response = await fetch(`${FINNHUB_BASE}/${endpoint}?from=${from}&to=${to}&token=${token}`, { next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`Finnhub ${response.status}`);
  const data = await response.json();
  const rows = category === "economic" ? data.economicCalendar : category === "earnings" ? data.earningsCalendar : data.ipoCalendar;
  if (!Array.isArray(rows)) return [];

  return rows.map((row: any, index: number) => {
    const dateValue = String(row.date || row.time || from).slice(0, 10);
    const timeValue = String(row.time || "08:30").match(/\d{2}:\d{2}/)?.[0] || "08:30";
    if (category === "earnings") {
      const session = row.hour === "bmo" ? "Before Market Open" : row.hour === "amc" ? "After Market Close" : "During Market";
      return baseEvent(category, dateValue, `${row.symbol} Earnings`, index, { time: timeValue, symbol: row.symbol, company: row.symbol, session, epsEstimate: row.epsEstimate, epsActual: row.epsActual, revenueEstimate: row.revenueEstimate, revenueActual: row.revenueActual, surprise: row.epsEstimate && row.epsActual ? ((row.epsActual - row.epsEstimate) / Math.abs(row.epsEstimate)) * 100 : null, impact: "High", sector: "Equities", eventType: "Earnings", volatilityScore: 82 });
    }
    if (category === "ipo") {
      return baseEvent(category, dateValue, `${row.name || row.symbol} IPO`, index, { symbol: row.symbol, company: row.name, exchange: row.exchange, priceRange: row.price || `${row.priceFrom ?? ""} - ${row.priceTo ?? ""}`, eventType: "IPO", volatilityScore: 64 });
    }
    return baseEvent(category, dateValue, row.event || "Economic Event", index, { time: timeValue, country: row.country || "Global", countryCode: row.country || "GL", impact: impact(row.impact), actual: row.actual?.toString(), forecast: (row.estimate ?? row.forecast)?.toString(), previous: row.prev?.toString(), eventType: row.event || "Economic", volatilityScore: impact(row.impact) === "High" ? 90 : impact(row.impact) === "Medium" ? 60 : 30 });
  });
}

export async function GET(request: NextRequest) {
  const category = (request.nextUrl.searchParams.get("category") || "economic") as CalendarCategory;
  const from = request.nextUrl.searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const to = request.nextUrl.searchParams.get("to") || from;
  const token = process.env.FINNHUB_API_KEY;
  let events: MarketCalendarEvent[] = [];
  let source = "Curated fallback";

  if (token) {
    try {
      events = await fetchFinnhub(category, from, to, token);
      if (events.length) source = "Finnhub";
    } catch {
      events = [];
    }
  }

  if (!events.length) events = fallbackEvents(category, from, to);
  events = events.filter(event => event.date >= from && event.date <= to);
  return NextResponse.json({ events, source, updatedAt: new Date().toISOString() });
}
