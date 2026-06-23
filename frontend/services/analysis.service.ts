import type { Portfolio } from "@/app/lib/api";
import { marketService } from "@/services/market.service";
import type { MarketIntelligence, PositionSummary } from "@/types/analysis";
import { calculateRiskScore, isFiniteNumber } from "@/utils/risk";

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function periodReturn(prices: number[], days: number) {
  if (prices.length < 2) return null;
  const current = prices.at(-1)!;
  const previous = prices[Math.max(0, prices.length - 1 - days)];
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export async function loadMarketIntelligence(symbols: string[]): Promise<MarketIntelligence[]> {
  return Promise.all(symbols.slice(0, 3).map(async symbol => {
    const [history, news, profile] = await Promise.all([
      marketService.getHistory(symbol),
      marketService.getNews(symbol),
      marketService.getProfile(symbol),
    ]);
    const points = history?.points ?? [];
    const fundamentals = history?.fundamentals ?? [];
    const prices = points.map(point => point.adjustedClose ?? point.close).filter(isFiniteNumber);
    const volumes = points.map(point => point.volume).filter(isFiniteNumber);
    const currentPrice = prices.at(-1) ?? null;
    const ma50 = average(prices.slice(-50));
    const ma200 = average(prices.slice(-200));
    const volume20 = average(volumes.slice(-20));
    const previousVolume20 = average(volumes.slice(-40, -20));
    const high52w = prices.length ? Math.max(...prices) : null;
    const low52w = prices.length ? Math.min(...prices) : null;
    return {
      symbol,
      technicals: {
        currentPrice,
        return1M: periodReturn(prices, 21),
        return3M: periodReturn(prices, 63),
        return1Y: periodReturn(prices, 252),
        ma50,
        ma200,
        trend: currentPrice != null && ma50 != null && ma200 != null
          ? currentPrice > ma50 && ma50 > ma200 ? "bullish" : currentPrice < ma50 && ma50 < ma200 ? "bearish" : "mixed"
          : "insufficient-data",
        high52w,
        low52w,
        distanceFrom52wHighPercent: currentPrice != null && high52w ? ((currentPrice - high52w) / high52w) * 100 : null,
        volume20DayAverage: volume20,
        volumeChangeVsPrevious20DaysPercent: volume20 != null && previousVolume20 ? ((volume20 - previousVolume20) / previousVolume20) * 100 : null,
      },
      fundamentals: fundamentals.at(-1) ?? null,
      marketCap: isFiniteNumber(profile?.marketCap) ? profile.marketCap * 1_000_000 : null,
      currency: profile?.currency ?? history?.currency ?? null,
      recentNews: (news ?? []).slice(0, 2).map(item => ({ ...item, summary: item.summary?.slice(0, 160) })),
      dataCoverage: { historyPoints: points.length, newsCount: Math.min(news?.length ?? 0, 2), fundamentalsYears: fundamentals.length },
    };
  }));
}

function enrichPositions(positions: PositionSummary[]) {
  const totalValue = positions.reduce((sum, position) => sum + position.value, 0);
  return positions.map(position => ({
    symbol: position.symbol,
    name: position.name,
    quantity: position.quantity,
    averagePrice: position.avgPrice,
    currentPrice: position.currentPrice,
    marketValue: position.value,
    weightPercent: totalValue > 0 ? (position.value / totalValue) * 100 : 0,
    unrealizedPnl: position.pnl,
    returnPercent: position.pnlPct,
  })).sort((a, b) => b.marketValue - a.marketValue);
}

const round = (value: number | null | undefined, digits = 2) => value == null || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
const compactPosition = (position: ReturnType<typeof enrichPositions>[number]) => ({
  symbol: position.symbol,
  value: round(position.marketValue),
  weightPct: round(position.weightPercent),
  pnl: round(position.unrealizedPnl),
  returnPct: round(position.returnPercent),
});

function compressIntelligence(items: MarketIntelligence[]) {
  return items.slice(0, 3).map(item => ({
    symbol: item.symbol,
    tech: {
      price: round(item.technicals.currentPrice),
      r1m: round(item.technicals.return1M),
      r3m: round(item.technicals.return3M),
      r1y: round(item.technicals.return1Y),
      ma50: round(item.technicals.ma50),
      ma200: round(item.technicals.ma200),
      trend: item.technicals.trend,
      fromHigh52wPct: round(item.technicals.distanceFrom52wHighPercent),
      volumeDeltaPct: round(item.technicals.volumeChangeVsPrevious20DaysPercent),
    },
    financials: item.fundamentals ? {
      period: item.fundamentals.date,
      revenue: item.fundamentals.revenue,
      ebitda: item.fundamentals.ebitda,
      netIncome: item.fundamentals.netIncome,
    } : null,
    marketCap: round(item.marketCap, 0),
    currency: item.currency,
    news: item.recentNews.slice(0, 2).map(news => ({
      summary: `${news.title}. ${news.summary || ""}`.replace(/\s+/g, " ").slice(0, 160),
      source: news.source,
      time: news.publishedAt,
    })),
    coverage: { prices: item.dataCoverage.historyPoints, news: item.dataCoverage.newsCount, financialYears: item.dataCoverage.fundamentalsYears },
  }));
}

export function createPortfolioContext(portfolio: Portfolio | undefined, positions: PositionSummary[], marketIntelligence: MarketIntelligence[]) {
  const priced = positions.filter(position => position.priced);
  const allPositions = enrichPositions(priced);
  const enriched = allPositions.slice(0, 10);
  const totalValue = priced.reduce((sum, position) => sum + position.value, 0);
  const totalCost = priced.reduce((sum, position) => sum + position.quantity * position.avgPrice, 0);
  const totalPnl = priced.reduce((sum, position) => sum + position.pnl, 0);
  const largestPosition = enriched[0] ?? null;
  return {
    asOf: new Date().toISOString(),
    portfolio: {
      name: portfolio?.name,
      currency: portfolio?.baseCurrency,
      positionCount: enriched.length,
      totalValue,
      totalCost,
      unrealizedPnl: totalPnl,
      returnPct: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
      riskScore: calculateRiskScore(priced),
      concentrationHhi: allPositions.reduce((sum, position) => sum + Math.pow(position.weightPercent / 100, 2), 0) * 10_000,
      leaders: {
        largest: largestPosition?.symbol ?? null,
        best: allPositions.length ? [...allPositions].sort((a, b) => b.returnPercent - a.returnPercent)[0].symbol : null,
        worst: allPositions.length ? [...allPositions].sort((a, b) => a.returnPercent - b.returnPercent)[0].symbol : null,
      },
      stress: { marketDown10: -totalValue * 0.1, largestDown20: largestPosition ? -largestPosition.marketValue * 0.2 : 0 },
    },
    positions: enriched.map(compactPosition),
    market: compressIntelligence(marketIntelligence),
    gaps: ["No sector/beta/correlation/dividend/tax/cash data.", "Prices may use different exchanges/currencies."],
  };
}

export function createStockContext(portfolio: Portfolio | undefined, positions: PositionSummary[], symbol: string, marketIntelligence: MarketIntelligence[]) {
  const position = positions.find(item => item.symbol === symbol);
  if (!position) throw new Error("Hãy chọn một mã cổ phiếu để phân tích.");
  if (!position.priced) throw new Error(`Chưa có giá thị trường cho ${symbol}. Hãy Refresh giá trước.`);
  const portfolioValue = positions.filter(item => item.priced).reduce((sum, item) => sum + item.value, 0);
  const weight = portfolioValue > 0 ? (position.value / portfolioValue) * 100 : 0;
  return {
    analysisType: "stock",
    asOf: new Date().toISOString(),
    portfolio: { name: portfolio?.name, currency: portfolio?.baseCurrency, totalValue: round(portfolioValue) },
    stock: { symbol, quantity: position.quantity, avgPrice: round(position.avgPrice), price: round(position.currentPrice), value: round(position.value), weightPct: round(weight), pnl: round(position.pnl), returnPct: round(position.pnlPct) },
    market: compressIntelligence(marketIntelligence),
    gaps: ["No consensus/valuation/beta/options volatility/sector benchmark.", "News covers latest 12 hours and may be incomplete."],
  };
}
