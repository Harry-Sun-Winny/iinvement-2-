import type { Portfolio } from "@/app/lib/api";

export interface StockData { symbol: string; price: number; change: number; changePercent: number; }
export interface PositionSummary {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPct: number;
  priced: boolean;
}
export interface HistoryPoint { date: string; close: number | null; adjustedClose: number | null; volume: number | null; }
export interface FundamentalPoint { date: string; revenue: number | null; ebitda: number | null; netIncome: number | null; }
export interface NewsContext { title: string; source: string; publishedAt: string; summary?: string; }
export interface TechnicalSignals {
  currentPrice: number | null;
  return1M: number | null;
  return3M: number | null;
  return1Y: number | null;
  ma50: number | null;
  ma200: number | null;
  trend: "bullish" | "bearish" | "mixed" | "insufficient-data";
  high52w: number | null;
  low52w: number | null;
  distanceFrom52wHighPercent: number | null;
  volume20DayAverage: number | null;
  volumeChangeVsPrevious20DaysPercent: number | null;
}
export interface MarketIntelligence {
  symbol: string;
  technicals: TechnicalSignals;
  fundamentals: FundamentalPoint | null;
  marketCap: number | null;
  currency: string | null;
  recentNews: NewsContext[];
  dataCoverage: { historyPoints: number; newsCount: number; fundamentalsYears: number };
}
export type SortKey = "symbol" | "value" | "pnl" | "pnlPct" | "weight";
export type SortDir = "asc" | "desc";
export type AnalysisMode = "portfolio" | "stock";

export interface AnalysisDerived {
  pricedPositions: PositionSummary[];
  sortedPositions: PositionSummary[];
  totalValue: number | null;
  totalPnl: number | null;
  totalCost: number;
  totalPnlPct: number | null;
  riskScore: number | null;
  risk: { label: string; color: string; bg: string };
  winner: PositionSummary | null;
  loser: PositionSummary | null;
  missingPriceCount: number;
}

export interface PortfolioMetrics extends AnalysisDerived {
  positions: PositionSummary[];
}

export interface AnalysisViewModel {
  portfolios: Portfolio[];
  selectedId: string;
  positions: PositionSummary[];
  prices: Record<string, StockData>;
  aiAnalysis: string;
  analysisLoading: boolean;
  analysisStatus: string;
  priceLoading: boolean;
  error: string;
  sortKey: SortKey;
  sortDir: SortDir;
  analysisMode: AnalysisMode;
  selectedSymbol: string;
  stockQuestion: string;
}
