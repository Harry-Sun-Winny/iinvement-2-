process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { NextRequest, NextResponse } from "next/server";
import YahooFinanceClass from "yahoo-finance2";
const yahooFinance = new YahooFinanceClass({ suppressNotices: ['yahooSurvey'] });

const FMP_API_KEY = process.env.FMP_API_KEY || "BBBZUthjQrGGIUbKZqpk03HcS1w4r1si";
const FMP_BASE = "https://financialmodelingprep.com/stable";

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function fmpFetch(path: string, symbol: string) {
  const url = `${FMP_BASE}/${path}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(FMP_API_KEY)}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function fetchFmpFundamentals(symbol: string) {
  const [profile, ratios, metrics] = await Promise.all([
    fmpFetch("profile", symbol),
    fmpFetch("ratios", symbol),
    fmpFetch("key-metrics", symbol),
  ]);

  const result: Record<string, any> = { symbol };

  if (profile) {
    result.name = profile.companyName || profile.companyNameLong || profile.name;
    result.sector = profile.sector;
    result.industry = profile.industry;
    result.country = profile.country;
    result.exchange = profile.exchangeShortName || profile.exchange;
    result.marketCap = finiteNumber(profile.mktCap ?? profile.marketCap);
    result.beta = finiteNumber(profile.beta);
    result.annualDividend = finiteNumber(profile.lastDiv ?? profile.dividendPerShare);
  }

  if (ratios) {
    result.pe = finiteNumber(ratios.priceEarningsRatioTTM ?? ratios.priceToEarningsRatio ?? ratios.priceEarningsRatio);
    result.forwardPe = finiteNumber(ratios.priceEarningsToGrowthRatioTTM ?? ratios.priceToEarningsGrowthRatio);
    result.pb = finiteNumber(ratios.priceToBookRatioTTM ?? ratios.priceToBookRatio);
    result.ps = finiteNumber(ratios.priceToSalesRatioTTM ?? ratios.priceToSalesRatio);
    result.dividendYield = finiteNumber(ratios.dividendYieldTTM ?? ratios.dividendYield);
  }

  if (metrics) {
    result.enterpriseValue = finiteNumber(metrics.enterpriseValueTTM ?? metrics.enterpriseValue);
    // ROE and ROIC from key-metrics
    result.roe = finiteNumber(metrics.returnOnEquity);
    result.roic = finiteNumber(metrics.returnOnInvestedCapital ?? metrics.returnOnCapitalEmployed);
  }

  return result;
}

async function fetchYahooData(symbol: string) {
  const result: Record<string, any> = {};

  // Fetch quoteSummary for analyst consensus, EPS, ROE, and target prices
  try {
    const summary = await yahooFinance.quoteSummary(symbol, {
      modules: ['financialData', 'defaultKeyStatistics'],
    });

    const fd = summary.financialData;
    const ks = summary.defaultKeyStatistics;

    if (fd) {
      // Analyst consensus
      result.recommendation = fd.recommendationKey?.toUpperCase() || null;
      result.numberOfAnalysts = finiteNumber(fd.numberOfAnalystOpinions);
      result.targetPrice = finiteNumber(fd.targetMeanPrice);
      result.targetHigh = finiteNumber(fd.targetHighPrice);
      result.targetLow = finiteNumber(fd.targetLowPrice);

      // Approximate buy/hold/sell from recommendationMean (1=strongBuy, 5=sell)
      // and numberOfAnalystOpinions
      const mean = finiteNumber(fd.recommendationMean);
      const total = finiteNumber(fd.numberOfAnalystOpinions) ?? 0;
      if (mean != null && total > 0) {
        // Map mean score to buy/hold/sell distribution
        if (mean <= 2.0) {
          result.buyCount = Math.round(total * 0.75);
          result.holdCount = Math.round(total * 0.20);
          result.sellCount = total - result.buyCount - result.holdCount;
        } else if (mean <= 3.0) {
          result.buyCount = Math.round(total * 0.40);
          result.holdCount = Math.round(total * 0.45);
          result.sellCount = total - result.buyCount - result.holdCount;
        } else {
          result.buyCount = Math.round(total * 0.15);
          result.holdCount = Math.round(total * 0.35);
          result.sellCount = total - result.buyCount - result.holdCount;
        }
      }

      // ROE fallback from Yahoo if FMP didn't have it
      if (fd.returnOnEquity != null) {
        result.yahooRoe = finiteNumber(fd.returnOnEquity);
      }
    }

    if (ks) {
      result.eps = finiteNumber(ks.trailingEps);
      result.forwardEps = finiteNumber(ks.forwardEps);
    }
  } catch { /* ignore quoteSummary errors */ }

  // Fetch quote for current price
  try {
    const quote = await yahooFinance.quote(symbol);
    if (quote) {
      result.quote = {
        price: finiteNumber(quote.regularMarketPrice),
        timestamp: new Date().toISOString(),
      };
    }
  } catch { /* ignore */ }

  // Fetch 6-month history
  try {
    const period1 = new Date();
    period1.setMonth(period1.getMonth() - 6);

    const chart = await yahooFinance.chart(symbol, {
      period1: Math.floor(period1.getTime() / 1000),
      period2: Math.floor(Date.now() / 1000),
      interval: "1d",
    });

    const quotes = chart.quotes ?? [];
    result.historicalPrices = quotes
      .map((q) => {
        const close = finiteNumber(q.close);
        if (close == null) return null;
        return {
          date: new Date(q.date).toISOString().slice(0, 10),
          close,
        };
      })
      .filter(Boolean);
  } catch { /* ignore */ }

  return result;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "No symbol" }, { status: 400 });
  }

  try {
    const [fundamentals, yahooData] = await Promise.all([
      fetchFmpFundamentals(symbol),
      fetchYahooData(symbol),
    ]);

    // Merge: FMP fundamentals first, then Yahoo data fills in gaps
    const result: Record<string, any> = { ...fundamentals };

    // Yahoo data fills gaps
    if (yahooData.eps != null && result.eps == null) result.eps = yahooData.eps;
    if (yahooData.forwardEps != null) result.forwardEps = yahooData.forwardEps;
    if (yahooData.yahooRoe != null && result.roe == null) result.roe = yahooData.yahooRoe;
    if (yahooData.recommendation != null) result.recommendation = yahooData.recommendation;
    if (yahooData.buyCount != null) result.buyCount = yahooData.buyCount;
    if (yahooData.holdCount != null) result.holdCount = yahooData.holdCount;
    if (yahooData.sellCount != null) result.sellCount = yahooData.sellCount;
    if (yahooData.targetPrice != null && result.targetPrice == null) result.targetPrice = yahooData.targetPrice;
    if (yahooData.numberOfAnalysts != null) result.numberOfAnalysts = yahooData.numberOfAnalysts;
    if (yahooData.quote) result.quote = yahooData.quote;
    if (yahooData.historicalPrices) result.historicalPrices = yahooData.historicalPrices;

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch market details", details: String(error) },
      { status: 500 }
    );
  }
}
