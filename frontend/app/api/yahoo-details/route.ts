import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
const yahooFinance = new YahooFinanceClass();

function num(val: any): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val === "object" && typeof val.raw === "number") return val.raw;
  return null;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol")?.trim().toUpperCase();
  if (!symbol) return NextResponse.json({ error: "No symbol" }, { status: 400 });

  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: [
        "summaryDetail",
        "defaultKeyStatistics",
        "financialData",
        "recommendationTrend",
        "price"
      ]
    });

    const sd = (summary.summaryDetail || {}) as any;
    const dks = (summary.defaultKeyStatistics || {}) as any;
    const fd = (summary.financialData || {}) as any;
    const rt = (summary.recommendationTrend || {}) as any;
    const price = (summary.price || {}) as any;

    const trend = rt.trend?.[0] || {};

    const roeVal = num(fd.returnOnEquity);
    const yieldVal = num(sd.dividendYield);
    const exDiv = num(sd.exDividendDate) || num(dks.exDividendDate);

    return NextResponse.json({
      name: price.shortName || price.longName || symbol,
      pe: num(sd.trailingPE) || num(dks.trailingPE) || null,
      forwardPe: num(sd.forwardPE) || null,
      pb: num(sd.priceToBook) || null,
      ps: num(sd.priceToSalesTrailing12Months) || null,
      roe: roeVal !== null ? roeVal * 100 : null,
      eps: num(dks.trailingEps) || null,
      beta: num(sd.beta) || null,
      dividendYield: yieldVal !== null ? yieldVal * 100 : null,
      annualDividend: num(sd.trailingAnnualDividendRate) || num(sd.dividendRate) || null,
      recommendation: fd.recommendationKey || null,
      buyCount: (trend.buy || 0) + (trend.strongBuy || 0),
      holdCount: trend.hold || 0,
      sellCount: (trend.sell || 0) + (trend.strongSell || 0),
      targetPrice: num(fd.targetMeanPrice) || null,
      peg: num(dks.pegRatio) || num(sd.pegRatio) || null,
      evEbitda: num(fd.enterpriseValueToEbitda) || num(dks.enterpriseValueToEbitda) || null,
      exDividendDate: exDiv ? new Date(exDiv * 1000).toLocaleDateString("en-US") : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch Yahoo details" }, { status: 500 });
  }
}
